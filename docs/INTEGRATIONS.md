# Nova — Guía de Integraciones (Git, Jira, PagerDuty, Cloud, SaaS, HRIS)

Esta guía describe **cómo conectar Nova a sistemas externos** para que los datos
crudos (commits, PRs, deploys, issues, incidentes, facturación) entren
automáticamente y Nova derive el análisis encima, en vez de cargarse a mano.

> Estado: documento de diseño + cookbook. Los **modelos de dominio ya existen**
> (`MetricSnapshot`, `Incident`, `Project`, `CloudCost`, `ToolCost`, `TeamCost`…);
> integrar = agregar un **conector** + **upsert con procedencia**, no rehacer el dominio.

---

## 1. Principios

1. **La fuente es dueña del dato, no la UI.** Lo sincronizado se marca y no se
   pisa con ediciones manuales (ver §4, procedencia).
2. **Un adapter por proveedor**, aislado, con una interfaz común.
3. **Idempotencia siempre**: upsert por `(source.system, externalId)`.
4. **Incremental por defecto**: cada sync arranca desde un cursor (`updatedSince`).
5. **Tres vías de ingreso** combinadas: webhooks (tiempo real), cron (pull) y
   backfill (histórico inicial).
6. **Secrets cifrados**, webhooks firmados, rate-limit + retries con backoff.

---

## 2. Estructura de carpetas

```
server/src/
├── integrations/
│   ├── connector.ts              # interfaz Connector + tipos compartidos
│   ├── registry.ts               # mapa provider -> connector
│   ├── integration.model.ts      # conexión por org (credenciales cifradas, estado)
│   ├── integration.service.ts    # connect/disconnect, test, estado
│   ├── integration.routes.ts     # /integrations (config) + /webhooks/:provider
│   ├── sync/
│   │   ├── scheduler.ts          # cron / cola de jobs
│   │   ├── runner.ts             # ejecuta un sync, registra SyncRun
│   │   └── syncRun.model.ts      # auditoría de cada corrida
│   ├── crypto.ts                 # cifrado de credenciales (AES-256-GCM)
│   ├── github/
│   │   ├── github.client.ts      # cliente API + paginación + rate-limit
│   │   ├── github.connector.ts   # fetch + map + upsert
│   │   └── github.webhook.ts     # verifica firma, normaliza evento
│   ├── jira/ …
│   ├── pagerduty/ …
│   ├── aws/ …
│   └── shared/provenance.ts      # helpers de upsert con procedencia
```

Mismo molde feature-based que `modules/`. El `integration.routes.ts` se monta en
`src/routes.ts` junto al resto (`/api/v1/integrations`, `/api/v1/webhooks/...`).

---

## 3. La interfaz `Connector`

```ts
// integrations/connector.ts
export interface SyncContext {
  integrationId: string;
  orgId: string;
  credentials: Record<string, string>; // ya descifradas
  cursor?: string;                      // último updatedSince / page token
  signal: AbortSignal;
}

export interface Connector<TRaw = unknown, TNova = unknown> {
  provider: 'github' | 'jira' | 'pagerduty' | 'aws' | 'slack' | 'gitlab';
  /** Trae lo cambiado desde ctx.cursor. Devuelve también el próximo cursor. */
  fetch(ctx: SyncContext): AsyncIterable<TRaw>;
  /** Normaliza el shape externo al DTO de Nova. */
  map(raw: TRaw, ctx: SyncContext): TNova;
  /** Persiste (upsert idempotente con procedencia). */
  upsert(doc: TNova): Promise<void>;
  /** Opcional: maneja un evento de webhook ya verificado. */
  handleWebhook?(event: unknown, ctx: SyncContext): Promise<void>;
}
```

El `runner` orquesta: `fetch → map → upsert`, contando éxitos/errores y guardando
un `SyncRun` (duración, counts, último error, nuevo cursor).

---

## 4. Procedencia (provenance) — el corazón de todo

Agregá este sub-schema a cada modelo que pueda recibir datos externos
(`Incident`, `Project`, `MetricSnapshot`, `CloudCost`, `ToolCost`, `User`…):

```ts
// integrations/shared/provenance.ts
import { Schema } from 'mongoose';

export const sourceSchema = new Schema(
  {
    system: { type: String, enum: ['manual', 'github', 'gitlab', 'jira', 'linear', 'pagerduty', 'aws', 'gcp', 'slack', 'hris'], default: 'manual', index: true },
    externalId: { type: String, index: true },   // id en el origen
    externalUrl: { type: String },                // link clickeable
    lastSyncedAt: { type: Date },
    managedFields: { type: [String], default: [] }, // campos "dueños" de la fuente
  },
  { _id: false },
);
```

**Upsert idempotente que respeta lo manual:**

```ts
// integrations/shared/provenance.ts
export async function upsertFromSource<T>(model, {
  system, externalId, externalUrl, managedFields, data,
}) {
  // solo escribimos los campos que la fuente "posee"
  const $set: Record<string, unknown> = {
    'source.system': system,
    'source.externalId': externalId,
    'source.externalUrl': externalUrl,
    'source.lastSyncedAt': new Date(),
    'source.managedFields': managedFields,
  };
  for (const f of managedFields) $set[f] = (data as any)[f];

  await model.updateOne(
    { 'source.system': system, 'source.externalId': externalId },
    { $set, $setOnInsert: { createdFromSync: true } },
    { upsert: true },
  );
}
```

Reglas:
- **Upsert por `(source.system, externalId)`** → re-correr el sync nunca duplica.
- Solo se tocan `managedFields`; lo que el usuario editó a mano queda intacto.
- En la UI: badge *"sincronizado desde Jira · hace 5 min"* + link, y los inputs de
  `managedFields` van **disabled**.

---

## 5. Cómo entran los datos

### a) Webhooks (tiempo real, recomendado donde exista)

Endpoint genérico que valida firma y encola:

```
POST /api/v1/webhooks/:provider     # github | jira | pagerduty | ...
```

```ts
// integrations/integration.routes.ts (extracto)
router.post('/webhooks/:provider',
  express.raw({ type: '*/*' }),   // raw body para verificar HMAC
  verifyWebhookSignature,         // por provider
  asyncHandler(async (req, res) => {
    await enqueueWebhook(req.params.provider, req.body);
    res.sendStatus(202);          // responder rápido; procesar async
  }),
);
```

Firma:
- **GitHub**: header `X-Hub-Signature-256`, HMAC-SHA256 del raw body con el secret.
- **Jira**: webhook con secret/JWT (Connect) o IP allowlist + token.
- **PagerDuty**: `X-PagerDuty-Signature` (v3), HMAC-SHA256.

### b) Cron / pull incremental

Para fuentes sin webhook útil o agregados (billing, seats):

```ts
// integrations/sync/scheduler.ts
import cron from 'node-cron';
cron.schedule('*/15 * * * *', () => runner.run('jira'));   // cada 15 min
cron.schedule('0 6 * * *',   () => runner.run('aws'));     // billing diario
```

Para escala: **BullMQ + Redis** (cola con retries/backoff/concurrency) en vez de
`node-cron` directo. Cada job guarda el `cursor` para el próximo arranque.

### c) Backfill (histórico inicial)

Al conectar una integración, encolás un job que importa los últimos 90 días para
llenar las tendencias del dashboard. Mismo `fetch/map/upsert`, con cursor inicial
= `now - 90d` y paginación completa.

---

## 6. Configuración de la conexión + secrets

```ts
// integrations/integration.model.ts (esquema resumido)
{
  org: ObjectId,
  provider: 'github' | 'jira' | ...,
  status: 'connected' | 'error' | 'disconnected',
  // credenciales CIFRADAS (AES-256-GCM con INTEGRATIONS_ENC_KEY)
  credentialsEnc: String,
  scopes: [String],
  config: Mixed,            // org/repo, project keys, etc.
  cursor: String,           // estado del sync incremental
  lastSyncAt: Date,
  lastError: String,
}
```

- **OAuth** para Jira/GitHub (flujo `connect → callback → guardar token`), o PAT/API
  token para empezar.
- Cifrado en `integrations/crypto.ts` (nunca guardar tokens en claro).
- Pantalla **Settings → Integraciones**: conectar/desconectar, ver estado y último
  error, disparar "Sync ahora".

Variables de entorno (agregar a `server/.env.example`):

```bash
INTEGRATIONS_ENC_KEY=         # 32 bytes hex para cifrar credenciales
GITHUB_APP_ID=
GITHUB_WEBHOOK_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
JIRA_WEBHOOK_SECRET=
PAGERDUTY_WEBHOOK_SECRET=
AWS_CUR_BUCKET=               # Cost & Usage Report, o usar Cost Explorer API
REDIS_URL=redis://localhost:6379   # si usás BullMQ
```

---

## 7. Mapa fuente → módulo de Nova

| Fuente | Eventos / API | Aterriza en | Métrica derivada |
|---|---|---|---|
| **GitHub / GitLab** | PRs, commits, `deployment`, Actions runs | `MetricSnapshot`, `ArchitectureComponent` (ownership por CODEOWNERS) | DORA: lead time, deploy frequency, change failure rate, MTTR |
| **Jira / Linear** | issues, epics, sprints, story points, transitions | `Project` + `milestones`, `CostOfDelay` | velocity, slip de roadmap, WIP |
| **PagerDuty / Opsgenie** | incidents, log entries, on-call | `Incident` (+timeline), señal `team.signals.onCallLoad` | MTTR real, `IncidentCost` (engineers×horas×rate) |
| **AWS / GCP** | Cost Explorer / CUR / Billing export | `CloudCost` | gasto por proveedor, alertas de crecimiento MoM |
| **Slack / GitHub seats / Datadog** | admin API (members/usage) | `ToolCost` (`activeLicenses`/`usedLicenses`) | utilización, licencias sin uso |
| **HRIS (BambooHR / Deel)** | empleados, ausencias, compensación | `User`, `Team.pto`, `TeamCost.payrollCost` | capacidad real, costo por equipo |

> El pipeline de `MetricSnapshot` ya agrega → dashboard. Un conector de GitHub que
> llene snapshots **enchufa directo en los gráficos actuales** sin tocar el front.

### Aviso en la UI (`IntegrationNotice`)

Toda pantalla que muestre datos provenientes de una integración renderiza
`<IntegrationNotice sources={[...]} />` (`web/src/components/shared/IntegrationNotice.tsx`)
**inmediatamente debajo del `PageHeader`** (luego del título y la descripción). El
cartel informa que la pantalla incluye datos automáticos, lista la(s) fuente(s) y
linkea a `/integrations`. Textos en el namespace `integrations` (`notice`,
`manageLink`, `sources.*`) de `es.ts`/`en.ts`.

Pantallas con el cartel hoy:

| Pantalla | Fuentes |
|---|---|
| Panel Ejecutivo (Dashboard) | GitHub, Jira, PagerDuty |
| Proyectos | Jira |
| Incidentes | PagerDuty |
| Pronóstico de Entrega | Jira, GitHub |
| Costos de Nube · Panel de Finanzas | Cloud |
| Costo de Incidentes | PagerDuty |
| Asesor de Costos IA · Reportes Ejecutivos | Cloud, PagerDuty |

Al crear una pantalla nueva que lea un modelo con sub-doc `source`, agregar el
cartel con las fuentes correctas.

---

## 8. Ejemplo concreto: DORA desde GitHub

**Lead time / deploy frequency / CFR** se calculan de eventos de PR + deployments:

```ts
// integrations/github/github.connector.ts (esbozo)
export const githubConnector: Connector = {
  provider: 'github',

  async *fetch(ctx) {
    // PRs cerrados desde el cursor (paginado)
    yield* githubClient.listMergedPRs(ctx, { since: ctx.cursor });
    // deployments + statuses
    yield* githubClient.listDeployments(ctx, { since: ctx.cursor });
  },

  map(raw, ctx) {
    if (raw.type === 'pull_request') {
      return {
        kind: 'pr',
        team: resolveTeam(raw.repo, ctx),                 // repo -> team
        leadTimeHours: hoursBetween(raw.firstCommitAt, raw.mergedAt),
        mergedAt: raw.mergedAt,
      };
    }
    return { kind: 'deployment', team: resolveTeam(raw.repo, ctx), at: raw.createdAt, success: raw.state === 'success' };
  },

  async upsert(doc) {
    // acumula por día en MetricSnapshot (team + fecha)
    await rollupIntoMetricSnapshot(doc); // $inc deploymentCount, promedio leadTime, etc.
  },

  async handleWebhook(event, ctx) {
    // pull_request.closed(merged) o deployment_status → mismo map/upsert en vivo
    if (isMergedPR(event) || isDeployment(event)) await this.upsert(this.map(toRaw(event), ctx));
  },
};
```

Webhooks de GitHub recomendados: `pull_request`, `push`, `deployment`,
`deployment_status`, `workflow_run`.

---

## 9. Cómo agregar un conector nuevo (cookbook)

1. `integrations/<provider>/<provider>.client.ts` — cliente HTTP con paginación,
   rate-limit y retries.
2. `<provider>.connector.ts` — implementá `fetch` / `map` / `upsert`
   (+`handleWebhook` si aplica). Usá `upsertFromSource` con los `managedFields`.
3. Registralo en `integrations/registry.ts`.
4. Agregá el `verifyWebhookSignature` del provider si tiene webhooks.
5. Sumá su schedule en `sync/scheduler.ts` (o encolá en BullMQ).
6. Variables de entorno en `.env.example`.
7. Sub-doc `source` en los modelos destino (si no lo tienen) + badge en la UI.
8. Tests: un fixture de payload real → `map()` → assert del DTO; e integración del
   `upsert` idempotente (correr dos veces = 1 registro).

---

## 10. Producción — checklist

- [ ] Firma verificada en **todos** los webhooks (HMAC/JWT).
- [ ] Credenciales **cifradas** (AES-256-GCM); rotación soportada.
- [ ] **Idempotencia** por `(source.system, externalId)`.
- [ ] **Incremental** con cursor persistido; backfill separado.
- [ ] **Rate-limit + retries** con backoff exponencial y `AbortSignal`.
- [ ] **`SyncRun`** por corrida (counts, duración, error) → observabilidad.
- [ ] El sync **nunca borra** ni pisa campos manuales (solo `managedFields`).
- [ ] Webhooks responden `202` rápido y procesan async (cola).
- [ ] Estado de cada integración visible en *Settings → Integraciones*.

---

## 11. Roadmap sugerido de implementación

1. **Infra base**: `integration.model`, `crypto`, `source` sub-doc, `upsertFromSource`,
   `SyncRun`, runner + scheduler, rutas `/integrations` y `/webhooks/:provider`.
2. **Primer conector vertical**: GitHub → `MetricSnapshot` (DORA) con webhook +
   backfill (alimenta el dashboard existente).
3. **Jira → Project/roadmap** y **PagerDuty → Incident**.
4. **Billing (AWS/GCP) → CloudCost** y **seats (Slack/GitHub) → ToolCost**.
5. **HRIS → User/Team/TeamCost** (capacidad y costo real).
6. UI de Integraciones + badges de procedencia en cada módulo.
```
