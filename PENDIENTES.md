# Nova — Pendientes

> Estado al **2026-06-07**. Lista de lo que falta para llevar Nova de demo funcional
> a producción. Prioridad: 🔴 alta · 🟡 media · ⚪ baja. Las rutas apuntan al código real.

---

## Resumen del estado actual

**Funciona hoy (modo demo, datos sembrados + dummy):**
- App full-stack: API (Express + Mongo) y web (React + Vite), bilingüe es/en.
- Módulos: Equipos, Usuarios, Proyectos, Incidentes, Deuda Técnica, Arquitectura,
  1:1, OKRs, Pronóstico de entrega, Finanzas (10 vistas), Personas/Org.
- Vistas de Head of Engineering: **Inversión de capacidad**, **Brief semanal**,
  **Scorecard de salud**, **Engagement (eNPS)** — con eNPS alimentando el riesgo de fuga.
- Integraciones: 4 conectores (GitHub, Jira, PagerDuty, Cloud AWS/GCP) en **modo dummy**.
- 38 tests de backend en verde.

**El gran faltante transversal: todo lo "live" es stub.** Las integraciones traen datos
reales solo cuando se implementen los providers `live` y el ingreso automático (webhooks/cron).

---

## 1. Integraciones — pasar de dummy a real 🔴

Hoy cada conector tiene un provider `dummy` (funciona) y uno `live` que **lanza error**
(`"... live provider not configured yet"`). El sync es **manual** (botón), no automático.

- [ ] 🔴 **Implementar los 4 providers `live`** (hoy son stubs):
  - `server/src/integrations/providers/github.provider.ts` → GitHub REST/GraphQL (deploys, PRs).
  - `server/src/integrations/providers/jira.provider.ts` → Jira REST (JQL search).
  - `server/src/integrations/providers/pagerduty.provider.ts` → PagerDuty REST (`GET /incidents`).
  - `server/src/integrations/providers/cloud.provider.ts` → AWS Cost Explorer / GCP Billing export.
- [ ] 🔴 **Webhooks en tiempo real** (`POST /webhooks/:provider`): documentados en
  `docs/INTEGRATIONS.md` pero **no existen en código** (solo está `POST /:provider/sync` manual).
  Falta verificación de firma (HMAC/JWT) por provider y respuesta `202` + proceso async.
- [ ] 🔴 **Scheduler / cron** para el pull periódico: **no implementado** (no hay `node-cron`
  ni `setInterval`). El `cursor` del `IntegrationModel` existe pero no se usa (sync incremental).
- [ ] 🟡 **Cifrado de credenciales** (AES-256-GCM) para los tokens en `config` del
  `IntegrationModel` (hoy `Schema.Types.Mixed` sin cifrar) + rotación.
- [ ] 🟡 **Rate-limit + retries con backoff** y `AbortSignal` en los providers live.
- [ ] 🟡 **Conector seats SaaS → `ToolCost`** (Slack/GitHub/Datadog) — roadmap paso 4b, sin empezar.
- [ ] ⚪ **Conector HRIS → `User`/`Team`/`TeamCost`** (BambooHR/Deel) — roadmap paso 5, sin empezar.

> Checklist de producción completo en `docs/INTEGRATIONS.md` §10 (todo sin tildar aún).

---

## 2. IA — hoy corre en modo heurístico 🟡

- [ ] 🟡 **Configurar `OPENAI_API_KEY`** (`server/.env` está vacío) → sin key, todo el
  módulo `ai` usa el fallback heurístico. Decidir si se usa IA real en prod.
- [ ] 🟡 **Resumen IA del Brief semanal**: propuesto, no implementado. Narrativa ejecutiva
  para skip-level/board sobre `briefService.weekly()` usando el módulo `ai` (con fallback).
- [ ] ⚪ Revisar prompts/costos de las 5 funciones de `ai.service.ts` antes de prod.

---

## 3. Reportes ejecutivos 🟡

- [ ] 🟡 **Board Pack PDF**: export de una página (Scorecard + Brief + Inversión + eNPS)
  usando `exportToPDF` (`web/src/lib/export.ts`). Propuesto, no implementado.
- [ ] ⚪ Programar/enviar el reporte semanal (hoy `ExecutiveReports` es on-demand).

---

## 4. Tests y calidad 🟡

- [ ] 🟡 **Test de integración del endpoint eNPS** (`POST /engagement/responses` → `GET /summary`).
- [ ] 🟡 **Tests de frontend**: la web no tiene tests (ni unit ni e2e). Al menos smoke de
  las páginas nuevas y de los wrappers de charts.
- [ ] ⚪ Tests de integración para los conectores live cuando se implementen
  (fixture de payload real → `map()` → assert del upsert).

---

## 5. Calibración de heurísticas ⚪

Modelos que hoy usan pesos/umbrales razonables pero sin validar contra datos reales:
- [ ] ⚪ **Inversión**: `PROJECT_BASE_EFFORT`, `PRIORITY_MULTIPLIER`, `STATUS_MULTIPLIER`
  (`server/src/modules/investment/investment.service.ts`).
- [ ] ⚪ **Scorecard**: pesos por dimensión `WEIGHTS` y `TARGET`
  (`server/src/modules/scorecard/scorecard.service.ts`).
- [ ] ⚪ **Riesgo de fuga**: umbrales eNPS y demás factores (`computeAttritionRisk` en
  `server/src/modules/org/org.service.ts`).
- [ ] ⚪ **Scorecard — tendencia**: hoy la tendencia de 6 meses es un proxy de
  entrega+fiabilidad (de `MetricSnapshot` + incidentes), no de las 5 dimensiones. Documentado.

---

## 6. Infra / Deploy / Seguridad 🔴

- [ ] 🔴 **Secrets de producción**: `server/.env` tiene JWT secrets de ejemplo y Mongo local
  sin auth. Generar secrets reales y usar Mongo con credenciales en prod.
- [ ] 🟡 **CORS / dominios** reales en `docker-compose.yml` (hoy `localhost:5173`).
- [ ] 🟡 Pipeline de CI (build + test + lint) — no hay workflow configurado.
- [ ] ⚪ Healthchecks/observabilidad de la API más allá de logs (métricas, alertas).

---

## 7. Verificación pendiente ⚪

- [ ] ⚪ **Confirmar en browser el fix de gráficos vacíos** (alto fijo en
  `ResponsiveContainer`, `Charts.tsx` / `FinanceCharts.tsx`) tras refrescar.
- [ ] ⚪ `IntegrationNotice` en las páginas nuevas (Brief/Scorecard/Engagement) para
  consistencia con el resto (Inversión y Dashboard ya lo tienen).

---

## Sugerencia de orden

1. **Integraciones live + webhooks/cron** (§1) — es lo que convierte la demo en producto.
2. **Secrets/deploy/CI** (§6) — necesario para cualquier ambiente real.
3. **Tests** (§4) — blindar antes de sumar más.
4. **Board Pack PDF** y **Resumen IA del Brief** (§2, §3) — alto valor para el Head, bajo costo.
5. **Calibración** (§5) — recién cuando haya datos reales fluyendo.
