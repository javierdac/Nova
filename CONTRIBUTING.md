# Contributing to Nova

Thanks for your interest in contributing! Nova is an open, collaborative project
under the [MIT License](LICENSE). This guide explains how to get set up and how
to land a change.

## Code of Conduct

By participating you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful and constructive.

## Getting set up

Prerequisites: **Node ≥ 20** and a local **MongoDB** (or use Docker).

```bash
git clone https://github.com/javierdac/Nova.git
cd Nova
npm install                       # installs both workspaces (server + web)
cp server/.env.example server/.env
npm run seed -w server            # demo data — login admin@nova.dev / Password123!
npm run dev                       # API (:4000) + web (:5173)
```

See the [README](README.md) for full setup and the
[architecture](docs/ARCHITECTURE.md) / [detailed reference](docs/DETAIL.md) for
how the system is built.

## Workflow

1. **Fork** the repo and create a branch off `main`:
   `git checkout -b feat/short-description` (use `feat/`, `fix/`, `docs/`, `chore/`).
2. Make your change in small, focused commits.
3. Run the checks locally (see below) — they must pass.
4. Push and open a **Pull Request** against `main`, filling in the PR template.
5. CI runs typecheck, tests and build on every PR; keep it green.

## Checks (run before pushing)

```bash
npm run test -w server            # Jest (unit + integration, hermetic via mongodb-memory-server)
npm run typecheck -w server       # tsc --noEmit
npm run typecheck -w web          # tsc --noEmit
npm run build -w web              # vite build
npm run lint                      # eslint (server + web)
```

## Project conventions

These are enforced expectations, not just suggestions:

- **Everything is enterable.** Any value the UI displays must originate inside
  the product — entered via a CRUD form or ingested via an integration. Never
  add a screen that depends on data only the seed can produce. Derived views
  (dashboards, roll-ups) are fine because their inputs are enterable.
- **Bilingual (es + en).** All user-facing strings live in
  `web/src/i18n/locales/{es,en}.ts` and must be added to **both** locales. Demo
  /seed data is authored in Spanish.
- **Clean Architecture (backend).** Keep the layering: `routes → controllers →
  services → repositories → models`. Controllers stay thin; business logic and
  derived metrics live in services; validation uses Zod DTOs at the edge.
- **Keep the docs in sync.** Update the matching doc in the same PR — `README.md`
  (setup/features), `docs/ARCHITECTURE.md` (layers/flow/decisions),
  `docs/DETAIL.md` (models/endpoints/pages, plus a changelog entry),
  `docs/USER_MANUAL.md` (a screen's behavior). Update `docs/API.md` when the REST
  surface changes.
- **RBAC.** Respect the role hierarchy; gate writes appropriately and never trust
  client-supplied derived fields.

## Commit messages

Write clear, imperative messages (e.g. "Add hiring-candidate entry to Headcount").
Conventional-commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`) are welcome but
not required.

## Reporting bugs & requesting features

Use the issue templates (Bug report / Feature request). Include reproduction
steps, expected vs actual behavior, and your environment for bugs.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
