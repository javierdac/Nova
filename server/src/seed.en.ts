/**
 * English seed script. Run with `npm run seed:en`.
 *
 * Sibling of `seed.ts` (Spanish dummy data) — same structure and shape, but all
 * human-readable content is in English. Both coexist; each one wipes and
 * repopulates the same collections, so run whichever locale you want to demo.
 * Seeds the engineering org (two squads), plus projects, incidents, tech debt,
 * architecture, finance, OKRs, headcount/hiring, skills and 90 days of metric
 * snapshots.
 */
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './config/logger.js';
import { UserModel } from './modules/users/user.model.js';
import { TeamModel } from './modules/teams/team.model.js';
import { ProjectModel } from './modules/projects/project.model.js';
import { IncidentModel } from './modules/incidents/incident.model.js';
import { TechDebtModel } from './modules/techDebt/techDebt.model.js';
import { ArchitectureModel } from './modules/architecture/architecture.model.js';
import { OneOnOneModel } from './modules/oneOnOnes/oneOnOne.model.js';
import { MetricSnapshotModel } from './modules/metrics/metric.model.js';
import { PositionModel } from './modules/org/position.model.js';
import { SkillModel } from './modules/org/skill.model.js';
import { SkillCatalogModel } from './modules/org/skillCatalog.model.js';
import { ObjectiveModel } from './modules/okrs/objective.model.js';
import { PulseResponseModel } from './modules/engagement/pulse.model.js';
import { seedFinance } from './modules/finance/finance.seed.js';

const PW = 'Password123!';
const days = (n: number) => new Date(Date.now() - n * 864e5);

async function seed() {
  await connectDatabase();
  logger.info('🌱 Seeding database (English)...');

  await Promise.all([
    UserModel.deleteMany({}),
    TeamModel.deleteMany({}),
    ProjectModel.deleteMany({}),
    IncidentModel.deleteMany({}),
    TechDebtModel.deleteMany({}),
    ArchitectureModel.deleteMany({}),
    OneOnOneModel.deleteMany({}),
    MetricSnapshotModel.deleteMany({}),
    PositionModel.deleteMany({}),
    SkillModel.deleteMany({}),
    SkillCatalogModel.deleteMany({}),
    ObjectiveModel.deleteMany({}),
    PulseResponseModel.deleteMany({}),
  ]);

  /* ── People ────────────────────────────────────────── */
  const mk = (spec: Record<string, unknown>) => UserModel.create({ password: PW, ...spec });

  const admin = await mk({ name: 'Nova Admin', email: 'admin@nova.dev', role: 'admin', title: 'CTO', seniority: 'principal' });
  const javier = await mk({ name: 'Javier Daccorso', email: 'Javier.Daccorso@transformco.com', role: 'engineering_manager', title: 'Engineering Manager', seniority: 'staff', manager: admin._id });

  // Leadership / shared roles report to Javier.
  const santiago = await mk({ name: 'Santiago Nivelo', email: 'santiago.nivelo@nova.dev', role: 'engineering_manager', title: 'Tech Lead', seniority: 'staff', manager: javier._id });
  const carlos = await mk({ name: 'Carlos Torrez', email: 'carlos.torrez@nova.dev', role: 'engineering_manager', title: 'Tech Lead', seniority: 'staff', manager: javier._id });
  const abhinav = await mk({ name: 'Abhinav Penmetsa', email: 'abhinav.penmetsa@nova.dev', role: 'engineer', title: 'Product Owner', seniority: 'senior', manager: javier._id });
  const kuljit = await mk({ name: 'Kuljit Kandhola', email: 'kuljit.kandhola@nova.dev', role: 'engineer', title: 'Architect', seniority: 'principal', manager: javier._id });

  // Squad Alpha engineers report to Santiago.
  const romerd = await mk({ name: 'Romerd Garcia', email: 'romerd.garcia@nova.dev', role: 'engineer', title: 'Software Engineer', seniority: 'senior', manager: santiago._id });
  const victor = await mk({ name: 'Victor Morais', email: 'victor.morais@nova.dev', role: 'engineer', title: 'Software Engineer', seniority: 'mid', manager: santiago._id });
  const daniel = await mk({ name: 'Daniel Arias', email: 'daniel.arias@nova.dev', role: 'engineer', title: 'Software Engineer', seniority: 'mid', manager: santiago._id });
  const pratik = await mk({ name: 'Pratik Tamhane', email: 'pratik.tamhane@nova.dev', role: 'engineer', title: 'Software Engineer', seniority: 'junior', manager: santiago._id });
  const cervi = await mk({ name: 'Henrique Cervi', email: 'henrique.cervi@nova.dev', role: 'engineer', title: 'QA Engineer', seniority: 'mid', manager: santiago._id });

  // Squad Beta engineers report to Carlos.
  const cutri = await mk({ name: 'Henrique Cutri', email: 'henrique.cutri@nova.dev', role: 'engineer', title: 'Software Engineer', seniority: 'senior', manager: carlos._id });
  const sebastian = await mk({ name: 'Sebastian Cordova Vasquez', email: 'sebastian.cordova@nova.dev', role: 'engineer', title: 'Software Engineer', seniority: 'mid', manager: carlos._id });
  const olavo = await mk({ name: 'Olavo Wilke', email: 'olavo.wilke@nova.dev', role: 'engineer', title: 'Software Engineer', seniority: 'mid', manager: carlos._id });
  const fabiano = await mk({ name: 'Fabiano Santos', email: 'fabiano.santos@nova.dev', role: 'engineer', title: 'Software Engineer', seniority: 'junior', manager: carlos._id });

  /* ── Teams ─────────────────────────────────────────── */
  const alpha = await TeamModel.create({
    name: 'Squad Alpha',
    mission: 'Own the platform core services and their reliability',
    lead: santiago._id,
    members: [santiago, abhinav, romerd, victor, daniel, pratik, cervi].map((u) => u._id),
    signals: { morale: 78, velocityConfidence: 74, onCallLoad: 42, attrition: 12 },
  });
  const beta = await TeamModel.create({
    name: 'Squad Beta',
    mission: 'Ship customer-facing product features',
    lead: carlos._id,
    members: [carlos, kuljit, cutri, sebastian, olavo, fabiano].map((u) => u._id),
    signals: { morale: 62, velocityConfidence: 58, onCallLoad: 68, attrition: 24 },
  });

  const alphaIds = [santiago, abhinav, romerd, victor, daniel, pratik, cervi].map((u) => u._id);
  const betaIds = [carlos, kuljit, cutri, sebastian, olavo, fabiano].map((u) => u._id);
  await UserModel.updateMany({ _id: { $in: alphaIds } }, { team: alpha._id });
  await UserModel.updateMany({ _id: { $in: betaIds } }, { team: beta._id });

  // Backdate a couple of tenures into the 12-24mo flight-risk window for realism.
  await UserModel.updateOne({ _id: cutri._id }, { $set: { createdAt: days(540) } });
  await UserModel.updateOne({ _id: sebastian._id }, { $set: { createdAt: days(600) } });
  await UserModel.updateOne({ _id: romerd._id }, { $set: { createdAt: days(420) } });

  // Sample compensation by seniority (annual USD). Sensitive field: only visible
  // through the compensation endpoints with finance permission.
  const SALARY_BY_SENIORITY: Record<string, number> = {
    intern: 36000,
    junior: 72000,
    mid: 105000,
    senior: 140000,
    staff: 175000,
    principal: 205000,
  };
  for (const [seniority, annualSalary] of Object.entries(SALARY_BY_SENIORITY)) {
    await UserModel.updateMany(
      { seniority },
      { $set: { 'compensation.annualSalary': annualSalary, 'compensation.currency': 'USD' } },
    );
  }

  /* ── Architecture ──────────────────────────────────── */
  const apiGw = await ArchitectureModel.create({
    name: 'API Gateway', type: 'api', tier: 'tier1', ownerTeam: alpha._id, language: 'Go',
    description: 'Edge gateway: routing, authentication and rate limiting for all public traffic.',
    apiSpec: { protocol: 'rest', version: 'v1' }, repoUrl: 'https://github.com/nova/api-gateway', docsUrl: 'https://docs.nova.dev/gateway',
  });
  const primaryPg = await ArchitectureModel.create({
    name: 'Primary Postgres', type: 'database', tier: 'tier1', ownerTeam: alpha._id,
    description: 'Primary multi-tenant datastore.',
    dbSpec: { engine: 'PostgreSQL', version: '16', multiTenant: true }, runbookUrl: 'https://docs.nova.dev/runbooks/postgres',
  });
  const userSvc = await ArchitectureModel.create({
    name: 'User Service', type: 'service', tier: 'tier1', ownerTeam: alpha._id, language: 'TypeScript',
    description: 'Identity, profiles and RBAC.', dependencies: [apiGw._id, primaryPg._id], repoUrl: 'https://github.com/nova/user-service',
  });
  const redis = await ArchitectureModel.create({
    name: 'Redis Cache', type: 'cache', tier: 'tier2', ownerTeam: alpha._id,
    description: 'Session and hot-path cache.', dbSpec: { engine: 'Redis', version: '7' },
  });
  const eventsQueue = await ArchitectureModel.create({
    name: 'Events Queue', type: 'queue', tier: 'tier2', ownerTeam: alpha._id, language: 'Kafka',
    description: 'Cross-service domain event bus.',
  });
  const billingSvc = await ArchitectureModel.create({
    name: 'Billing Service', type: 'service', tier: 'tier1', ownerTeam: beta._id, language: 'TypeScript',
    description: 'Subscriptions, billing and payment orchestration (Billing v2).',
    dependencies: [apiGw._id, primaryPg._id, eventsQueue._id], repoUrl: 'https://github.com/nova/billing',
  });
  await ArchitectureModel.create({
    name: 'Web App', type: 'frontend', tier: 'tier2', ownerTeam: beta._id, language: 'React',
    description: 'Customer-facing SPA.', dependencies: [apiGw._id], repoUrl: 'https://github.com/nova/web',
  });
  await ArchitectureModel.create({
    name: 'Notifications Worker', type: 'job', tier: 'tier3', ownerTeam: beta._id, language: 'TypeScript',
    description: 'Async email/push fan-out from domain events.', dependencies: [eventsQueue._id, redis._id],
  });
  await ArchitectureModel.create({
    name: 'Legacy Auth Shim', type: 'service', tier: 'tier2', ownerTeam: alpha._id, language: 'Python', lifecycle: 'deprecated',
    description: 'Bridge to the old auth system — pending removal (see tech debt).', dependencies: [userSvc._id],
  });
  await ArchitectureModel.create({
    name: 'Analytics Pipeline', type: 'external', tier: 'tier3', ownerTeam: beta._id, lifecycle: 'planned',
    description: 'Planned warehouse ingestion from the events queue.', dependencies: [eventsQueue._id, billingSvc._id],
  });

  /* ── Projects ──────────────────────────────────────── */
  const projects = await ProjectModel.create([
    { name: 'Billing v2', key: 'BILL', status: 'active', priority: 'high', investmentCategory: 'new_value', team: beta._id, owner: carlos._id, progress: 55, roadmapHealth: 'at_risk', targetDate: days(-30) },
    { name: 'Multi-region Failover', key: 'MRF', status: 'active', priority: 'critical', investmentCategory: 'new_value', team: alpha._id, owner: santiago._id, progress: 30, roadmapHealth: 'off_track', targetDate: days(-60) },
    { name: 'Design System', key: 'DS', status: 'active', priority: 'medium', investmentCategory: 'new_value', team: beta._id, owner: kuljit._id, progress: 80, roadmapHealth: 'on_track', targetDate: days(-45) },
    { name: 'Platform Support & Maintenance', key: 'KTLO', status: 'active', priority: 'medium', investmentCategory: 'ktlo', team: alpha._id, owner: santiago._id, progress: 45, roadmapHealth: 'on_track' },
  ]);

  /* ── Incidents ─────────────────────────────────────── */
  const incidents = await IncidentModel.create([
    { title: 'Checkout latency spike', severity: 'SEV2', status: 'resolved', team: beta._id, commander: carlos._id, detectedAt: days(7), resolvedAt: new Date(days(7).getTime() + 90 * 60000), mttrMinutes: 90, affectedUsers: 1200 },
    { title: 'Authentication service outage', severity: 'SEV1', status: 'monitoring', team: alpha._id, commander: santiago._id, detectedAt: days(2), affectedUsers: 8000 },
  ]);

  /* ── Tech debt ─────────────────────────────────────── */
  const techDebt = await TechDebtModel.create([
    { title: 'Remove the legacy auth shim', category: 'security', status: 'in_progress', team: alpha._id, owner: romerd._id, impactScore: 8, riskScore: 9, effortScore: 4 },
    { title: 'Increase test coverage in billing', category: 'testing', status: 'in_progress', team: beta._id, owner: cervi._id, impactScore: 7, riskScore: 6, effortScore: 3 },
    { title: 'Migrate to typed configuration', category: 'code_quality', team: alpha._id, owner: victor._id, impactScore: 5, riskScore: 4, effortScore: 8 },
  ]);

  /* ── Headcount & hiring pipeline ───────────────────── */
  await PositionModel.create([
    { title: 'Senior Backend Engineer', team: alpha._id, seniority: 'senior', status: 'interviewing', budgetedMonthlyCost: 11000, openedAt: days(40), pipeline: [{ name: 'Aisha Khan', stage: 'onsite' }, { name: 'Marco Rossi', stage: 'screen' }, { name: 'Wei Chen', stage: 'applied' }] },
    { title: 'Frontend Engineer', team: beta._id, seniority: 'mid', status: 'open', budgetedMonthlyCost: 8000, openedAt: days(15), pipeline: [{ name: 'Lucia Fernández', stage: 'applied' }] },
    { title: 'SRE / Platform Engineer', team: beta._id, seniority: 'senior', status: 'offer', budgetedMonthlyCost: 12000, openedAt: days(55), pipeline: [{ name: 'Tom Becker', stage: 'offer' }, { name: 'Nadia Petrova', stage: 'rejected' }] },
    { title: 'QA Automation Engineer', team: alpha._id, seniority: 'mid', status: 'filled', budgetedMonthlyCost: 7000, openedAt: days(90), filledAt: days(35), filledBy: cervi._id },
    { title: 'Engineering Manager', team: beta._id, seniority: 'staff', status: 'planned', budgetedMonthlyCost: 14000, targetStartDate: days(-90) },
  ]);

  /* ── Skill catalog (org-wide skill definitions) ─────── */
  await SkillCatalogModel.create([
    { name: 'TypeScript', category: 'language', description: 'Primary backend and frontend language.' },
    { name: 'Go', category: 'language', description: 'High-performance platform services.' },
    { name: 'React', category: 'framework', description: 'UI framework for customer-facing apps.' },
    { name: 'Node.js', category: 'platform', description: 'Runtime for the backend services.' },
    { name: 'PostgreSQL', category: 'platform', description: 'Primary relational database.' },
    { name: 'Kubernetes', category: 'platform', description: 'Container orchestration.' },
    { name: 'AWS', category: 'platform', description: 'Primary cloud provider.' },
    { name: 'System Design', category: 'domain', description: 'Distributed systems architecture.' },
    { name: 'Test Automation', category: 'tooling', description: 'Automated testing frameworks.' },
  ]);

  /* ── Skills matrix (note the single-expert bus factors) ── */
  await SkillModel.create([
    { user: kuljit._id, skill: 'Kubernetes', category: 'platform', level: 5, interest: 4 },
    { user: kuljit._id, skill: 'System Design', category: 'domain', level: 5, interest: 5 },
    { user: santiago._id, skill: 'TypeScript', category: 'language', level: 5, interest: 4 },
    { user: carlos._id, skill: 'TypeScript', category: 'language', level: 4, interest: 4 },
    { user: romerd._id, skill: 'TypeScript', category: 'language', level: 4, interest: 3 },
    { user: victor._id, skill: 'React', category: 'framework', level: 4, interest: 5 },
    { user: olavo._id, skill: 'React', category: 'framework', level: 3, interest: 4 },
    { user: cutri._id, skill: 'Node.js', category: 'platform', level: 4, interest: 4 },
    { user: daniel._id, skill: 'PostgreSQL', category: 'platform', level: 3, interest: 3 },
    { user: pratik._id, skill: 'Go', category: 'language', level: 2, interest: 5 },
    { user: fabiano._id, skill: 'AWS', category: 'platform', level: 3, interest: 4 },
    { user: cervi._id, skill: 'Test Automation', category: 'tooling', level: 4, interest: 5 },
  ]);

  /* ── OKRs (2026-Q2) ────────────────────────────────── */
  await ObjectiveModel.create([
    {
      title: 'Ship Billing v2 to GA',
      level: 'company',
      quarter: '2026-Q2',
      owner: javier._id,
      team: beta._id,
      linkedProjects: [projects[0]._id],
      keyResults: [
        { title: 'Roll out Billing v2 to all customers', metricType: 'percent', startValue: 0, targetValue: 100, currentValue: 55, confidence: 60 },
        { title: 'Payment success rate', metricType: 'percent', startValue: 97, targetValue: 99.5, currentValue: 98.2, confidence: 75 },
      ],
    },
    {
      title: 'Strengthen platform reliability',
      level: 'team',
      quarter: '2026-Q2',
      owner: santiago._id,
      team: alpha._id,
      linkedProjects: [projects[1]._id],
      keyResults: [
        { title: 'Reduce P1 incidents per quarter', metricType: 'number', startValue: 8, targetValue: 2, currentValue: 5, confidence: 50 },
        { title: 'MTTR below 30 minutes', metricType: 'number', startValue: 90, targetValue: 30, currentValue: 60, confidence: 45 },
      ],
    },
    {
      title: 'Improve developer experience',
      level: 'team',
      quarter: '2026-Q2',
      owner: carlos._id,
      team: beta._id,
      linkedProjects: [projects[2]._id],
      keyResults: [
        { title: 'Deploys per day', metricType: 'number', startValue: 1, targetValue: 4, currentValue: 3, confidence: 80 },
        { title: 'CI pipeline under 10 minutes', metricType: 'boolean', targetValue: 1, currentValue: 1, confidence: 90 },
      ],
    },
  ]);

  /* ── 1:1s (rich: feedback, growth, goals, action items) ── */
  await OneOnOneModel.create([
    {
      manager: javier._id, report: santiago._id, date: days(6), mood: 'good',
      notes: 'Reviewed Squad Alpha\'s reliability push. Santiago is motivated but stretched thin between on-call and MRF.',
      privateNotes: 'Strong candidate for promotion to EM in 2 quarters. Watch for on-call burnout.',
      feedback: { strengths: 'Excellent technical leadership and calm during incidents.', improvements: 'Delegate the on-call rotation more to grow the team.' },
      careerGrowth: { currentLevel: 'Staff / Tech Lead', targetLevel: 'Engineering Manager', plan: 'Shadow Javier on hiring rounds and quarterly planning. Lead the next postmortem end to end.' },
      goals: [
        { title: 'Reduce Squad Alpha P1 incidents to <2/quarter', category: 'performance', status: 'in_progress' },
        { title: 'Lead a hiring round solo', category: 'career', status: 'not_started' },
      ],
      actionItems: [
        { title: 'Draft the on-call rotation proposal', owner: 'report', done: true },
        { title: 'Share the MRF risk register with Javier', owner: 'report', done: false },
        { title: 'Schedule a skip-level with Romerd', owner: 'manager', done: false },
      ],
      nextMeetingDate: days(-8),
    },
    {
      manager: javier._id, report: carlos._id, date: days(5), mood: 'neutral',
      notes: 'The Billing v2 timeline is tight. Carlos is worried about Squad Beta morale and on-call load.',
      privateNotes: 'Beta morale is dropping — watch the attrition signals.',
      feedback: { strengths: 'Great product sense and stakeholder communication.', improvements: 'Raise objections earlier against unrealistic deadlines.' },
      careerGrowth: { currentLevel: 'Staff / Tech Lead', targetLevel: 'Senior Staff', plan: 'Own the Billing v2 architecture review and mentor two mid-senior engineers.' },
      goals: [
        { title: 'Ship Billing v2 to GA', category: 'project', status: 'in_progress' },
        { title: 'Raise Squad Beta morale signal to 70+', category: 'performance', status: 'in_progress' },
      ],
      actionItems: [
        { title: 'Re-scope the Billing v2 milestones with the PO', owner: 'report', done: false },
        { title: 'Approve 1 extra SRE req for Beta', owner: 'manager', done: true },
      ],
      nextMeetingDate: days(-9),
    },
    {
      manager: santiago._id, report: romerd._id, date: days(3), mood: 'great',
      notes: 'Romerd is crushing the auth shim removal. Ready for more architectural ownership.',
      feedback: { strengths: 'Deep backend expertise, reliable delivery.', improvements: 'Document decisions more for the team.' },
      careerGrowth: { currentLevel: 'Senior', targetLevel: 'Staff', plan: 'Lead the typed-configuration migration as a staff-level initiative.' },
      goals: [{ title: 'Remove the legacy auth shim', category: 'project', status: 'in_progress' }],
      actionItems: [{ title: 'Write the ADR for the auth changes', owner: 'report', done: false }],
      nextMeetingDate: days(-11),
    },
    {
      manager: carlos._id, report: olavo._id, date: days(2), mood: 'concerned',
      notes: 'Olavo feels overloaded with front-end work and unclear about his growth path.',
      privateNotes: 'Flight risk — address the growth plan and workload this month.',
      feedback: { strengths: 'Solid React skills, good eye for UX.', improvements: 'Communicate blockers sooner.' },
      careerGrowth: { currentLevel: 'Mid', targetLevel: 'Senior', plan: 'Define a clear senior-track checklist and pair on system design.' },
      goals: [{ title: 'Own the design system component library', category: 'skill', status: 'not_started' }],
      actionItems: [
        { title: 'Rebalance Olavo\'s workload', owner: 'manager', done: false },
        { title: 'Draft the senior-track checklist', owner: 'manager', done: false },
      ],
      nextMeetingDate: days(-5),
    },
  ]);

  /* ── Finance ───────────────────────────────────────── */
  await seedFinance({
    teamIds: [alpha._id, beta._id],
    projectIds: projects.map((p) => p._id),
    techDebtIds: techDebt.map((d) => d._id),
    incidentIds: incidents.map((i) => i._id),
    userIds: [admin._id, javier._id],
    locale: 'en',
  });

  /* ── 90 days of metric snapshots per team ──────────── */
  const snapshots = [];
  for (const team of [alpha, beta]) {
    for (let d = 90; d >= 0; d--) {
      const date = days(d);
      const noise = (d % 7) / 7;
      snapshots.push({
        team: team._id,
        date,
        leadTimeHours: 24 + noise * 30,
        deploymentCount: Math.round(1 + noise * 4),
        deploymentFrequency: 1 + noise * 4,
        changeFailureRate: 0.05 + noise * 0.1,
        incidentCount: d % 15 === 0 ? 1 : 0,
        mttrMinutes: 60 + noise * 120,
        availableCapacityHours: 140 + noise * 20,
        committedCapacityHours: 130 + noise * 25,
      });
    }
  }
  await MetricSnapshotModel.insertMany(snapshots);

  /* ── Engagement pulse (eNPS) — two periods, both teams ─── */
  // r = recommend (0-10); d = [workload, clarity, growth, management] (1-10).
  const pulse = (team: typeof alpha, period: string, r: number, d: [number, number, number, number], comment?: string) => ({
    team: team._id,
    period,
    recommendScore: r,
    dimensions: { workload: d[0], clarity: d[1], growth: d[2], management: d[3] },
    comment,
  });
  await PulseResponseModel.insertMany([
    // May 2026
    pulse(alpha, '2026-05', 9, [6, 8, 7, 9], 'On-call is heavy, but the team is aligned.'),
    pulse(alpha, '2026-05', 7, [5, 7, 6, 8]),
    pulse(alpha, '2026-05', 5, [4, 6, 5, 7], 'Too much context shifting from sprint to sprint.'),
    pulse(beta, '2026-05', 10, [7, 9, 8, 9], 'Great moment for the team.'),
    pulse(beta, '2026-05', 8, [6, 8, 7, 8]),
    pulse(beta, '2026-05', 6, [5, 6, 5, 6]),
    // June 2026
    pulse(alpha, '2026-06', 9, [7, 8, 8, 9]),
    pulse(alpha, '2026-06', 8, [6, 8, 7, 8], 'Workload improved since we added someone to on-call.'),
    pulse(alpha, '2026-06', 6, [5, 7, 6, 7]),
    pulse(beta, '2026-06', 10, [8, 9, 8, 9]),
    pulse(beta, '2026-06', 9, [7, 9, 8, 9], 'Goal clarity is very high this month.'),
    pulse(beta, '2026-06', 7, [6, 7, 6, 8]),
  ]);

  logger.info(`✅ Seed complete (English). Login: ${admin.email} / ${PW}`);
  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
