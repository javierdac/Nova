# Nova — Architecture

> Companion documents: [`README.md`](../README.md) (overview & setup),
> [`DETAIL.md`](DETAIL.md) (exhaustive module reference). Keep all three in sync
> when the system changes.

This document describes **how Nova is built**: its layers, the path a request
travels, the domain model, cross-cutting concerns, the frontend architecture,
and the key design decisions behind them.

## Contents

1. [System overview](#1-system-overview)
2. [Request lifecycle](#2-request-lifecycle)
3. [Clean Architecture layers (backend)](#3-clean-architecture-layers-backend)
4. [Module anatomy](#4-module-anatomy)
5. [Domain model](#5-domain-model)
6. [Data provenance & the "everything is enterable" rule](#6-data-provenance--the-everything-is-enterable-rule)
7. [Authentication & RBAC](#7-authentication--rbac)
8. [Integrations architecture](#8-integrations-architecture)
9. [AI integration (graceful degradation)](#9-ai-integration-graceful-degradation)
10. [Frontend architecture](#10-frontend-architecture)
11. [Frontend navigation map (sitemap)](#11-frontend-navigation-map-sitemap)
12. [Internationalization](#12-internationalization)
13. [Deployment](#13-deployment)
14. [Key design decisions](#14-key-design-decisions)

---

## 1. System overview

```mermaid
flowchart LR
  subgraph Client["Web — React + Vite + TS"]
    UI[Pages / Components]
    RQ[React Query cache]
    ZU[Zustand auth store]
    I18[i18next es/en]
  end

  subgraph API["API — Express + TS (Clean Architecture)"]
    MW[Middleware: helmet · cors · rate-limit · authenticate · authorize · validate]
    RT[Routes]
    CT[Controllers]
    SV[Services]
    RP[Repositories]
    MD[(Mongoose Models)]
  end

  subgraph INT["Integrations layer"]
    PRV[Providers: github/jira/pagerduty/cloud]
    CON[Connectors → upsertBySource]
  end

  DB[(MongoDB)]
  OA[OpenAI API]
  EXT[(External systems:<br/>GitHub/Jira/PagerDuty/Cloud billing)]

  UI --> RQ -->|"REST /api/v1 (Bearer JWT)"| MW --> RT --> CT --> SV --> RP --> MD --> DB
  ZU -. "access token + refresh" .-> RQ
  SV -. "optional, with fallback" .-> OA
  SV --> PRV --> CON --> MD
  PRV -. "live mode" .-> EXT
```

Nova is a **two-tier SPA + REST API** backed by MongoDB. The API is stateless
(JWT in the request, sessions persisted in Mongo), so it scales horizontally.
Optional outbound calls (OpenAI, external integrations) always degrade
gracefully.

## 2. Request lifecycle

```mermaid
sequenceDiagram
  participant C as Client (axios + React Query)
  participant MW as Middleware chain
  participant Ct as Controller
  participant Sv as Service
  participant Rp as Repository
  participant Db as MongoDB

  C->>MW: HTTP request (+ Bearer access token)
  MW->>MW: rate-limit → authenticate → authorizeAtLeast → validate (Zod)
  MW->>Ct: req.user + validated body/params/query
  Ct->>Sv: typed DTO
  Sv->>Rp: domain operation
  Rp->>Db: Mongoose query / aggregation (lean)
  Db-->>Rp: documents
  Rp-->>Sv: plain objects
  Sv-->>Ct: result (+ derived fields)
  Ct-->>C: { success: true, data, meta? }
  Note over MW,C: Any thrown AppError → centralized errorHandler → { success:false, error:{code,message,details?} }
```

On `401` due to an expired access token, the axios client transparently calls
`POST /auth/refresh`, rotates the token pair, and retries the original request
once (see [Frontend architecture](#10-frontend-architecture)).

## 3. Clean Architecture layers (backend)

```
Routes        → wiring + per-route RBAC + Zod validation middleware
Controllers   → HTTP adapter (req/res), no business logic
Services      → business logic, derived metrics, orchestration, AI, integrations
Repositories  → data access (BaseRepository<T>: paginate / search / filter / sort / CRUD)
Models + DTOs → Mongoose schemas (persistence + derivation hooks) + Zod request DTOs
```

Dependencies point **inward**: `routes → controllers → services → repositories →
models`. Controllers never touch Mongoose; services never touch `req`/`res`.
Cross-cutting concerns (errors, auth, validation, logging, pagination parsing)
live in `shared/`.

```mermaid
flowchart TB
  R[routes.ts] --> Rt[module.routes.ts]
  Rt --> Ct[module.controller.ts]
  Ct --> Sv[module.service.ts]
  Sv --> Rp[module.repository.ts / BaseRepository]
  Rp --> Md[(module.model.ts)]
  Sv -. dto .- Dt[module.dto.ts]
  subgraph shared
    Err[errors/AppError]
    Mw[middleware: authenticate/authorize/validate]
    Base[repository/BaseRepository]
    Http[http/respond]
    Ty[types: Role/ROLE_RANK]
  end
  Mw -.-> Rt
  Base -.-> Rp
  Http -.-> Ct
```

`BaseRepository<T>` provides uniform `paginate()` (with `page/limit/sort/search/
filters`), `findById`, `create`, `updateById`, `deleteById`, `count`, and
`aggregate()` across **18+ resources**, so list semantics are identical
everywhere.

## 4. Module anatomy

A feature module is a self-contained folder under `server/src/modules/<name>`:

```
<name>/
├── <name>.model.ts        # Mongoose schema(s) + indexes + derivation hooks
├── <name>.dto.ts          # Zod schemas for create/update/query + inferred types
├── <name>.repository.ts   # (optional) extends BaseRepository<T>; defines searchable fields
├── <name>.service.ts      # business logic, derived metrics, aggregations
├── <name>.controller.ts   # thin HTTP adapter using shared respond helpers
├── <name>.routes.ts       # router with authenticate + authorizeAtLeast + validate
└── <name>.service.spec.ts # (where applicable) unit tests for pure logic
```

`finance` additionally nests `models/` (nine cost schemas) and uses a generic
`mountCrud()` helper plus a `FinanceRepository<T>` to register all nine ledgers
with identical CRUD semantics. `integrations` follows the same shape but adds a
`providers/` (data source) and per-provider `connector/` (normalize + persist)
split — see [§8](#8-integrations-architecture).

## 5. Domain model

```mermaid
erDiagram
  USER }o--o| TEAM : "member of"
  TEAM ||--o{ USER : "members"
  TEAM ||--o{ PTO : "embeds"
  USER }o--o| USER : "manager"
  PROJECT }o--o| TEAM : "owned by"
  PROJECT ||--o{ MILESTONE : "embeds"
  INCIDENT }o--o| TEAM : "affects"
  INCIDENT ||--o{ TIMELINE : "embeds"
  INCIDENT ||--o| POSTMORTEM : "has"
  TECHDEBT }o--o| TEAM : "owned by"
  ARCHCOMPONENT }o--o{ ARCHCOMPONENT : "depends on"
  ARCHCOMPONENT }o--o| TEAM : "owned by"
  ONEONONE }o--|| USER : "manager"
  ONEONONE }o--|| USER : "report"
  METRICSNAPSHOT }o--o| TEAM : "per day"
  OBJECTIVE ||--o{ KEYRESULT : "embeds"
  OBJECTIVE }o--o| TEAM : "team-level"
  POSITION ||--o{ CANDIDATE : "pipeline"
  SKILL }o--|| USER : "assessment of"
```

### Finance sub-domain

```mermaid
erDiagram
  ENGINEERINGCOST }|..|{ MONTH : "monthly ledger"
  CLOUDCOST }o--o| TEAM : "allocated"
  CLOUDCOST }o--o| PROJECT : "allocated"
  TOOLCOST }o--o| USER : "owner"
  TEAMCOST }o--|| TEAM : "per month"
  PRODUCTCOST }o--|| PROJECT : "per month"
  TECHNICALDEBTCOST }o--|| TECHDEBT : "prices"
  INCIDENTCOST }o--|| INCIDENT : "prices"
  COSTOFDELAY }o--o| PROJECT : "feature"
  HIRINGROI }o--o| TEAM : "proposed role"
```

Field-level definitions, enums and derived formulas for every entity are in
[`DETAIL.md`](DETAIL.md).

### Consolidated entity map

A single-glance view of every persisted entity and how it links to the people/
team backbone (consolidates the two diagrams above and adds the engagement
domain). Embedded sub-documents are shown as owned children.

```mermaid
erDiagram
  TEAM ||--o{ USER : "members"
  USER ||--o| USER : "manager"
  TEAM ||--o{ PTO : "embeds"
  USER ||--o{ SKILL : "assessed in"
  USER ||--o{ COMPENSATION : "has"
  TEAM ||--o{ PROJECT : "owns"
  PROJECT ||--o{ MILESTONE : "embeds"
  TEAM ||--o{ INCIDENT : "affects"
  INCIDENT ||--o{ TIMELINE : "embeds"
  INCIDENT ||--o| POSTMORTEM : "has"
  TEAM ||--o{ TECHDEBT : "owns"
  TEAM ||--o{ ARCHCOMPONENT : "owns"
  ARCHCOMPONENT ||--o{ ARCHCOMPONENT : "depends on"
  USER ||--o{ ONEONONE : "manager/report"
  TEAM ||--o{ METRICSNAPSHOT : "daily DORA"
  TEAM ||--o{ OBJECTIVE : "team OKRs"
  OBJECTIVE ||--o{ KEYRESULT : "embeds"
  TEAM ||--o{ POSITION : "headcount"
  POSITION ||--o{ CANDIDATE : "pipeline"
  TEAM ||--o{ ENGAGEMENTRESPONSE : "eNPS pulse"
  TEAM ||--o{ TEAMCOST : "monthly cost"
  PROJECT ||--o{ PRODUCTCOST : "monthly cost"
  TEAM ||--o{ CLOUDCOST : "allocated"
  USER ||--o{ TOOLCOST : "owns"
  TECHDEBT ||--o{ TECHNICALDEBTCOST : "priced by"
  INCIDENT ||--o{ INCIDENTCOST : "priced by"
  PROJECT ||--o{ COSTOFDELAY : "feature delay"
  TEAM ||--o{ HIRINGROI : "proposed role"
  ENGINEERINGCOST }o--o{ MONTH : "monthly ledger"
```

### Finance cost data flow

How finance numbers travel from **enterable source ledgers** (plus the cloud
integration) through aggregation services to the read-only dashboards and pages —
and how an edit instantly refreshes the derived views via React Query
invalidation.

```mermaid
flowchart LR
  subgraph Source["Source ledgers (CRUD UI — enterable)"]
    EC[EngineeringCost]
    TC[TeamCost]
    PC[ProductCost]
    DC[TechnicalDebtCost]
    IC[IncidentCost]
    COD[CostOfDelay]
    HR[HiringROI]
    CC[CloudCost]
    TL[ToolCost]
  end
  CloudInt["Cloud billing integration (optional)"] -.-> CC
  SAL["User.compensation (real salaries)"] -.-> AGG

  Source --> AGG["financeAnalytics service<br/>(Mongoose aggregation + derived hooks)"]
  AGG --> DASH["/finance/dashboard/* endpoints"]
  DASH --> PAGES["Finance pages (charts + StatCards)"]

  PAGES -- "create/edit/delete (FinanceLedger)" --> Source
  Source -. "mutation invalidates fin-* + analytics keys" .-> AGG
  AGG --> ADV["AI Cost Advisor / Weekly report (heuristic|OpenAI)"]
```

## 6. Data provenance & the "everything is enterable" rule

A defining product constraint: **every value Nova renders must originate inside
the product** — entered via a form, or ingested via an integration. Nothing is
seed-only. Three data classes:

```mermaid
flowchart LR
  subgraph Sources
    F[Manual entry — CRUD forms] --> DB[(MongoDB)]
    I[Integrations — providers→connectors] --> DB
  end
  DB --> A[Aggregation services / Mongoose hooks]
  A --> D[Derived views: dashboards, roll-ups, AI insights]
  F -.->|"source data"| DB
  I -.->|"source data (DORA snapshots)"| DB
  D -.->|"computed, no form"| UI[Web UI]
  DB --> UI
```

| Class | Examples | Has a form? |
| --- | --- | --- |
| **Source — manual** | users, teams, projects, incidents, tech debt, architecture, OKRs, 1:1s, positions, candidates, skill catalog, skill assessments, all 9 finance cost ledgers | ✅ yes |
| **Source — integration** | DORA metric snapshots (GitHub) | via integration sync |
| **Derived** | Executive dashboard, OKR roll-up, delivery forecast, people/retention dashboards, finance analytics, AI insights | ❌ computed |

When adding a screen, classify its data first: if it shows **source** data,
it must have a create/edit path; if it shows **derived** data, ensure the inputs
it derives from are themselves enterable. The reusable
`web/src/components/finance/FinanceLedger.tsx` exists to make adding a source
ledger UI a few lines of config.

## 7. Authentication & RBAC

```mermaid
flowchart TD
  L[POST /auth/login] --> V{valid credentials?}
  V -- no --> E[401]
  V -- yes --> T["issue access (15m) + refresh (7d, tokenId stored on user)"]
  T --> U[client persists tokens — Zustand persist]
  U --> R[request + Bearer access]
  R --> A{access valid?}
  A -- yes --> Z[authorizeAtLeast: ROLE_RANK ≥ required]
  Z --> OK[handler runs]
  A -- expired --> RF[POST /auth/refresh]
  RF --> RT{tokenId still in user.refreshTokens?}
  RT -- yes --> ROT[rotate: drop old id, issue new pair]
  RT -- no --> E2[401 revoked]
```

- **Role rank**: `admin 100 > cto 90 > head_of_engineering 80 > engineering_manager 60 > engineer 30 > viewer 10` (`shared/types`).
- **`authorizeAtLeast(role)`** admits any caller whose rank ≥ the named role.
- **Refresh rotation**: each refresh token carries a `tokenId` stored on the
  user; refreshing drops the used id and issues a new pair. Capped at **5 active
  sessions**; logout and password change revoke all.
- **Scoped reads**: compensation and 1:1 `privateNotes` are only returned to
  leadership / the owning manager / the subject.

## 8. Integrations architecture

The integrations layer cleanly separates **where data comes from** (provider)
from **how it is normalized and stored** (connector), so a dummy data source can
be swapped for a real API without touching the rest of the system.

```mermaid
flowchart LR
  Cfg["Integration doc (provider, mode: dummy|live, config, cursor, lastSyncAt)"]
  Sync["POST /integrations/:provider/sync (≥ head_of_engineering)"]
  Sync --> Prov[Provider.fetch]
  Prov -- dummy --> Det[Deterministic sample data]
  Prov -- live --> Ext[(External API)]
  Prov --> Conn[Connector: map → domain shape]
  Conn --> Up["upsertBySource() — idempotent by source key"]
  Up --> Models[(MetricSnapshot / Incident / CloudCost / …)]
  Sync --> Run["SyncRun doc (status, created/updated, durationMs, error)"]
```

- **Providers** (`integrations/providers/*.provider.ts`): `github`, `jira`,
  `pagerduty`, `cloud`. Each returns normalized records; in `dummy` mode they
  return deterministic samples (no network), in `live` mode they would call the
  real API with stored config/tokens.
- **Connectors** (`integrations/<provider>/<provider>.connector.ts`): map
  provider output to domain models and persist via `upsertBySource()`, which is
  idempotent on a `source` key so re-syncs don't duplicate.
- **GitHub → `MetricSnapshot`** feeds the DORA trend charts and delivery
  forecast. This is how the Dashboard's operational metrics enter the system
  without a manual form.
- **`SyncRun`** records each sync's outcome for observability.

Full connector/provider guide: [`INTEGRATIONS.md`](INTEGRATIONS.md).

## 9. AI integration (graceful degradation)

```mermaid
flowchart LR
  Req[AI / Cost Advisor endpoint] --> S{OPENAI_API_KEY set?}
  S -- yes --> O[OpenAI chat completion]
  O -- ok --> Out["{ content, source: 'openai' }"]
  O -- error --> F[deterministic heuristic]
  S -- no --> F
  F --> Out2["{ content, source: 'fallback' }"]
```

Every AI service is built around `complete(system, user, fallback)`. The
platform is fully functional without an API key (CI, local, offline) and never
fails a request because of an upstream outage. Responses are tagged with their
`source` so the UI can badge "OpenAI" vs "heuristic mode".

## 10. Frontend architecture

```mermaid
flowchart TB
  Main[main.tsx: QueryClientProvider + i18n + RouterProvider] --> Router[App.tsx createBrowserRouter]
  Router --> PR[ProtectedRoute: checks Zustand auth]
  PR --> AL[AppLayout: Sidebar + Topbar + Outlet]
  AL --> Pages[lazy-loaded page chunks]
  Pages --> Hooks[api/* React Query hooks]
  Hooks --> Axios[lib/api axios client]
  Axios --> API[(REST /api/v1)]
  Store[(Zustand auth store, persisted)] -.-> Axios
  Store -.-> PR
```

- **Routing**: `react-router-dom` with `createBrowserRouter`. Every page is
  `lazy()`-loaded → small initial bundle, one chunk per screen. All app routes
  sit behind `ProtectedRoute` → `AppLayout`.
- **Data fetching**: `@tanstack/react-query`. Query keys are stable per resource
  (`['okrs', params]`, `['fin-team-costs', {page}]`, …). Mutations invalidate the
  relevant list key **and** any derived dashboard key so analytics recompute
  (e.g. a TeamCost edit invalidates `fin-teams` and `fin-exec`).
- **API client**: a single `axios` instance (`lib/api.ts`) injects the Bearer
  token, normalizes errors via `apiError()`, and performs the transparent
  refresh-and-retry on `401`.
- **Auth state**: a persisted `zustand` store holds `user`, `accessToken`,
  `refreshToken`. `lib/permissions.ts` exposes `useCan(role)` for RBAC-aware UI.
- **UI system**: Tailwind + `class-variance-authority` primitives in
  `components/ui/*` (Button, Input, Select, Dialog, Table, Card, Badge…),
  composed by shared pieces in `components/shared/*` (PageHeader, StatCard,
  States, Pagination, RowActions, ConfirmDelete) and charts in
  `components/charts/*` (Recharts wrappers).
- **Forms pattern**: list + dialog with `useState` form, build body (coerce
  numbers, omit empty optional FKs), `mutateAsync`, surface `apiError`. The
  `FinanceLedger` component generalizes this for cost ledgers via a declarative
  field/column config.

## 11. Frontend navigation map (sitemap)

The information architecture as rendered by the sidebar
(`web/src/components/layout/Sidebar.tsx`): a flat top group plus three
collapsible sections (People & Org, Delivery, Finance), with Integrations and
Settings pinned at the bottom. **E** = screen where source data is entered;
**D** = derived/read-only view (computed from enterable inputs); **I** = fed by
an integration. The hidden AI Insights route still exists but is not shown in
the menu.

```mermaid
flowchart LR
  Login([/login]) --> PR{ProtectedRoute}
  PR --> Layout[AppLayout: Sidebar + Topbar + Outlet]

  Layout --> Top[Top group]
  Layout --> OrgG[People & Org]
  Layout --> DelG[Delivery]
  Layout --> FinG[Finance]
  Layout --> Pin[Pinned]

  Top --> dash["Dashboard (D)"]
  Top --> brief["Brief — weekly (D)"]
  Top --> score["Scorecard (D)"]
  Top --> teams["Teams (E)"]
  Top --> users["Users (E)"]
  Top --> proj["Projects (E)"]
  Top --> inc["Incidents (E)"]
  Top --> debt["Tech Debt (E)"]
  Top --> arch["Architecture (E)"]
  Top --> ono["One-on-Ones (E)"]
  Top -.hidden.-> ai["AI Insights (D)"]

  OrgG --> orgov["Org Overview (D)"]
  OrgG --> head["Headcount & Hiring (E: positions, candidates)"]
  OrgG --> skills["Skills Matrix (E: assessments)"]
  OrgG --> skillcat["Skill Catalog (E: skill definitions)"]
  OrgG --> ret["Retention Risk (D)"]
  OrgG --> eng["Engagement / eNPS (E: pulse responses)"]

  DelG --> okrs["OKRs (E)"]
  DelG --> fc["Delivery Forecast (D)"]
  DelG --> invs["Investment (D)"]

  FinG --> findash["Finance Dashboard (E: engineering costs · I: cloud)"]
  FinG --> cloud["Cloud Costs (E)"]
  FinG --> saas["SaaS Costs (E)"]
  FinG --> tcost["Team Costs (E)"]
  FinG --> pcost["Product Costs (E)"]
  FinG --> dcost["Tech Debt Costs (E)"]
  FinG --> icost["Incident Costs (E · I: pagerduty)"]
  FinG --> cod["Cost of Delay (E)"]
  FinG --> roi["Hiring ROI (E)"]
  FinG --> adv["AI Cost Advisor (D)"]
  FinG --> rep["Executive Reports (D)"]

  Pin --> integ["Integrations (E: config/sync)"]
  Pin --> settings["Settings (E: account)"]
```

> Routes are declared in `web/src/App.tsx` (all lazy-loaded, behind
> `ProtectedRoute → AppLayout`). The per-route data source and entry capability
> are tabulated in [`DETAIL.md` → Frontend reference](DETAIL.md#frontend-reference).

## 12. Internationalization

`i18next` + `react-i18next` with two locales in `web/src/i18n/locales/{es,en}.ts`,
sharing an identical key tree (`nav`, `common`, `pages`, plus per-domain
namespaces like `finance`, `skills`, `org`, `okrs`). Components read strings via
`t('namespace.key')`. **Both locales must define every key**; demo/seed content
is authored in Spanish.

## 13. Deployment

```mermaid
flowchart LR
  subgraph Compose["docker compose"]
    M[(mongo:7 + healthcheck)]
    A["api (node:20, multi-stage, non-root)"]
    W["web (vite build → nginx static + SPA fallback)"]
  end
  Dev[Browser] --> W
  W -->|"VITE_API_URL → /api/v1"| A
  A --> M
  A -. optional .-> OpenAI[(OpenAI)]
```

- **API image**: multi-stage (build → slim runtime, runs as non-root `node`).
- **Web image**: Vite build served by nginx with SPA fallback + asset caching.
- **Health probe**: `GET /health` (used by compose healthchecks / orchestrators).
- **Horizontal scaling**: the API is stateless (JWT); sessions live in MongoDB,
  so any instance can serve any request.

## 14. Key design decisions

| Decision | Rationale |
| --- | --- |
| `BaseRepository<T>` generic | Uniform pagination/search/filter/sort/CRUD across 18+ resources |
| Derived fields via Mongoose hooks | Scores/costs computed consistently on create **and** update, never trusting the client |
| Zod DTOs at the edge | One validation source of truth; handlers receive typed, safe input |
| Provider/connector split for integrations | Swap dummy data for a real API without touching domain code; idempotent `upsertBySource` |
| Heuristic AI fallback | Product works without OpenAI; deterministic, testable, outage-proof |
| Feature-folder modules | Each domain is self-contained (model→dto→repo→service→controller→routes) |
| "Everything is enterable" rule | Nova is operable end-to-end, not a read-only viewer of seed data |
| Reusable `FinanceLedger` | New source-data UIs are declarative config, not copy-paste |
| Lazy-loaded routes (web) | Small initial bundle; each page is a separate chunk |
| Mutation → derived-key invalidation | Editing source data instantly refreshes dependent dashboards |
| Bilingual from day one | es/en parity enforced in a shared key tree |
