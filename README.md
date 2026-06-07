# Nova — Engineering Intelligence Platform

[![CI](https://github.com/javierdac/Nova/actions/workflows/ci.yml/badge.svg)](https://github.com/javierdac/Nova/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-API-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)

Nova is a production-grade SaaS platform that centralizes engineering
**metrics, team & people management, OKRs, delivery forecasting, technical debt,
incidents, architecture documentation, AI-powered insights, third-party
integrations, and a full Finance & Cost Intelligence suite** into a single
product for **Engineering Managers, Heads of Engineering, CTOs and Founders**.

```
┌────────────────────────────────────────────────────────────────────┐
│  React 18 + Vite + TS   ──REST /api/v1──▶  Express + TS  ──▶  MongoDB │
│  React Query / Zustand                     Clean Architecture        │
│  Tailwind / Recharts / i18n (es+en)        JWT + rotating refresh     │
│                                            RBAC · Zod · pino          │
│                                            OpenAI (optional)          │
└────────────────────────────────────────────────────────────────────┘
```

> **Documentation set.** This repository is documented by three living
> documents that are kept in sync with the code:
> - **[`README.md`](README.md)** (this file) — what Nova is, how to run it, project map.
> - **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — how the system is built (layers, data flow, diagrams, decisions).
> - **[`docs/DETAIL.md`](docs/DETAIL.md)** — exhaustive module-by-module reference (models, endpoints, fields, frontend pages, data provenance).
>
> For end users there is also **[`docs/USER_MANUAL.md`](docs/USER_MANUAL.md)** — a
> screen-by-screen guide to operating the app. Two focused appendices complement
> the set: [`docs/API.md`](docs/API.md) (REST reference) and
> [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) (connector guide).

---

## Table of contents

1. [Product overview](#product-overview)
2. [Core principle: every datum is enterable](#core-principle-every-datum-is-enterable)
3. [Tech stack](#tech-stack)
4. [Monorepo layout](#monorepo-layout)
5. [Feature map](#feature-map)
6. [Quick start](#quick-start)
7. [Environment variables](#environment-variables)
8. [Scripts](#scripts)
9. [Security](#security)
10. [Internationalization](#internationalization)
11. [AI](#ai)
12. [Testing](#testing)
13. [Keeping the docs current](#keeping-the-docs-current)

---

## Product overview

Nova gives engineering leadership a single pane of glass over the health of
their organization. It spans four broad domains:

| Domain | What it answers |
| --- | --- |
| **Delivery & Engineering** | Dashboard (DORA-style trends), OKRs, delivery forecast, projects/roadmap, incidents & MTTR, technical debt, architecture graph. |
| **People & Org** | Users, teams (capacity, PTO, health score), headcount & hiring funnel, skills matrix, attrition risk, 1:1s. |
| **Finance & Cost Intelligence** | Executive cost dashboard, cloud/SaaS spend, per-team & per-product cost, tech-debt cost, incident cost, cost of delay, hiring ROI, AI cost advisor, weekly executive report. |
| **Platform** | AI insights, integrations (GitHub/Jira/PagerDuty/cloud billing), settings, auth & RBAC. |

The web app is a single-page application served behind login; the API is a
stateless REST service. Everything is bilingual (Spanish + English).

## Core principle: every datum is enterable

**Any value Nova displays must be obtainable from within the product** — either
entered manually through a CRUD form, or ingested through an integration.
No screen depends on data that can only be planted by the database seed.

Concretely:
- **Manual entry** — every domain resource (users, teams, projects, incidents,
  tech debt, architecture components, OKRs, 1:1s, positions, skills, candidates,
  and **all finance cost ledgers**) has a create/edit/delete UI backed by a REST
  endpoint.
- **Integrations** — operational metrics (DORA snapshots) flow in from GitHub
  via the integrations layer (currently in deterministic *dummy* mode, ready to
  be switched to *live*).
- **Derived views** — dashboards, roll-ups and AI insights are *computed* from
  the above; they intentionally have no form because they are not source data.

See [`docs/DETAIL.md` → Data provenance matrix](docs/DETAIL.md#data-provenance-matrix)
for the per-screen breakdown.

## Tech stack

**Backend** (`server/`)
- Node ≥ 20, TypeScript (ESM), Express
- MongoDB + Mongoose (lean reads, aggregation pipelines, indexes)
- Auth: `jsonwebtoken` (access + rotating refresh), `bcryptjs`
- Validation: `zod` at every edge (body/params/query)
- Hardening: `helmet`, `cors` allow-list, `express-rate-limit`, `compression`
- Logging: `pino` / `pino-http`
- AI: `openai` (optional, with heuristic fallback)
- Tests: `jest` + `ts-jest` + `supertest` + `mongodb-memory-server`

**Frontend** (`web/`)
- React 18 + Vite + TypeScript
- Data: `@tanstack/react-query` over an `axios` client with token refresh
- State: `zustand` (persisted auth store)
- UI: Tailwind CSS, `class-variance-authority`, `lucide-react` icons, custom shadcn-style primitives
- Charts: `recharts`
- Forms: `react-hook-form` + `zod`
- i18n: `i18next` / `react-i18next` (Spanish + English)

**Infra**
- `docker-compose` (mongo + api + web), multi-stage images, npm workspaces

## Monorepo layout

```
Nova/
├── server/                      # Express + TypeScript API (Clean Architecture)
│   └── src/
│       ├── config/              # env validation (zod), db connection, logger
│       ├── shared/              # errors, middleware, BaseRepository<T>, http helpers, types (Role/rank)
│       ├── modules/             # feature modules (see Feature map)
│       │   ├── auth/ users/ teams/ projects/ incidents/ techDebt/
│       │   ├── architecture/ oneOnOnes/ metrics/ dashboard/ ai/
│       │   ├── okrs/ org/ investment/ finance/
│       ├── integrations/        # provider/connector layer (github/jira/pagerduty/cloud)
│       ├── routes.ts            # mounts every module under /api/v1
│       ├── seed.ts / seed.en.ts # demo data (Spanish / English), finance.seed.ts for cost ledgers
│       └── index.ts             # app bootstrap
├── web/                         # React + Vite + TypeScript SPA
│   └── src/
│       ├── components/          # ui primitives, layout, charts, shared, finance/FinanceLedger
│       ├── pages/               # one file per screen (+ pages/finance/*, pages/org/*, pages/okrs/*)
│       ├── api/                 # React Query hooks (hooks.ts, okrs.ts, org.ts, finance.ts, integrations.ts, investment.ts)
│       ├── store/               # Zustand auth store
│       ├── i18n/                # locales/es.ts + locales/en.ts
│       └── lib/                 # axios api client, permissions, export (CSV/PDF), utils
├── docs/                        # README · ARCHITECTURE · DETAIL (+ API, INTEGRATIONS)
├── docker-compose.yml           # mongo + api + web
└── package.json                # npm workspaces + root scripts
```

## Feature map

### Backend modules (`server/src/modules`)

| Module | Mounted at | Responsibility |
| --- | --- | --- |
| `auth` | `/auth` | Register/login, JWT access + rotating refresh (max 5 sessions), change/revoke |
| `users` | `/users` | User CRUD, roles, seniority, capacity, compensation (scoped) |
| `teams` | `/teams` | Teams, members, PTO, capacity & derived **health score** |
| `projects` | `/projects` | Roadmap projects, milestones, roadmap health, investment category |
| `incidents` | `/incidents` | Incident CRUD, severity, timeline, RCA/postmortem, **MTTR** |
| `techDebt` | `/tech-debt` | Debt registry with impact/risk/effort scoring + prioritization matrix |
| `architecture` | `/architecture` | Service/API/DB registry, dependencies, ownership, dependency graph |
| `oneOnOnes` | `/one-on-ones` | 1:1 notes, goals, feedback, career growth (scoped visibility) |
| `metrics` | — (read by others) | Daily DORA-style metric snapshots (fed by GitHub integration / seed) |
| `dashboard` | `/dashboard` | Executive summary + trend aggregations |
| `ai` | `/ai` | OpenAI-powered insights with deterministic heuristic fallback |
| `okrs` | `/okrs` | Objectives & key results, roll-up, delivery forecast |
| `org` | `/org` | Headcount, hiring funnel/positions/candidates, skills matrix, attrition risk, org chart |
| `investment` | `/investment` | New-value vs KTLO vs tech-debt vs incident allocation & trend |
| `finance` | `/finance` | **Finance & Cost Intelligence** (9 cost ledgers + 9 analytics dashboards + AI advisor) |
| `integrations` | `/integrations` | Provider config, sync runs, dummy/live mode |

### Finance & Cost Intelligence (`server/src/modules/finance`)

| Feature | Model | Key derived metric |
| --- | --- | --- |
| Executive Cost Dashboard | `EngineeringCost` | `totalCost = payroll + infra + saas + contractors` |
| Cloud Cost Management | `CloudCost` | by-provider, trend, >20% MoM growth alerts |
| SaaS Cost Management | `ToolCost` | `utilization`, `wastedMonthlySpend`, underused detection |
| Team Cost Analysis | `TeamCost` | `totalCost`, `costPerEngineer`, payroll from real salaries |
| Product Cost Allocation | `ProductCost` | `grossMargin`, `profitabilityIndex` |
| Technical Debt Cost | `TechnicalDebtCost` | `estimatedMonthlyCost = hoursLost × hourlyRate` (top 20) |
| Incident Cost | `IncidentCost` | `estimatedCost = engineers × hours × hourlyRate` |
| Cost of Delay | `CostOfDelay` | `estimatedCostOfDelay = expectedMonthlyRevenue × delayMonths` |
| Hiring ROI | `HiringROI` | `estimatedROI = (revenueImpact − cost) / cost × 100` |
| AI Cost Advisor | — | savings / risk / recommendations |
| Weekly Executive Report | — | AI cost report (export to PDF) |

Each ledger has a full CRUD UI in the web app; dashboards recompute from the
ledgers. See `docs/DETAIL.md` for every field and formula.

## Quick start

### 1. With Docker (recommended)

```bash
cp server/.env.example server/.env          # adjust secrets / OPENAI_API_KEY
docker compose up --build
# API  → http://localhost:4000/api/v1
# Web  → http://localhost:5173
```

### 2. Local development

```bash
npm install                                  # installs both workspaces

cp server/.env.example server/.env           # configure the API
# start MongoDB locally, or: docker compose up mongo

npm run seed -w server                        # seed demo data (Spanish)
# or: npm run seed:en -w server               # same dataset, content in English
npm run dev                                    # API + web concurrently
```

| Service | URL |
| --- | --- |
| API | http://localhost:4000/api/v1 |
| Web | http://localhost:5173 |
| Health | http://localhost:4000/health |

### Demo credentials

```
email:    admin@nova.dev
password: Password123!
role:     CTO (full access)
```

## Environment variables

Validated by `server/src/config/env.ts` (the process exits on invalid config).

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `4000` | API port |
| `API_PREFIX` | `/api/v1` | Base path for all routes |
| `MONGODB_URI` | — (required) | MongoDB connection string |
| `JWT_ACCESS_SECRET` | — (required, ≥16) | Access-token signing secret |
| `JWT_REFRESH_SECRET` | — (required, ≥16) | Refresh-token signing secret |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |
| `BCRYPT_SALT_ROUNDS` | `12` | Password hash cost |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Global rate-limit window (15 min) |
| `RATE_LIMIT_MAX` | `300` | Global requests per window |
| `AUTH_RATE_LIMIT_MAX` | `20` | Stricter limit for `/auth` |
| `LOG_LEVEL` | `info` | pino level |
| `OPENAI_API_KEY` | — (optional) | Enables live AI; omit for heuristic mode |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model |

Frontend reads `VITE_API_URL` (defaults to `http://localhost:4000/api/v1`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run API + web concurrently |
| `npm run build` | Build server then web |
| `npm run test` | Backend Jest suite (unit + integration) |
| `npm run lint` | Lint server + web |
| `npm run seed -w server` | Seed demo data in Spanish (incl. finance ledgers) |
| `npm run seed:en -w server` | Seed the same demo dataset in English |
| `npm run docker:up` / `docker:down` | Build & run / tear down the full stack |
| `npm run dev -w web` · `npm run typecheck -w web` | Web-only dev / typecheck |

## Security

- **Password hashing** with bcrypt (configurable rounds).
- **JWT** access tokens + **rotating refresh tokens** — `tokenId` stored per
  user, capped at 5 active sessions; logout / password change revoke all.
- **RBAC** with a role hierarchy:
  `admin (100) > cto (90) > head_of_engineering (80) > engineering_manager (60) > engineer (30) > viewer (10)`.
  `authorizeAtLeast(role)` admits any role whose rank ≥ the named role.
- **Helmet**, **CORS** allow-list, **gzip compression**.
- **Rate limiting** — global window + stricter `/auth` limiter.
- **Zod** validation on every request body / params / query.
- Centralized **error handler** (uniform `{ success, error }` shape) and
  structured **pino** logging.

### Finance & sensitive data RBAC

| Surface | Read | Write |
| --- | --- | --- |
| `/finance/**` | ≥ engineering_manager | ≥ head_of_engineering |
| `/integrations/**` | ≥ engineering_manager (config) | ≥ head_of_engineering (sync/config) |
| Compensation fields | leadership / self (scoped) | ≥ head_of_engineering |
| 1:1 private notes | owning manager / leadership | owning manager |

Engineers / viewers receive `403` on finance and other privileged surfaces.

## Internationalization

The web app ships **Spanish and English**. Strings live in
`web/src/i18n/locales/{es,en}.ts` and are accessed with `useTranslation()`.
Both locales must stay in sync. Seed/demo data is authored in Spanish.
**New features must add keys to both locales.**

## AI

Set `OPENAI_API_KEY` to enable live OpenAI insights. Without a key the platform
runs in **heuristic mode**: every AI endpoint returns a deterministic, useful
fallback so the product is fully functional offline and in CI. Each AI service
is built around `complete(system, user, fallback)` and tags responses with
`source: "openai" | "fallback"`.

## Testing

```bash
npm run test -w server
```

Uses `mongodb-memory-server` for hermetic integration tests (auth flow,
incident lifecycle/MTTR) plus unit tests for derived logic (team health score,
tech-debt score, OKR roll-up, org skills). Test files:

```
server/src/tests/auth.integration.spec.ts
server/src/tests/incidents.integration.spec.ts
server/src/modules/teams/team.service.spec.ts
server/src/modules/techDebt/techDebt.model.spec.ts
server/src/modules/okrs/okr.service.spec.ts
server/src/modules/org/org.service.spec.ts
```

## Keeping the docs current

These three documents are **living documentation**. When you change the code,
update the docs in the same change:

| If you change… | Update… |
| --- | --- |
| Run/setup, scripts, env, top-level features | `README.md` |
| Layers, data flow, cross-cutting concerns, a new diagram-worthy decision | `docs/ARCHITECTURE.md` |
| A model field, endpoint, derived formula, page, or data-entry path | `docs/DETAIL.md` (and `docs/API.md` if the REST surface changed) |
| A screen's purpose, sections, actions, or how a user operates it | `docs/USER_MANUAL.md` |

A short **Changelog** at the bottom of `docs/DETAIL.md` records notable changes.

## Contributing

Contributions are welcome. Fork the repo, create a feature branch, run the
checks (`npm run lint`, `npm run test`, `npm run typecheck -w web`) and open a
pull request. By contributing you agree your work is licensed under the MIT
License below.

## License

Released under the **[MIT License](LICENSE)** © 2026 Javier DAccorso — free to
use, modify and distribute, including commercially, with attribution.
