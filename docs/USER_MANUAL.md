# Nova — User Manual

A screen-by-screen guide to operating Nova, the Engineering Intelligence
Platform. It is written for the people who use the app day to day — engineering
managers, heads of engineering, CTOs and their teams — not for developers (for
that, see [`README.md`](../README.md), [`ARCHITECTURE.md`](ARCHITECTURE.md) and
[`DETAIL.md`](DETAIL.md)).

> **How to read this manual.** Part 1 covers the basics that apply everywhere
> (logging in, navigation, common controls). Part 2 walks through **every
> screen**, grouped exactly as they appear in the left sidebar. Each screen entry
> tells you: what it's for, how to get there, what you see, what you can do, who
> can do it, and where the data comes from.

---

## Contents

**Part 1 — Getting started**
- [1.1 Signing in](#11-signing-in)
- [1.2 The app layout](#12-the-app-layout)
- [1.3 Navigation (the sidebar)](#13-navigation-the-sidebar)
- [1.4 Controls you'll see everywhere](#14-controls-youll-see-everywhere)
- [1.5 Roles & what you can do](#15-roles--what-you-can-do)
- [1.6 Where data comes from](#16-where-data-comes-from)

**Part 2 — Screen by screen**
- [Top group](#top-group): [Dashboard](#dashboard) · [Weekly Brief](#weekly-brief) · [Scorecard](#scorecard) · [Teams](#teams) · [Users](#users) · [Projects](#projects) · [Incidents](#incidents) · [Technical Debt](#technical-debt) · [Architecture](#architecture) · [One-on-Ones](#one-on-ones)
- [People & Org](#people--org): [Org Overview](#org-overview) · [Headcount & Hiring](#headcount--hiring) · [Skills Matrix](#skills-matrix) · [Retention Risk](#retention-risk) · [Engagement (eNPS)](#engagement-enps)
- [Delivery](#delivery): [OKRs](#okrs) · [Delivery Forecast](#delivery-forecast) · [Engineering Investment](#engineering-investment)
- [Finance](#finance): [Finance Dashboard](#finance-dashboard) · [Cloud Costs](#cloud-costs) · [SaaS Costs](#saas-costs) · [Team Costs](#team-costs) · [Product Costs](#product-costs) · [Tech Debt Costs](#tech-debt-costs) · [Incident Costs](#incident-costs) · [Cost of Delay](#cost-of-delay) · [Hiring ROI](#hiring-roi) · [AI Cost Advisor](#ai-cost-advisor) · [Executive Reports](#executive-reports)
- [Integrations](#integrations) · [Settings](#settings)
- [Appendix: roles & permissions](#appendix-roles--permissions)

---

# Part 1 — Getting started

## 1.1 Signing in

1. Open the app (default `http://localhost:5173`).
2. Enter your **email** and **password** and click **Sign in**.
3. You land on the **Dashboard**.

Demo account: `admin@nova.dev` / `Password123!` (CTO — full access). New
accounts can be created from the **Sign up** link if registration is enabled.

Your session stays active across page reloads. If you're idle for a long time
the app refreshes your session automatically; if that fails you'll be returned
to the sign-in screen. Use **Log out** (top right) to end the session on this
device.

## 1.2 The app layout

Every screen shares the same frame:

- **Left sidebar** — the main navigation menu (see §1.3).
- **Top bar** (right side) — language switch, light/dark theme toggle, your name
  & role, and the **log out** button.
- **Main area** — the screen you selected, always opening with a **title** and a
  one-line description of what the screen is for.

On narrow windows the sidebar collapses; open it with the menu button.

## 1.3 Navigation (the sidebar)

The sidebar is organized into a flat top group plus three collapsible sections,
with Integrations and Settings pinned at the bottom. Click a section header
(People & Org, Delivery, Finance) to expand or collapse it.

```
Dashboard
Weekly Brief
Scorecard
Teams
Users
Projects
Incidents
Technical Debt
Architecture
One-on-Ones
▸ People & Org   → Org Overview · Headcount & Hiring · Skills Matrix · Retention Risk · Engagement (eNPS)
▸ Delivery       → OKRs · Delivery Forecast · Engineering Investment
▸ Finance        → Finance Dashboard · Cloud · SaaS · Team · Product · Tech Debt · Incident costs · Cost of Delay · Hiring ROI · AI Cost Advisor · Executive Reports
Integrations
Settings
```

## 1.4 Controls you'll see everywhere

Nova reuses the same building blocks across screens, so once you learn them they
work the same way on every page:

- **Tables** list records. Where supported they offer:
  - **Search** — type to filter by text.
  - **Filters** — dropdowns (e.g. status, severity, team) narrow the list.
  - **Sort** — ordered by a sensible default (often newest first).
  - **Pagination** — *Previous / Next* with a "Page X of Y · N items" counter.
- **Add button** (top right, e.g. *Add*, *New objective*, *Add skill*) opens a
  **dialog** (a pop-up form). Fill the fields and click **Save / Add / Create**.
  Required fields are validated; errors appear in red inside the dialog.
- **Row actions** — the pencil icon **edits** a row (opens the same dialog
  pre-filled); the trash icon **deletes** it after a confirmation pop-up
  (*"This will permanently delete … This action cannot be undone."*).
- **Export** — *Export CSV* downloads the current data; some report screens offer
  *Export PDF*.
- **Empty / loading / error states** — screens show a spinner while loading,
  a friendly "Nothing here yet" when empty, and a red message if something fails.
- **Source notices** — some read-only screens show a small banner explaining
  **where to enter the data** they summarize, with a shortcut link to that page.
- **Integration notices** — screens that can be fed by an external system show a
  banner naming the relevant integration (e.g. *cloud*, *pagerduty*).

Buttons and menu items you don't have permission to use are hidden, so the
screen only shows what your role allows.

## 1.5 Roles & what you can do

Nova has a role hierarchy. Higher roles can do everything lower roles can:

`Admin` ▸ `CTO` ▸ `Head of Engineering` ▸ `Engineering Manager` ▸ `Engineer` ▸ `Viewer`

- **Viewing** most operational screens is open to any signed-in user.
- **Creating / editing** people, teams, projects, incidents, etc. generally
  requires **Engineering Manager** or above.
- **Finance** screens require **Engineering Manager** to view and **Head of
  Engineering** to add or edit.
- Sensitive data (salaries, 1:1 private notes) is only visible to leadership and
  the people directly involved.

A full breakdown is in the [permissions appendix](#appendix-roles--permissions).

## 1.6 Where data comes from

Every number Nova shows is either **entered by you** or **brought in by an
integration** — nothing is invented. There are three kinds of screen:

- **Data-entry screens** — you create and maintain the records here (Teams,
  Users, Projects, Incidents, Tech Debt, Architecture, OKRs, 1:1s, the hiring
  funnel, skills, engagement responses, and all finance cost ledgers).
- **Integration-fed data** — operational delivery metrics (deployments, lead
  time, etc.) arrive from GitHub through **Integrations**.
- **Derived screens** — dashboards, roll-ups, forecasts and AI views *calculate*
  from the data above. They have no form; to change what they show, edit the
  underlying records (the on-screen **source notice** tells you where).

---

# Part 2 — Screen by screen

## Top group

### Dashboard
**Menu:** Dashboard · **For:** a one-glance executive view of engineering health.

- **What you see:** summary cards (delivery, reliability, people signals) and
  trend charts (lead time, deployments, incidents, capacity) over a recent
  window. Read-only.
- **What you can do:** review headline health; use it as the daily starting
  point. (Numbers update as you maintain the underlying teams, incidents,
  projects and metrics.)
- **Data source:** derived from teams, incidents, projects and the DORA metric
  snapshots fed by integrations.

### Weekly Brief
**Menu:** Weekly Brief · **For:** "what needs my attention this week," in one place.

- **What you see:** three counters at the top — **High / Medium / Low** priority
  items — followed by a prioritized list of items pulled from across the system
  (at-risk incidents, slipping OKRs, delivery and people signals). If everything
  is healthy you'll see an "all clear" message.
- **What you can do:** scan and act — each item points you to the area that needs
  attention.
- **Data source:** derived (read-only).

### Scorecard
**Menu:** Scorecard · **For:** a single composite "engineering health" grade.

- **What you see:** the **score out of 100** with its **target**, the **weakest
  dimension** called out, a breakdown of the contributing dimensions, and a
  **trend** chart over time.
- **What you can do:** track the grade against target and see which dimension is
  dragging it down.
- **Data source:** derived from delivery, reliability and people signals.

### Teams
**Menu:** Teams · **For:** managing teams, their members, capacity and health.

- **What you see:** a list of teams with a derived **health score / band** and
  **capacity** (committed vs available, accounting for PTO).
- **What you can do** (Engineering Manager+):
  - **Create / edit a team** (name, description, lead, mission, weekly capacity).
  - **Manage members** — assign people to the team.
  - **Add / remove PTO** entries (person, dates, type).
  - **Delete a team** (Head of Engineering+).
- **Data source:** entered here. Team **signals** entered here also feed the
  Retention and People screens.

### Users
**Menu:** Users · **For:** the people directory, roles and access.

- **What you see:** users with role, seniority, team and status. Filter by role,
  team, active state, seniority.
- **What you can do:**
  - **Create / edit a user** (Engineering Manager+): name, email, role, title,
    team, manager, seniority, capacity.
  - **Set compensation** (Head of Engineering+): salary fields, shown only to
    leadership/self.
  - **Deactivate** a user (Head of Engineering+); **delete** (Admin).
- **Data source:** entered here. Compensation feeds the real-payroll figures on
  finance team-cost views.

### Projects
**Menu:** Projects · **For:** the roadmap and its delivery health.

- **What you see:** projects with status, priority, owning team, progress and
  **roadmap health** (on track / at risk / off track). Filter by status,
  priority, team, owner, roadmap health.
- **What you can do** (Engineering Manager+): create / edit / delete projects,
  set the **investment category** (new value vs keeping-the-lights-on), and
  manage **milestones**.
- **Data source:** entered here. Projects feed the Delivery Forecast and the
  Engineering Investment view.

### Incidents
**Menu:** Incidents · **For:** incident tracking, response timeline and postmortems.

- **What you see:** incidents with severity (SEV1–SEV4), status, team and
  commander. Filter by severity, status, team, service, project. Opening one
  shows its details and timeline.
- **What you can do:**
  - **Create an incident** (an initial timeline entry is added automatically).
  - **Update status** — marking it **resolved** stamps the resolved time and
    computes **MTTR** (mean time to resolve).
  - **Append timeline entries** as the response progresses.
  - **Write the postmortem** (summary, root cause, impact, resolution, lessons;
    optionally publish).
- **Data source:** entered here. Incidents can also be priced on the
  [Incident Costs](#incident-costs) finance screen.

### Technical Debt
**Menu:** Technical Debt · **For:** a registry of debt scored and prioritized.

- **What you see:** debt items with **impact / risk / effort** scores, a derived
  **priority score** and a **quadrant** (the prioritization matrix). There's a
  matrix view grouping items into quadrants.
- **What you can do:** create / edit / delete debt items and their scores.
- **Data source:** entered here. Items can be priced on the
  [Tech Debt Costs](#tech-debt-costs) finance screen.

### Architecture
**Menu:** Architecture · **For:** a registry of services, APIs, databases and how they depend on each other.

- **What you see:** components with type, lifecycle, tier, owning team, plus a
  **dependency graph**. Filter by type, lifecycle, tier, owner team.
- **What you can do:** create / edit / delete components and record their
  dependencies, ownership and links (repo, docs, runbook).
- **Data source:** entered here.

### One-on-Ones
**Menu:** One-on-Ones · **For:** recording 1:1 meetings, goals, feedback and career growth.

- **What you see:** your 1:1 records (managers see their own; leadership sees
  all). Each holds notes, mood, feedback, career-growth plan and goals.
- **What you can do** (Engineering Manager+): create / edit / delete 1:1s and
  goals. **Private notes** are visible only to the owning manager and
  leadership.
- **Data source:** entered here.

> **AI Insights** — there is also an AI Insights screen (AI-generated analysis of
> health, risk and delivery). It is currently hidden from the sidebar but the
> page still exists; it is read-only and derived.

## People & Org

### Org Overview
**Menu:** People & Org ▸ Org Overview · **For:** org structure and headline people signals.

- **What you see:** the org structure, span of control and summary people
  indicators. Read-only.
- **What you can do:** review structure; a **source notice** links you to where
  the underlying people/team data is entered.
- **Data source:** derived from Users and Teams.

### Headcount & Hiring
**Menu:** People & Org ▸ Headcount & Hiring · **For:** plan-vs-actual headcount and the hiring funnel.

- **What you see:** cards for current headcount, open requisitions, average
  time-to-fill and open-req budget; a **plan vs actual** table by team; the
  **hiring funnel** by stage; and a list of **open/planned positions**.
- **What you can do** (Engineering Manager+):
  - **New requisition** — create a position (title, team, seniority, status,
    budgeted monthly cost); edit it; delete (Head of Engineering+).
  - **Add a candidate** to a position's pipeline — use the **person-plus icon**
    on a position row (name, stage, optional note). Candidates move the funnel.
- **Data source:** entered here (positions & candidates).

### Skills Matrix
**Menu:** People & Org ▸ Skills Matrix · **For:** the team capability heatmap and key-person (bus-factor) risk.

- **What you see:** cards for skills tracked, bus-factor risks and average
  experts per skill; the **capability heatmap** (per skill: people, experts,
  average level, risk badge); and below it, the **Skills by person** table.
- **What you can do** (Engineering Manager+):
  - **Add skill** (top-right button) — record a person's skill: choose the
    **person**, type the **skill**, pick a **category**, and set **level (1–5)**
    and **interest (1–5)**.
  - **Edit / delete** any entry in the *Skills by person* table.
  - Adding skills updates the heatmap and recalculates bus-factor risk.
- **Data source:** entered here. *(This is the place to load skills.)*

### Retention Risk
**Menu:** People & Org ▸ Retention Risk · **For:** per-person flight-risk.

- **What you see:** counters for high / medium / low risk; a **"How is this
  calculated?"** expandable card explaining the inputs (team signals, tenure,
  seniority), the scoring rules and the band thresholds; and a table of people
  with tenure, score, risk band and contributing factors.
- **What you can do:** review risk; expand the explainer to understand a score.
  A **source notice** links to **Teams**, where the signals that drive it are
  entered.
- **Data source:** derived from team signals, tenure and seniority.

### Engagement (eNPS)
**Menu:** People & Org ▸ Engagement (eNPS) · **For:** team engagement via anonymous pulse surveys.

- **What you see:** cards for **eNPS** (current period), number of responses,
  promoters and detractors; a **by-dimension** breakdown; an **eNPS trend**
  chart; and a **by-team** table.
- **What you can do:**
  - **Add response** — submit a pulse response: team, **period (YYYY-MM)**, a
    **recommend score (0–10)**, per-dimension scores and an optional comment.
- **Data source:** entered here (pulse responses); the summary/eNPS is derived
  from them.

## Delivery

### OKRs
**Menu:** Delivery ▸ OKRs · **For:** objectives and key results for the quarter.

- **What you see:** summary cards (number of objectives, average progress, on
  track, at risk / off track) and a card per objective showing its status badge,
  team, confidence and each key result's progress bar.
- **What you can do** (Engineering Manager+):
  - **New objective** — title, team, quarter, level (company/team).
  - **Add / edit key results** — each with a metric type (percent, number,
    currency, boolean), start / target / current values and a **confidence %**.
  - Edit or delete objectives.
- **How status is decided:** progress is the average of key-result progress;
  **status is driven by confidence** — below 45% is *off track*, below 70% is
  *at risk*, otherwise *on track*; 100% progress is *achieved*. (So a brand-new
  objective at 0% confidence shows *off track*.)
- **Data source:** entered here.

### Delivery Forecast
**Menu:** Delivery ▸ Delivery Forecast · **For:** predictability of active projects.

- **What you see:** per active project, a Monte Carlo forecast — **P50 / P85**
  delivery dates and the **probability of finishing on time**.
- **What you can do:** review forecasts; a **source notice** links to **Projects**
  (and their milestones), which drive the forecast.
- **Data source:** derived from active projects and milestones.

### Engineering Investment
**Menu:** Delivery ▸ Engineering Investment · **For:** where engineering capacity goes.

- **What you see:** allocation across **new value vs keeping-the-lights-on
  (KTLO) vs tech debt vs incidents**, and the trend over time.
- **What you can do:** review the mix; a **source notice** links to where the
  inputs are entered (projects' investment category, tech-debt and incident
  costs).
- **Data source:** derived.

## Finance

> All Finance screens require **Engineering Manager** to view and **Head of
> Engineering** to add or edit. Engineers/viewers don't see this section.

Each cost screen follows the same shape: **analytics on top** (cards + charts)
and an **editable ledger** below (a table with **Add / edit / delete**). Editing
the ledger immediately refreshes the charts. Most screens also offer
**Export CSV**.

### Finance Dashboard
**Menu:** Finance ▸ Finance Dashboard · **For:** the executive cost overview.

- **What you see:** cards for total engineering cost and its breakdown (payroll,
  infrastructure, SaaS tools, contractors); a monthly trend; cost by category, by
  team and by product.
- **What you can do:** maintain the **monthly engineering-cost ledger** at the
  bottom (month, year, payroll, infrastructure, SaaS, contractors). A *cloud*
  integration notice indicates infra figures can also be fed automatically.
- **Data source:** the engineering-cost ledger (entered here) plus consolidation
  of the other finance pages.

### Cloud Costs
**Menu:** Finance ▸ Cloud Costs · **For:** cloud provider spend.

- **What you see:** spend by provider, monthly trend, and **growth alerts** when
  spend jumps more than ~20% month over month.
- **What you can do:** add / edit / delete cloud cost entries (provider, service,
  month, year, amount, optional team/product/notes).
- **Data source:** entered here (and can be fed by a cloud-billing integration).

### SaaS Costs
**Menu:** Finance ▸ SaaS Costs · **For:** software license spend and waste.

- **What you see:** cards for total monthly spend, wasted spend, potential annual
  savings and underused tools; a table per tool with **utilization** and
  **wasted spend**; and a savings-opportunity callout.
- **What you can do:** add / edit / delete tools (name, category, monthly cost,
  active vs used licenses, renewal date, owner). Utilization and waste are
  computed for you.
- **Data source:** entered here.

### Team Costs
**Menu:** Finance ▸ Team Costs · **For:** monthly cost per team.

- **What you see:** cost by team, monthly trend, and a table with total cost,
  cost per engineer, **payroll derived from real salaries**, and cost per person.
- **What you can do:** maintain the **team-cost ledger** (team, month, year,
  payroll, infrastructure, tooling, contractor allocations, headcount).
- **Data source:** entered here; real-payroll columns come from users' compensation.

### Product Costs
**Menu:** Finance ▸ Product Costs · **For:** cost allocation and profitability by product.

- **What you see:** cost and revenue by product with **margin** and a
  **profitability index** badge.
- **What you can do:** maintain the **product-cost ledger** (product, month,
  year, payroll / infrastructure / tooling allocation, monthly revenue).
- **Data source:** entered here ("product" = a project).

### Tech Debt Costs
**Menu:** Finance ▸ Tech Debt Costs · **For:** pricing the cost of technical debt.

- **What you see:** total monthly and annualized debt cost, tracked items, cost
  by team, and the most expensive debt items.
- **What you can do:** maintain the **tech-debt-cost ledger** (which debt item,
  team, hours lost per month, hourly rate, impact level). Monthly cost is
  computed as hours × rate.
- **Data source:** entered here; references debt items from [Technical Debt](#technical-debt).

### Incident Costs
**Menu:** Finance ▸ Incident Costs · **For:** pricing the cost of incidents.

- **What you see:** total incident cost, severity buckets, teams impacted, cost
  by severity, cost by team and a trend. A *pagerduty* integration notice
  indicates incidents can be fed automatically.
- **What you can do:** maintain the **incident-cost ledger** (which incident,
  team, severity, engineers involved, duration hours, hourly rate, customer
  impact). Cost is computed as engineers × hours × rate.
- **Data source:** entered here; references incidents from [Incidents](#incidents).

### Cost of Delay
**Menu:** Finance ▸ Cost of Delay · **For:** the revenue impact of delayed initiatives.

- **What you see:** total revenue at risk, delayed-initiative count, cost of
  delay per initiative, and a table with expected revenue, delay and status.
- **What you can do:** maintain the **cost-of-delay ledger** (feature name,
  product, team, expected monthly revenue, delay in months, status). Cost is
  revenue × delay.
- **Data source:** entered here.

### Hiring ROI
**Menu:** Finance ▸ Hiring ROI · **For:** the return on proposed hires.

- **What you see:** projected ROI by role and a comparison of hiring cost vs the
  **cost of not hiring**.
- **What you can do:** maintain the **hiring-ROI ledger** (role, team, seniority,
  annual cost, revenue impact, productivity gain, status). ROI is computed as
  (revenue impact − cost) / cost.
- **Data source:** entered here.

### AI Cost Advisor
**Menu:** Finance ▸ AI Cost Advisor · **For:** AI-generated savings and risk recommendations.

- **What you see / do:** click **Analyze costs** to generate savings
  opportunities, risk warnings and executive recommendations. A badge shows
  whether real AI (OpenAI) or the built-in heuristic produced it.
- **Data source:** derived from your finance ledgers.

### Executive Reports
**Menu:** Finance ▸ Executive Reports · **For:** a weekly executive cost report.

- **What you see / do:** click **Generate report** to produce a written weekly
  cost report for leadership; **Export PDF** to share it.
- **Data source:** derived from your finance data.

## Integrations
**Menu:** Integrations · **For:** connecting external systems so data flows in automatically.

- **What you see:** the available providers — **GitHub, Jira, PagerDuty, Cloud**
  — each with a status (connected / disconnected / error) and a **mode**:
  - **Dummy** — uses built-in deterministic sample data (no external connection),
    so the product is fully functional out of the box.
  - **Live** — would call the real external API using saved configuration.
- **What you can do:**
  - View recent **sync runs** for a provider (Engineering Manager+).
  - **Configure** a provider and change its mode, and **run a sync**
    (Head of Engineering+).
- **What it feeds:** GitHub brings in delivery (DORA) metrics that power the
  Dashboard and Delivery Forecast; the others feed incidents, issues and cloud
  cost where wired.

## Settings
**Menu:** Settings · **For:** your account and platform preferences.

- **What you see / do:** account details and configuration. Use the top bar to
  switch **language (Spanish / English)** and **light / dark theme** at any time;
  **change your password** from your account settings; **log out** from the top
  right.

---

# Appendix: roles & permissions

| Area | View | Create / edit | Delete / sensitive |
| --- | --- | --- | --- |
| Dashboard, Brief, Scorecard, forecasts, AI views | any signed-in | — (derived) | — |
| Teams, Projects, Incidents, Tech Debt, Architecture, 1:1s | any signed-in | Engineering Manager+ | Head of Engineering+ (teams); Admin (users) |
| Users | any signed-in | Engineering Manager+ | Deactivate: Head of Eng+; Delete: Admin |
| Compensation | leadership / self | Head of Engineering+ | — |
| 1:1 private notes | owning manager / leadership | owning manager | — |
| OKRs, Headcount, Skills, Engagement | any signed-in | Engineering Manager+ | Positions delete: Head of Eng+ |
| Finance (all cost screens) | Engineering Manager+ | Head of Engineering+ | Head of Engineering+ |
| Integrations | Engineering Manager+ (view/runs) | Head of Engineering+ (config/sync) | — |

Role hierarchy (each inherits the ones below):
`Admin` ▸ `CTO` ▸ `Head of Engineering` ▸ `Engineering Manager` ▸ `Engineer` ▸ `Viewer`.

---

*This manual is part of Nova's living documentation. When a screen changes, update
the matching entry here (and the technical docs). See the changelog in
[`DETAIL.md`](DETAIL.md#maintenance--changelog).*
