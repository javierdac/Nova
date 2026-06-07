# Nova API Reference

Base URL: `http://localhost:4000/api/v1`

## Conventions

- **Auth**: send `Authorization: Bearer <accessToken>` on protected routes.
- **Success**: `{ "success": true, "data": ... }`. Lists add `meta` pagination.
- **Error**: `{ "success": false, "error": { "code", "message", "details?" } }`.
- **List query params** (where supported):
  - `page` (default 1), `limit` (default 20, max 100)
  - `sort` — comma list, `-` prefix = desc, e.g. `sort=-createdAt,name`
  - `search` — full-text-ish match across the resource's searchable fields
  - resource-specific filters (e.g. `status`, `severity`, `provider`, `year`, `month`)

## Roles & hierarchy

`admin (100) > cto (90) > head_of_engineering (80) > engineering_manager (60) > engineer (30) > viewer (10)`

`authorizeAtLeast(role)` permits any role whose rank ≥ the named role.

---

## Auth — `/auth`

| Method | Path | Auth | Body |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | `{ name, email, password, role?, title? }` |
| POST | `/auth/login` | public | `{ email, password }` |
| POST | `/auth/refresh` | public | `{ refreshToken }` |
| POST | `/auth/logout` | any | — |
| GET | `/auth/me` | any | — |
| POST | `/auth/change-password` | any | `{ currentPassword, newPassword }` |

`login`/`register` return `{ user, accessToken, refreshToken }`.

## Users — `/users`

| Method | Path | Min role |
| --- | --- | --- |
| GET | `/users` (filters: `role`, `team`, `isActive`, `seniority`) | any |
| GET | `/users/:id` | any |
| POST | `/users` | engineering_manager |
| PATCH | `/users/:id` | engineering_manager |
| POST | `/users/:id/deactivate` | head_of_engineering |
| DELETE | `/users/:id` | admin |

## Teams — `/teams`

| Method | Path | Min role |
| --- | --- | --- |
| GET | `/teams` · `/teams/:id` · `/teams/:id/capacity` | any |
| POST | `/teams` | engineering_manager |
| PATCH | `/teams/:id` | engineering_manager |
| PUT | `/teams/:id/members` `{ members: [id] }` | engineering_manager |
| POST | `/teams/:id/pto` `{ user, startDate, endDate, type }` | engineering_manager |
| DELETE | `/teams/:id/pto/:ptoId` | engineering_manager |
| DELETE | `/teams/:id` | head_of_engineering |

Team responses include a derived `healthScore` + `healthBand` and `capacity`.

## Projects — `/projects`

CRUD. Filters: `status`, `priority`, `team`, `owner`, `roadmapHealth`. Write ≥ EM.

## Incidents — `/incidents`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/incidents` (filters: `severity`, `status`, `team`, `service`, `project`) | |
| GET | `/incidents/:id` | populated commander/team |
| POST | `/incidents` | creates initial timeline entry |
| PATCH | `/incidents/:id` | `status=resolved` stamps `resolvedAt` + computes `mttrMinutes` |
| POST | `/incidents/:id/timeline` `{ message, type }` | append timeline entry |
| PUT | `/incidents/:id/postmortem` `{ summary, rootCause, ..., publish? }` | RCA/postmortem |

## Technical Debt — `/tech-debt`

CRUD + `GET /tech-debt/matrix?team=` (prioritization quadrants). `priorityScore` and
`quadrant` are derived from impact/risk/effort on save.

## Architecture — `/architecture`

CRUD + `GET /architecture/graph` (nodes + dependency edges). Filters: `type`,
`lifecycle`, `tier`, `ownerTeam`.

## One-on-Ones — `/one-on-ones`

CRUD (write ≥ EM). Visibility scoped: managers see their own; leadership sees all.
`privateNotes` only returned to the owning manager / leadership.

## Dashboard — `/dashboard`

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/dashboard/summary?team=` | executive summary cards |
| GET | `/dashboard/trends?team=&days=90` | lead time / deploys / incidents / capacity |

## AI Insights — `/ai`

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

---

## Finance & Cost Intelligence — `/finance`

> **RBAC:** the entire `/finance` surface requires **≥ engineering_manager**.
> All **write** operations require **≥ head_of_engineering**. Engineers/viewers get `403`.

### Analytics dashboards (read)

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/finance/dashboard/executive` | category totals, monthly trend, by team, by product |
| GET | `/finance/dashboard/cloud` | by provider, trend, growth alerts |
| GET | `/finance/dashboard/tools` | utilization, wasted spend, underused tools |
| GET | `/finance/dashboard/teams` | by team, cost/engineer, trend |
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

Each supports `GET` (list, paginated/filtered/sorted/searchable), `GET /:id`,
`POST`, `PATCH /:id`, `DELETE /:id`. Read ≥ EM, write ≥ Head of Engineering.

| Resource | Path | Key fields |
| --- | --- | --- |
| Engineering cost | `/finance/engineering-costs` | `month, year, payrollCost, infrastructureCost, saasToolsCost, contractorsCost` |
| Cloud cost | `/finance/cloud-costs` | `provider, service, month, year, amount, currency, notes` |
| Tool cost | `/finance/tool-costs` | `toolName, category, monthlyCost, activeLicenses, usedLicenses, renewalDate, owner` |
| Team cost | `/finance/team-costs` | `team, month, year, payrollCost, infrastructureAllocation, toolingAllocation, contractorCost, headcount` |
| Product cost | `/finance/product-costs` | `product, month, year, payrollAllocation, infrastructureAllocation, toolingAllocation, monthlyRevenue` |
| Tech debt cost | `/finance/tech-debt-costs` | `technicalDebt, hoursLostPerMonth, averageHourlyRate, impactLevel` |
| Incident cost | `/finance/incident-costs` | `incident, engineersInvolved, durationHours, estimatedHourlyRate, customerImpactScore` |
| Cost of delay | `/finance/cost-of-delay` | `featureName, expectedMonthlyRevenue, delayMonths, status` |
| Hiring ROI | `/finance/hiring-roi` | `role, annualCost, estimatedProductivityGain, estimatedRevenueImpact` |

### Derived fields (computed server-side)

```
ToolCost.utilization        = usedLicenses / activeLicenses * 100
ToolCost.wastedMonthlySpend = (active - used) * (monthlyCost / active)
TeamCost.totalCost          = payroll + infraAlloc + toolingAlloc + contractor
TeamCost.costPerEngineer    = totalCost / headcount
ProductCost.profitabilityIndex = monthlyRevenue / totalCost
TechnicalDebtCost.estimatedMonthlyCost = hoursLostPerMonth * averageHourlyRate
IncidentCost.estimatedCost  = engineersInvolved * durationHours * estimatedHourlyRate
CostOfDelay.estimatedCostOfDelay = expectedMonthlyRevenue * delayMonths
HiringROI.estimatedROI      = (estimatedRevenueImpact - annualCost) / annualCost * 100
EngineeringCost.totalCost   = payroll + infrastructure + saasTools + contractors
```

## Example

```bash
# login
curl -s localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nova.dev","password":"Password123!"}'

# executive finance dashboard
curl -s localhost:4000/api/v1/finance/dashboard/executive \
  -H "Authorization: Bearer $TOKEN"
```
