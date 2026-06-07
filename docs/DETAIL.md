# Nova — Detailed Reference

> Companion documents: [`README.md`](../README.md) (overview & setup),
> [`ARCHITECTURE.md`](ARCHITECTURE.md) (how the system is built). This document
> is the **exhaustive reference**: every backend module, model field, enum,
> derived formula, endpoint, frontend page, and data-entry path. Keep it in sync
> with the code — see [Maintenance & changelog](#maintenance--changelog).

## Contents

- [Global conventions](#global-conventions)
- [Roles & RBAC](#roles--rbac)
- Backend modules
  - [auth](#auth) · [users](#users) · [teams](#teams) · [projects](#projects)
  - [incidents](#incidents) · [techDebt](#techdebt) · [architecture](#architecture)
  - [oneOnOnes](#oneonones) · [metrics](#metrics) · [dashboard](#dashboard) · [ai](#ai)
  - [okrs](#okrs) · [org](#org) · [investment](#investment)
  - [brief](#brief) · [scorecard](#scorecard) · [engagement](#engagement)
  - [finance](#finance) · [integrations](#integrations)
- [Finance ledgers & formulas](#finance-ledgers--formulas)
- [Frontend reference](#frontend-reference)
- [Data provenance matrix](#data-provenance-matrix)
- [Internationalization](#internationalization)
- [Seed data](#seed-data)
- [Testing](#testing)
- [Maintenance & changelog](#maintenance--changelog)

---

## Global conventions

**Base URL**: `http://localhost:4000/api/v1` (configurable via `API_PREFIX`).

**Auth**: send `Authorization: Bearer <accessToken>` on protected routes.

**Response envelope**
- Success: `{ "success": true, "data": ... }`. Lists add `"meta"` pagination.
- Error: `{ "success": false, "error": { "code", "message", "details?" } }`.

**List query params** (parsed by `shared/utils/query.ts`, honored by every
`BaseRepository.paginate`):
- `page` (default 1), `limit` (default 20, max 100)
- `sort` — comma list, `-` prefix = descending (e.g. `sort=-createdAt,name`)
- `search` — case-insensitive regex across the resource's searchable fields
- resource-specific `allowedFilters` (e.g. `status`, `severity`, `provider`, `year`, `month`, `team`)

**Pagination meta**: `{ total, page, limit, totalPages }`.

**Validation**: `zod` schemas in each module's `*.dto.ts`, applied as
`validate({ body, params, query })` middleware. Invalid input → `400` with
`details`.

---

## Roles & RBAC

| Role | Rank |
| --- | --- |
| `admin` | 100 |
| `cto` | 90 |
| `head_of_engineering` | 80 |
| `engineering_manager` | 60 |
| `engineer` | 30 |
| `viewer` | 10 |

Defined in `server/src/shared/types/index.ts` (`ROLES`, `ROLE_RANK`).
`authorizeAtLeast(role)` permits any caller whose rank ≥ the named role.

---

# Backend modules

Each module lives under `server/src/modules/<name>` (except `integrations`, which
is `server/src/integrations`). Fields below are the schema's own fields; all
schemas also carry Mongoose `timestamps` (`createdAt`/`updatedAt`) and an `_id`.

## auth

Mounted at `/auth`. Register/login, JWT issuance, refresh rotation.

| Method | Path | Auth | Body |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | `{ name, email, password, role?, title? }` |
| POST | `/auth/login` | public | `{ email, password }` |
| POST | `/auth/refresh` | public | `{ refreshToken }` |
| POST | `/auth/logout` | any | — (revokes refresh tokens) |
| GET | `/auth/me` | any | — |
| POST | `/auth/change-password` | any | `{ currentPassword, newPassword }` |

`login`/`register` return `{ user, accessToken, refreshToken }`. Access TTL
`15m`, refresh TTL `7d`; refresh tokens carry a `tokenId` stored on the user,
rotated on use, capped at 5 sessions. A stricter rate limiter guards `/auth`.

## users

Mounted at `/users`. Model `User`.

**Fields**: `name`, `email` (unique), `password` (`select:false`, bcrypt),
`role` (enum `ROLES`, default `engineer`), `title`, `avatarUrl`,
`team` → Team, `manager` → User, `seniority` (`intern|junior|mid|senior|staff|principal`, default `mid`),
`timezone`, `weeklyCapacityHours`, `compensation` (`{ annualSalary, currency, … }`, scoped read),
`isActive`, `lastLoginAt`, `refreshTokens[]` (`{ tokenId, … }`, `select:false`).

| Method | Path | Min role | Notes |
| --- | --- | --- | --- |
| GET | `/users` | any | filters: `role`, `team`, `isActive`, `seniority` |
| GET | `/users/:id` | any | |
| GET | `/users/:id/compensation` | leadership/self | scoped salary read |
| POST | `/users` | engineering_manager | |
| PATCH | `/users/:id` | engineering_manager | |
| PUT | `/users/:id` (compensation set) | head_of_engineering | |
| POST | `/users/:id/deactivate` | head_of_engineering | |
| DELETE | `/users/:id` | admin | |

## teams

Mounted at `/teams`. Model `Team` (embeds `pto`).

**Fields**: `name`, `slug`, `description`, `lead` → User, `mission`,
`signals` (`{ … }` qualitative inputs feeding health), `weeklyCapacityHours`,
`pto[]` (`{ user, startDate, endDate, type, note }`), `tags[]`, `isActive`.

**Derived** (service): `healthScore` + `healthBand`, and `capacity` (committed
vs available accounting for PTO).

| Method | Path | Min role |
| --- | --- | --- |
| GET | `/teams` · `/teams/:id` · `/teams/:id/capacity` | any |
| POST | `/teams` | engineering_manager |
| PATCH | `/teams/:id` | engineering_manager |
| PUT | `/teams/:id/members` `{ members: [id] }` | engineering_manager |
| POST | `/teams/:id/pto` `{ user, startDate, endDate, type }` | engineering_manager |
| DELETE | `/teams/:id/pto/:ptoId` | engineering_manager |
| DELETE | `/teams/:id` | head_of_engineering |

## projects

Mounted at `/projects`. Model `Project` (embeds `milestones`).

**Fields**: `name`, `key`, `description`, `status` (`discovery|planned|active|on_hold|completed|cancelled`),
`priority` (`low|medium|high|critical`), `investmentCategory` (`new_value|ktlo`),
`team` → Team, `owner` → User, `startDate`, `targetDate`, `progress`,
`roadmapHealth` (`on_track|at_risk|off_track`), `riskNotes`,
`milestones[]` (`{ title, status: planned|in_progress|done|blocked, dueDate }`),
`tags[]`, `source`.

CRUD. Filters: `status`, `priority`, `team`, `owner`, `roadmapHealth`. Write ≥ EM.

## incidents

Mounted at `/incidents`. Model `Incident` (embeds `timeline`, `postmortem`).

**Fields**: `title`, `description`, `severity` (`SEV1..SEV4`),
`status` (`open|investigating|identified|monitoring|mitigated|resolved`),
`service`, `team` → Team, `project` → Project, `commander` → User,
`detectedAt`, `resolvedAt`, `mttrMinutes` (derived on resolve), `affectedUsers`,
`tags[]`, `timeline[]` (`{ at, type, message, author }`),
`postmortem` (`{ summary, rootCause, impact, resolution, lessonsLearned, publishedAt }`),
`source`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/incidents` | filters: `severity`, `status`, `team`, `service`, `project` |
| GET | `/incidents/:id` | populated commander/team |
| POST | `/incidents` | seeds an initial timeline entry |
| PATCH | `/incidents/:id` | `status=resolved` stamps `resolvedAt` + computes `mttrMinutes` |
| POST | `/incidents/:id/timeline` `{ message, type }` | append timeline entry |
| PUT | `/incidents/:id/postmortem` `{ summary, rootCause, …, publish? }` | RCA/postmortem |
| DELETE | `/incidents/:id` | |

## techDebt

Mounted at `/tech-debt`. Model `TechnicalDebt`.

**Fields**: `title`, `description`, `category`, `status`, `team` → Team,
`component`, `owner` → User, `impactScore`, `riskScore`, `effortScore`,
`priorityScore` (derived), `quadrant` (derived), `tags[]`.

**Derived** (hook): `priorityScore` and `quadrant` from impact/risk/effort.

CRUD + `GET /tech-debt/matrix?team=` (prioritization quadrants).

## architecture

Mounted at `/architecture`. Model `ArchitectureComponent`.

**Fields**: `name`, `type` (service/API/DB/…), `description`,
`lifecycle`, `tier`, `repoUrl`, `docsUrl`, `runbookUrl`, `language`,
`ownerTeam` → Team, `ownerUser` → User, `apiSpec`, `dbSpec`,
`dependencies[]` (→ other components), `tags[]`.

CRUD + `GET /architecture/graph` (nodes + dependency edges). Filters: `type`,
`lifecycle`, `tier`, `ownerTeam`.

## oneOnOnes

Mounted at `/one-on-ones`. Model `OneOnOne`.

**Fields**: `manager` → User, `report` → User, `date`, `notes`,
`privateNotes` (scoped), `mood`, `feedback`, `careerGrowth`
(`{ currentLevel, targetLevel, plan }`),
`goals[]` (`{ title, description, category, status, dueDate }`), `nextMeetingDate`.

CRUD (write ≥ EM). **Visibility scoped**: managers see their own; leadership sees
all; `privateNotes` only returned to the owning manager / leadership.

## metrics

Model `MetricSnapshot` — **no HTTP routes of its own**; written by the GitHub
integration (and seed), read by `dashboard`, `okrs/forecast`, and `ai`.

**Fields**: `team` → Team, `date`, `leadTimeHours`, `deploymentCount`,
`deploymentFrequency`, `changeFailureRate`, `incidentCount`, `mttrMinutes`,
`availableCapacityHours`, `committedCapacityHours`, `source`.

This is the **integration-fed** data class — see [integrations](#integrations).

## dashboard

Mounted at `/dashboard`. Pure aggregation, no own model.

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/dashboard/summary?team=` | executive summary cards |
| GET | `/dashboard/trends?team=&days=90` | lead time / deploys / incidents / capacity series |

## ai

Mounted at `/ai`. OpenAI insights with heuristic fallback.

| Method | Path | Min role |
| --- | --- | --- |
| GET | `/ai/status` | any |
| GET | `/ai/weekly-summary` | engineering_manager |
| GET | `/ai/team-risk/:teamId` | engineering_manager |
| GET | `/ai/burnout` | engineering_manager |
| GET | `/ai/tech-debt` | engineering_manager |
| GET | `/ai/roadmap-risk` | head_of_engineering |
| GET | `/ai/health-report` | engineering_manager |

Each returns `{ content, model, source: "openai" | "fallback", ...context }`.

## okrs

Mounted at `/okrs`. Model `Objective` (embeds `keyResults`).

**Objective fields**: `title`, `description`, `owner` → User, `team` → Team,
`quarter` (e.g. `2026-Q2`), `level` (`company|team`),
`status` (derived: `on_track|at_risk|off_track|achieved`), `keyResults[]`, `tags[]`.

**KeyResult fields**: `title`, `metricType` (`percent|number|currency|boolean`),
`startValue`, `targetValue`, `currentValue`, `confidence` (0–100).

**Derived** (`okr.service`, pure & unit-tested):
- `computeKeyResultProgress(kr)` → 0–100 % (boolean → 0/100; else clamped `(current−start)/(target−start)`).
- `rollupObjective(krs)` → `{ progress (avg of KR progress), confidence (avg), status }`.
- **Status is confidence-driven**: `progress≥100 → achieved`; else `confidence<45 → off_track`; `<70 → at_risk`; else `on_track`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/okrs` | list (filters: `team`, `quarter`, `level`, `status`, `owner`); each decorated with progress/confidence/status |
| GET | `/okrs/:id` | populated owner/team/linkedProjects |
| GET | `/okrs/rollup?quarter=` | overall + company + by-team summaries |
| GET | `/okrs/forecast` · `/okrs/forecast/:projectId` | Monte Carlo delivery forecast (P50/P85, on-time prob.) |
| POST | `/okrs` | create objective |
| PATCH | `/okrs/:id` | update objective |
| DELETE | `/okrs/:id` | |
| POST | `/okrs/:id/key-results` | add KR |
| PATCH | `/okrs/:id/key-results/:krId` | update KR |

## org

Mounted at `/org`. Models `Position` (embeds `pipeline` candidates) and `Skill`.

**Position fields**: `title`, `team` → Team, `seniority`,
`status` (`planned|open|interviewing|offer|filled|frozen`), `budgetedMonthlyCost`,
`openedAt`, `targetStartDate`, `filledAt`, `filledBy` → User,
`pipeline[]` (candidates: `{ name, stage: applied|screen|onsite|offer|hired|rejected, appliedAt, note }`),
`notes`.

**Skill fields**: `user` → User, `skill`, `category`
(`language|framework|platform|domain|soft|tooling`), `level` (1–5), `interest` (1–5).
Unique index on `(user, skill)`.

| Method | Path | Min role |
| --- | --- | --- |
| GET | `/org/headcount` | any (plan vs actual by team) |
| GET | `/org/chart` | any (org tree, span of control) |
| GET | `/org/attrition-risk` | any (per-person flight risk) |
| GET | `/org/positions` · `/org/positions/funnel` | any |
| POST | `/org/positions` | engineering_manager |
| PATCH | `/org/positions/:id` | engineering_manager |
| DELETE | `/org/positions/:id` | head_of_engineering |
| POST | `/org/positions/:id/candidates` | engineering_manager (append to pipeline) |
| GET | `/org/skills` · `/org/skills/matrix` | any |
| POST | `/org/skills` | engineering_manager |
| PATCH | `/org/skills/:id` | engineering_manager |
| DELETE | `/org/skills/:id` | engineering_manager |

`skills/matrix` aggregates per-skill `people`, `experts`, `avgLevel`, and
bus-factor risk (≤1 expert at level ≥ 4).

**Attrition-risk formula** (`computeAttritionRisk`, pure & unit-tested). The
per-person score is `0–100`, summed from these conditions, then banded
(`high ≥ 50 · medium ≥ 25 · low < 25`):

| Condition | Points | Factor surfaced |
| --- | --- | --- |
| team `attrition` ≥ 20 | +35 | High team attrition signal |
| team `attrition` 12–19 | +18 | — |
| team `morale` < 55 | +25 | Low team morale |
| team `morale` 55–69 | +10 | — |
| team `onCallLoad` ≥ 60 | +15 | Heavy on-call load |
| tenure 12–24 months | +15 | In 12-24mo flight-risk window |
| tenure > 48 months | +8 | Long tenure plateau |
| seniority senior/staff/principal | +7 | — |

Team signals (`attrition`, `morale`, `onCallLoad`) live on `Team.signals` and
default to `10 / 70 / 30` when absent; tenure is derived from `User.createdAt`.
The Retention page renders this same table in a collapsible "How is this
calculated?" card (`org.method.*` i18n keys) — keep it in sync with this list.

## investment

Mounted at `/investment`. Capacity allocation analytics, no own model — derives
from active projects' `investmentCategory`, tech-debt cost and incident cost.

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/investment/allocation` | spend across `new_value | ktlo | tech_debt | incidents` |
| GET | `/investment/trend` | allocation over time |

## brief

Mounted at `/brief`. Derived "what needs your attention this week" digest, no
own model — aggregates across incidents, OKRs, delivery, finance and people
signals.

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/brief/weekly` | prioritized weekly brief items |

## scorecard

Mounted at `/scorecard`. Derived composite engineering-health grade with a
target and trend, no own model — rolls up delivery/reliability/people signals.

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/scorecard` | composite score, target, trend, contributing dimensions |

## engagement

Mounted at `/engagement`. Team engagement / eNPS via anonymous pulse surveys.
Model `EngagementResponse`.

**Fields**: `team` → Team, `period`, `recommendScore` (eNPS 0–10),
`dimensions` (`{ … }` per-dimension scores), `comment`.

| Method | Path | Returns / Body |
| --- | --- | --- |
| GET | `/engagement/summary` | eNPS, dimension averages, trend (derived) |
| POST | `/engagement/responses` | submit an (anonymous) pulse response — **source data entry** |

## finance

Mounted at `/finance` (auth + `authorizeAtLeast('engineering_manager')` on the
whole router). **Reads ≥ engineering_manager; writes ≥ head_of_engineering.**

### Analytics dashboards (read)

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/finance/dashboard/executive` | category totals, monthly trend, by team, by product |
| GET | `/finance/dashboard/cloud` | by provider, trend, >20% MoM growth alerts |
| GET | `/finance/dashboard/tools` | utilization, wasted spend, underused tools |
| GET | `/finance/dashboard/teams` | by team, cost/engineer, payroll from real salaries, trend |
| GET | `/finance/dashboard/products` | cost, revenue, margin, profitability index |
| GET | `/finance/dashboard/tech-debt` | top-20 most expensive, by team, totals |
| GET | `/finance/dashboard/incidents` | by severity, by team, trend |
| GET | `/finance/dashboard/cost-of-delay` | top delayed initiatives, revenue at risk |
| GET | `/finance/dashboard/hiring-roi` | cost vs not-hiring comparison |

### AI Cost Advisor (read, ≥ EM)

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/finance/advisor/recommendations` | savings, risks, executive recommendations |
| GET | `/finance/advisor/weekly-report` | weekly executive cost report |

### CRUD ledgers

Each registered via `mountCrud()`: `GET` (list, paginated/filtered/sorted/
searchable), `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id`. Write ≥ Head of
Engineering. Fields and formulas in [the next section](#finance-ledgers--formulas).

`/finance/engineering-costs` · `/cloud-costs` · `/tool-costs` · `/team-costs` ·
`/product-costs` · `/tech-debt-costs` · `/incident-costs` · `/cost-of-delay` ·
`/hiring-roi`.

## integrations

Mounted at `/integrations` (auth required). Models `Integration` and `SyncRun`.

**Integration fields**: `provider` (`github|jira|pagerduty|cloud`, unique),
`status` (`connected|disconnected|error`), `mode` (`dummy|live`),
`config` (Mixed — org/repos, host/projectKeys; tokens encrypted in `live`),
`cursor`, `lastSyncAt`, `lastError`.

**SyncRun fields**: `provider`, `status`, `mode`, `created`, `updated`,
`durationMs`, `error`.

| Method | Path | Min role | Notes |
| --- | --- | --- | --- |
| GET | `/integrations` | engineering_manager | list provider states |
| GET | `/integrations/:provider/runs` | engineering_manager | recent sync runs |
| PATCH | `/integrations/:provider` | head_of_engineering | update config/mode |
| POST | `/integrations/:provider/sync` | head_of_engineering | run a sync |

**Provider → connector → model** mapping (current):
- `github` → `MetricSnapshot` (DORA: deploys, lead time, change failure rate).
- `jira`, `pagerduty`, `cloud` → wired connectors (issues/incidents/cloud cost),
  in `dummy` mode by default.

Connectors persist via `upsertBySource()` (idempotent on a `source` key). In
`dummy` mode providers return deterministic sample data (no network); `live`
mode would call the real API using stored `config`. See
[`INTEGRATIONS.md`](INTEGRATIONS.md).

---

# Finance ledgers & formulas

All amounts default to USD (`currency` field). FK references are **not**
populated on the generic list endpoints (the UI resolves names from its own
lists).

| Resource | Path | Editable fields | Derived (server-side) |
| --- | --- | --- | --- |
| Engineering cost | `/finance/engineering-costs` | `month, year, payrollCost, infrastructureCost, saasToolsCost, contractorsCost, currency` | `totalCost = payroll + infrastructure + saasTools + contractors` |
| Cloud cost | `/finance/cloud-costs` | `provider, service, month, year, amount, currency, team?, product?, notes?` | — (`source` set by integrations) |
| Tool cost | `/finance/tool-costs` | `toolName, category, monthlyCost, activeLicenses, usedLicenses, renewalDate?, owner?, notes?` | `utilization = used/active×100`, `wastedMonthlySpend = (active−used)×(monthlyCost/active)` |
| Team cost | `/finance/team-costs` | `team, month, year, payrollCost?, infrastructureAllocation?, toolingAllocation?, contractorCost?, headcount?` | `totalCost = sum(allocations)`, `costPerEngineer = totalCost/headcount` |
| Product cost | `/finance/product-costs` | `product, month, year, payrollAllocation?, infrastructureAllocation?, toolingAllocation?, monthlyRevenue?` | `totalCost`, `grossMargin = revenue−totalCost`, `profitabilityIndex = revenue/totalCost` |
| Tech-debt cost | `/finance/tech-debt-costs` | `technicalDebt, team?, product?, hoursLostPerMonth, averageHourlyRate, impactLevel?` | `estimatedMonthlyCost = hoursLostPerMonth × averageHourlyRate` |
| Incident cost | `/finance/incident-costs` | `incident, team?, severity?, engineersInvolved, durationHours, estimatedHourlyRate, customerImpactScore?` | `estimatedCost = engineersInvolved × durationHours × estimatedHourlyRate` |
| Cost of delay | `/finance/cost-of-delay` | `featureName, product?, team?, expectedMonthlyRevenue, delayMonths, status?, notes?` | `estimatedCostOfDelay = expectedMonthlyRevenue × delayMonths` |
| Hiring ROI | `/finance/hiring-roi` | `role, team?, seniority?, annualCost, estimatedProductivityGain?, estimatedRevenueImpact?, status?, notes?` | `estimatedROI = (estimatedRevenueImpact − annualCost)/annualCost × 100` |

Enum reference:
- ToolCost `category`: `communication|source_control|observability|design|project_mgmt|docs|security|other`
- TechDebtCost `impactLevel`: `low|medium|high|critical`
- IncidentCost `severity`: `SEV1|SEV2|SEV3|SEV4`
- CostOfDelay `status`: `at_risk|delayed|shipped|cancelled`
- HiringROI `seniority`: `junior|mid|senior|staff|principal`; `status`: `proposed|approved|hired|rejected`

The `dashboard/teams` endpoint additionally merges **real payroll** from each
active member's `compensation.annualSalary` (aggregation bypasses the
`select:false` flag server-side), giving `actualHeadcount`, `actualAnnualPayroll`
and `costPerPerson` alongside the ledger figures.

---

# Frontend reference

SPA routes (`web/src/App.tsx`), all behind `ProtectedRoute → AppLayout`, each a
lazy chunk. "Entry" = whether the screen can create/edit its source data.

| Route | Page | Primary data source | Entry UI |
| --- | --- | --- | --- |
| `/dashboard` | Dashboard | `dashboard/summary`+`trends` (derived) | — derived |
| `/brief` | Brief | `brief/weekly` (derived) | — derived |
| `/scorecard` | Scorecard | `scorecard` (derived) | — derived |
| `/teams` | Teams | `/teams` (+capacity, members, PTO) | ✅ teams, members, PTO |
| `/users` | Users | `/users` (+compensation) | ✅ users, compensation |
| `/projects` | Projects | `/projects` | ✅ projects, milestones |
| `/incidents` | Incidents | `/incidents` | ✅ incidents, timeline, postmortem |
| `/tech-debt` | TechDebt | `/tech-debt` (+matrix) | ✅ debt items |
| `/architecture` | Architecture | `/architecture` (+graph) | ✅ components |
| `/one-on-ones` | OneOnOnes | `/one-on-ones` | ✅ 1:1s, goals |
| `/ai-insights` | AIInsights | `/ai/*` (derived) | — derived (route hidden from sidebar) |
| `/integrations` | Integrations | `/integrations` (+runs) | ✅ config, sync |
| `/settings` | Settings | `/auth/me` | ✅ account |
| `/org` | PeopleDashboard | `/org/headcount`,`chart` (derived) | — derived |
| `/org/headcount` | Headcount | `/org/headcount`,`positions`,`funnel` | ✅ positions, **candidates** |
| `/org/skills` | SkillsMatrix | `/org/skills/matrix`,`/org/skills` | ✅ **skill assessments** |
| `/org/retention` | Retention | `/org/attrition-risk` (derived) | — derived |
| `/org/engagement` | Engagement | `engagement/summary` | ✅ **pulse responses (eNPS)** |
| `/okrs` | OKRsBoard | `/okrs`,`/okrs/rollup` | ✅ objectives, KRs |
| `/okrs/forecast` | DeliveryForecast | `/okrs/forecast` (derived) | — derived |
| `/investment` | Investment | `/investment/*` (derived) | — derived |
| `/finance` | FinanceDashboard | `dashboard/executive` | ✅ **engineering costs** |
| `/finance/cloud` | CloudCosts | `dashboard/cloud`+`cloud-costs` | ✅ cloud costs |
| `/finance/saas` | SaaSCosts | `dashboard/tools`+`tool-costs` | ✅ tool costs |
| `/finance/teams` | TeamCosts | `dashboard/teams` | ✅ **team costs** |
| `/finance/products` | ProductCosts | `dashboard/products` | ✅ **product costs** |
| `/finance/tech-debt` | TechDebtCosts | `dashboard/tech-debt` | ✅ **tech-debt costs** |
| `/finance/incidents` | IncidentCosts | `dashboard/incidents` | ✅ **incident costs** |
| `/finance/cost-of-delay` | CostOfDelay | `dashboard/cost-of-delay` | ✅ **cost of delay** |
| `/finance/hiring-roi` | HiringROI | `dashboard/hiring-roi` | ✅ **hiring ROI** |
| `/finance/advisor` | CostAdvisor | `advisor/recommendations` (derived) | — derived |
| `/finance/reports` | ExecutiveReports | `advisor/weekly-report` (derived) | — derived |

(Bold "Entry" items were the data-entry gaps closed most recently — see the
[changelog](#maintenance--changelog).)

### Reusable building blocks

- `components/finance/FinanceLedger.tsx` — declarative cost-ledger UI (paginated
  table + create/edit dialog + delete), parameterized by `fields`, `columns`,
  `empty`, `toForm`, `rowLabel`, `invalidateKeys`. Used by all seven finance
  ledger pages so they stay consistent and analytics dashboards refresh on edit.
- `components/shared/*` — `PageHeader`, `StatCard`, `States` (Loading/Error/Empty),
  `Pagination`, `RowActions` + `ConfirmDelete` + `useRowDelete`,
  `IntegrationNotice` (banner telling the user which integration feeds/augments a
  screen, e.g. `cloud` on the finance dashboard, `pagerduty` on incident costs),
  `SourceNotice` (sibling banner for data that is entered on a *different* screen
  rather than ingested — states where it comes from and links to the owning
  screen, e.g. team signals on Retention link to `/teams`).
- `components/ui/*` — Button, Input/Textarea/Label/Select, Dialog, Table, Card,
  Badge (Tailwind + CVA primitives).
- `api/*` hooks — React Query wrappers: `hooks.ts` (users/teams/projects/
  incidents/tech-debt/architecture/1:1s/AI/compensation), `okrs.ts`, `org.ts`,
  `finance.ts`, `integrations.ts`, `investment.ts`.
- `lib/api.ts` — axios instance with Bearer injection, `apiError()`, and
  refresh-and-retry on 401. `lib/permissions.ts` — `useCan(role)`.

---

# Data provenance matrix

The product rule (see [ARCHITECTURE §6](ARCHITECTURE.md#6-data-provenance--the-everything-is-enterable-rule)):
**every displayed value is enterable (form) or ingested (integration); derived
views are exempt because their inputs are enterable.**

| Data | Origin | Where entered |
| --- | --- | --- |
| Users, teams, projects, incidents, tech debt, architecture, 1:1s | manual | their pages |
| OKRs (objectives, KRs) | manual | `/okrs` |
| Positions & hiring candidates | manual | `/org/headcount` |
| Skill assessments (per user, level/interest) | manual | `/org/skills` |
| All 9 finance cost ledgers | manual | their `/finance/*` pages |
| Engagement pulse responses (eNPS) | manual | `/org/engagement` |
| DORA metric snapshots (deploys, lead time, CFR, MTTR) | **integration** | GitHub sync (`/integrations`) |
| Dashboards, roll-ups, forecasts, brief, scorecard, AI insights, advisor | **derived** | n/a (computed) |

---

# Internationalization

- Library: `i18next` + `react-i18next`; init in `web/src/i18n/`.
- Locales: `web/src/i18n/locales/es.ts` and `en.ts`, sharing one key tree.
- Namespaces: `brand`, `nav`, `common`, `theme`, `language`, `auth`, `roles`,
  `pages`, and per-domain (`finance`, `skills`, `org`, `okrs`, `projects`,
  `incidents`, `techDebt`, …).
- Components use `const { t } = useTranslation()` and `t('namespace.key')`,
  with `{{interpolation}}` and `defaultValue` fallbacks where helpful.
- **Rule**: every key must exist in both locales. Seed/demo content is Spanish.

---

# Seed data

Two locale variants of the same dataset coexist; each **wipes and repopulates**
the same collections, so run whichever language you want to demo:

| Script | File | Content |
| --- | --- | --- |
| `npm run seed -w server` | `server/src/seed.ts` | demo data in **Spanish** |
| `npm run seed:en -w server` | `server/src/seed.en.ts` | same shape, content in **English** |

Both seed an org of teams/users, projects, incidents, tech debt, architecture,
OKRs (`2026-Q2`), 1:1s, positions, skills and 90 days of `MetricSnapshot`
history, then call `seedFinance(...)` (in `finance.seed.ts`) for every finance
cost ledger. The two scripts are intentionally structural mirrors — only the
human-readable strings differ (titles, missions, descriptions, project/incident
names, OKRs, 1:1 notes, skill names, finance feature/role labels). Person names,
emails, numbers, dates and signal values are identical, so derived analytics
(attrition risk, finance roll-ups, forecasts) look the same in either locale.
`finance.seed.ts` takes a `locale: 'es' | 'en'` arg (defaults to `'es'`) to swap
its few labels (cloud service name, cost-of-delay features, hiring-ROI roles).

Demo login (both): `admin@nova.dev` / `Password123!` (CTO).

Because of the "everything is enterable" rule, the seed is a convenience for
demos/tests — every seeded entity also has a UI + endpoint to create it.

---

# Testing

```bash
npm run test -w server     # jest --runInBand
```

- Hermetic integration tests use `mongodb-memory-server`.
- Coverage: auth flow & refresh rotation, incident lifecycle/MTTR, team health
  score, tech-debt score, OKR roll-up, org skills aggregation.

```
server/src/tests/auth.integration.spec.ts
server/src/tests/incidents.integration.spec.ts
server/src/modules/teams/team.service.spec.ts
server/src/modules/techDebt/techDebt.model.spec.ts
server/src/modules/okrs/okr.service.spec.ts
server/src/modules/org/org.service.spec.ts
```

Frontend validation: `npm run typecheck -w web` and `npm run build -w web`.

---

# Maintenance & changelog

**Update this document in the same change that alters the code.** Specifically:
add/modify a model field → update its module section *and* (if exposed) the
[finance table](#finance-ledgers--formulas) / [frontend table](#frontend-reference);
add/modify an endpoint → update the module table *and* [`API.md`](API.md);
add a page → update the [frontend reference](#frontend-reference) and
[data provenance matrix](#data-provenance-matrix).

### Changelog

- **2026-06-07** — Added an English seed variant (`server/src/seed.en.ts`, run
  with `npm run seed:en`) that coexists with the Spanish `seed.ts` — a
  structural mirror with English content. Parameterized `finance.seed.ts` with a
  `locale` arg so its few labels follow suit. Documented both under
  [Seed data](#seed-data); added the script to `README.md`.
- **2026-06-07** — Added **`docs/USER_MANUAL.md`**: an end-user, screen-by-screen
  guide (English, no screenshots) covering every screen — purpose, location, what
  you see, what you can do, RBAC and data source — grouped by the sidebar. Linked
  from `README.md` and added to the docs-maintenance table. Also relabeled the
  Skills Matrix entry point from "Add assessment / Skill assessments" to
  "Add skill / Skills by person" for discoverability (i18n `skills.addAssessment`
  / `skills.assessments`, es + en).
- **2026-06-07** — Added the `SourceNotice` banner for cross-screen data: any
  screen that displays values entered on a *different* screen shows an info
  message naming the source and linking to the owning screen(s) (sibling of
  `IntegrationNotice`, which covers ingested data). The component takes a
  `message` + a `links[]` array. Applied to the derived screens: Retention
  (→ Teams), People & Org (→ Users, Teams), Delivery Forecast (→ Projects),
  Engineering Investment (→ Projects, Tech Debt, Incidents) and the Finance
  Dashboard (→ Team/Product/SaaS Costs). Messages live under the `sourceNotice.*`
  i18n namespace (es + en); link labels reuse `nav.*`.
- **2026-06-07** — Documented newly added modules/screens: `brief` (`/brief`),
  `scorecard` (`/scorecard`) and `engagement` (`/org/engagement`, with pulse-survey
  entry). Added a frontend navigation sitemap diagram to `ARCHITECTURE.md` (§11)
  and the `IntegrationNotice` per-screen banner. AI Insights route hidden from
  the sidebar (still routable).
- **2026-06-07** — Retention page now explains itself: added a collapsible
  "How is this calculated?" card surfacing the attrition-risk inputs, the full
  scoring-rule table and the band thresholds, mirroring `computeAttritionRisk`.
  New `org.method.*` i18n keys in es + en; documented the formula here.
- **2026-06-07** — Closed the manual-entry gaps so all source data is enterable:
  added the reusable `FinanceLedger` and create/edit/delete UIs for the 7
  finance ledgers that previously had backend CRUD but no form (engineering,
  team, product, tech-debt, incident costs, cost of delay, hiring ROI); added
  skill-assessment management on the Skills Matrix; added hiring-candidate entry
  on Headcount. New i18n keys added in es + en. Authored README / ARCHITECTURE /
  DETAIL as the living documentation set.
