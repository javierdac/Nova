/**
 * Idempotent seed script. Run with `npm run seed`.
 * Seeds the real engineering org (two squads), plus projects, incidents,
 * tech debt, architecture, finance, OKRs, headcount/hiring, skills and
 * 90 days of metric snapshots.
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
  logger.info('🌱 Seeding database...');

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
  const santiago = await mk({ name: 'Mateo Aguirre', email: 'mateo.aguirre@nova.dev', role: 'engineering_manager', title: 'Líder Técnico', seniority: 'staff', manager: javier._id });
  const carlos = await mk({ name: 'Tomás Bianchi', email: 'tomas.bianchi@nova.dev', role: 'engineering_manager', title: 'Líder Técnico', seniority: 'staff', manager: javier._id });
  const abhinav = await mk({ name: 'Lucas Ferreyra', email: 'lucas.ferreyra@nova.dev', role: 'engineer', title: 'Dueño de Producto', seniority: 'senior', manager: javier._id });
  const kuljit = await mk({ name: 'Diego Maldonado', email: 'diego.maldonado@nova.dev', role: 'engineer', title: 'Arquitecto', seniority: 'principal', manager: javier._id });

  // Squad Alpha engineers report to Mateo.
  const romerd = await mk({ name: 'Joaquín Herrera', email: 'joaquin.herrera@nova.dev', role: 'engineer', title: 'Ingeniero de Software', seniority: 'senior', manager: santiago._id });
  const victor = await mk({ name: 'Nicolás Vega', email: 'nicolas.vega@nova.dev', role: 'engineer', title: 'Ingeniero de Software', seniority: 'mid', manager: santiago._id });
  const daniel = await mk({ name: 'Bruno Ledesma', email: 'bruno.ledesma@nova.dev', role: 'engineer', title: 'Ingeniero de Software', seniority: 'mid', manager: santiago._id });
  const pratik = await mk({ name: 'Emilio Sosa', email: 'emilio.sosa@nova.dev', role: 'engineer', title: 'Ingeniero de Software', seniority: 'junior', manager: santiago._id });
  const cervi = await mk({ name: 'Facundo Ríos', email: 'facundo.rios@nova.dev', role: 'engineer', title: 'Ingeniero QA', seniority: 'mid', manager: santiago._id });

  // Squad Beta engineers report to Tomás.
  const cutri = await mk({ name: 'Agustín Molina', email: 'agustin.molina@nova.dev', role: 'engineer', title: 'Ingeniero de Software', seniority: 'senior', manager: carlos._id });
  const sebastian = await mk({ name: 'Ramiro Paredes', email: 'ramiro.paredes@nova.dev', role: 'engineer', title: 'Ingeniero de Software', seniority: 'mid', manager: carlos._id });
  const olavo = await mk({ name: 'Tobías Quiroga', email: 'tobias.quiroga@nova.dev', role: 'engineer', title: 'Ingeniero de Software', seniority: 'mid', manager: carlos._id });
  const fabiano = await mk({ name: 'Gael Navarro', email: 'gael.navarro@nova.dev', role: 'engineer', title: 'Ingeniero de Software', seniority: 'junior', manager: carlos._id });

  /* ── Teams ─────────────────────────────────────────── */
  const alpha = await TeamModel.create({
    name: 'Squad Alpha',
    mission: 'Ser dueños de los servicios core de la plataforma y su fiabilidad',
    lead: santiago._id,
    members: [santiago, abhinav, romerd, victor, daniel, pratik, cervi].map((u) => u._id),
    signals: { morale: 78, velocityConfidence: 74, onCallLoad: 42, attrition: 12 },
  });
  const beta = await TeamModel.create({
    name: 'Squad Beta',
    mission: 'Entregar funcionalidades de producto de cara al cliente',
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

  // Compensación de ejemplo por seniority (USD anual). Campo sensible: solo
  // visible vía los endpoints de compensación con permiso de finanzas.
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
    description: 'Gateway de borde: ruteo, autenticación y rate limiting para todo el tráfico público.',
    apiSpec: { protocol: 'rest', version: 'v1' }, repoUrl: 'https://github.com/nova/api-gateway', docsUrl: 'https://docs.nova.dev/gateway',
  });
  const primaryPg = await ArchitectureModel.create({
    name: 'Primary Postgres', type: 'database', tier: 'tier1', ownerTeam: alpha._id,
    description: 'Datastore primario multi-inquilino.',
    dbSpec: { engine: 'PostgreSQL', version: '16', multiTenant: true }, runbookUrl: 'https://docs.nova.dev/runbooks/postgres',
  });
  const userSvc = await ArchitectureModel.create({
    name: 'User Service', type: 'service', tier: 'tier1', ownerTeam: alpha._id, language: 'TypeScript',
    description: 'Identidad, perfiles y RBAC.', dependencies: [apiGw._id, primaryPg._id], repoUrl: 'https://github.com/nova/user-service',
  });
  const redis = await ArchitectureModel.create({
    name: 'Redis Cache', type: 'cache', tier: 'tier2', ownerTeam: alpha._id,
    description: 'Caché de sesión y de hot-path.', dbSpec: { engine: 'Redis', version: '7' },
  });
  const eventsQueue = await ArchitectureModel.create({
    name: 'Events Queue', type: 'queue', tier: 'tier2', ownerTeam: alpha._id, language: 'Kafka',
    description: 'Bus de eventos de dominio entre servicios.',
  });
  const billingSvc = await ArchitectureModel.create({
    name: 'Billing Service', type: 'service', tier: 'tier1', ownerTeam: beta._id, language: 'TypeScript',
    description: 'Suscripciones, facturación y orquestación de pagos (Billing v2).',
    dependencies: [apiGw._id, primaryPg._id, eventsQueue._id], repoUrl: 'https://github.com/nova/billing',
  });
  await ArchitectureModel.create({
    name: 'Web App', type: 'frontend', tier: 'tier2', ownerTeam: beta._id, language: 'React',
    description: 'SPA de cara al cliente.', dependencies: [apiGw._id], repoUrl: 'https://github.com/nova/web',
  });
  await ArchitectureModel.create({
    name: 'Notifications Worker', type: 'job', tier: 'tier3', ownerTeam: beta._id, language: 'TypeScript',
    description: 'Fan-out asíncrono de email/push a partir de eventos de dominio.', dependencies: [eventsQueue._id, redis._id],
  });
  await ArchitectureModel.create({
    name: 'Legacy Auth Shim', type: 'service', tier: 'tier2', ownerTeam: alpha._id, language: 'Python', lifecycle: 'deprecated',
    description: 'Puente al sistema de auth viejo — pendiente de remover (ver deuda técnica).', dependencies: [userSvc._id],
  });
  await ArchitectureModel.create({
    name: 'Analytics Pipeline', type: 'external', tier: 'tier3', ownerTeam: beta._id, lifecycle: 'planned',
    description: 'Ingesta planificada al warehouse desde la cola de eventos.', dependencies: [eventsQueue._id, billingSvc._id],
  });

  /* ── Projects ──────────────────────────────────────── */
  const projects = await ProjectModel.create([
    { name: 'Billing v2', key: 'BILL', status: 'active', priority: 'high', investmentCategory: 'new_value', team: beta._id, owner: carlos._id, progress: 55, roadmapHealth: 'at_risk', targetDate: days(-30) },
    { name: 'Failover multi-región', key: 'MRF', status: 'active', priority: 'critical', investmentCategory: 'new_value', team: alpha._id, owner: santiago._id, progress: 30, roadmapHealth: 'off_track', targetDate: days(-60) },
    { name: 'Sistema de diseño', key: 'DS', status: 'active', priority: 'medium', investmentCategory: 'new_value', team: beta._id, owner: kuljit._id, progress: 80, roadmapHealth: 'on_track', targetDate: days(-45) },
    { name: 'Soporte y mantenimiento de plataforma', key: 'KTLO', status: 'active', priority: 'medium', investmentCategory: 'ktlo', team: alpha._id, owner: santiago._id, progress: 45, roadmapHealth: 'on_track' },
  ]);

  /* ── Incidents ─────────────────────────────────────── */
  const incidents = await IncidentModel.create([
    { title: 'Pico de latencia en el checkout', severity: 'SEV2', status: 'resolved', team: beta._id, commander: carlos._id, detectedAt: days(7), resolvedAt: new Date(days(7).getTime() + 90 * 60000), mttrMinutes: 90, affectedUsers: 1200 },
    { title: 'Caída del servicio de autenticación', severity: 'SEV1', status: 'monitoring', team: alpha._id, commander: santiago._id, detectedAt: days(2), affectedUsers: 8000 },
  ]);

  /* ── Tech debt ─────────────────────────────────────── */
  const techDebt = await TechDebtModel.create([
    { title: 'Remover el shim de auth legacy', category: 'security', status: 'in_progress', team: alpha._id, owner: romerd._id, impactScore: 8, riskScore: 9, effortScore: 4 },
    { title: 'Aumentar la cobertura de tests en facturación', category: 'testing', status: 'in_progress', team: beta._id, owner: cervi._id, impactScore: 7, riskScore: 6, effortScore: 3 },
    { title: 'Migrar a configuración tipada', category: 'code_quality', team: alpha._id, owner: victor._id, impactScore: 5, riskScore: 4, effortScore: 8 },
  ]);

  /* ── Headcount & hiring pipeline ───────────────────── */
  await PositionModel.create([
    { title: 'Ingeniero Backend Senior', team: alpha._id, seniority: 'senior', status: 'interviewing', budgetedMonthlyCost: 11000, openedAt: days(40), pipeline: [{ name: 'Aisha Khan', stage: 'onsite' }, { name: 'Marco Rossi', stage: 'screen' }, { name: 'Wei Chen', stage: 'applied' }] },
    { title: 'Ingeniero Frontend', team: beta._id, seniority: 'mid', status: 'open', budgetedMonthlyCost: 8000, openedAt: days(15), pipeline: [{ name: 'Lucia Fernández', stage: 'applied' }] },
    { title: 'SRE / Ingeniero de Plataforma', team: beta._id, seniority: 'senior', status: 'offer', budgetedMonthlyCost: 12000, openedAt: days(55), pipeline: [{ name: 'Tom Becker', stage: 'offer' }, { name: 'Nadia Petrova', stage: 'rejected' }] },
    { title: 'Ingeniero de Automatización QA', team: alpha._id, seniority: 'mid', status: 'filled', budgetedMonthlyCost: 7000, openedAt: days(90), filledAt: days(35), filledBy: cervi._id },
    { title: 'Engineering Manager', team: beta._id, seniority: 'staff', status: 'planned', budgetedMonthlyCost: 14000, targetStartDate: days(-90) },
  ]);

  /* ── Skill catalog (org-wide skill definitions) ─────── */
  await SkillCatalogModel.create([
    { name: 'TypeScript', category: 'language', description: 'Lenguaje principal de backend y frontend.' },
    { name: 'Go', category: 'language', description: 'Servicios de plataforma de alto rendimiento.' },
    { name: 'React', category: 'framework', description: 'Framework de UI para las apps de cara al cliente.' },
    { name: 'Node.js', category: 'platform', description: 'Runtime de los servicios de backend.' },
    { name: 'PostgreSQL', category: 'platform', description: 'Base de datos relacional primaria.' },
    { name: 'Kubernetes', category: 'platform', description: 'Orquestación de contenedores.' },
    { name: 'AWS', category: 'platform', description: 'Proveedor cloud principal.' },
    { name: 'Diseño de Sistemas', category: 'domain', description: 'Arquitectura de sistemas distribuidos.' },
    { name: 'Automatización de Pruebas', category: 'tooling', description: 'Frameworks de testing automatizado.' },
  ]);

  /* ── Skills matrix (note the single-expert bus factors) ── */
  await SkillModel.create([
    { user: kuljit._id, skill: 'Kubernetes', category: 'platform', level: 5, interest: 4 },
    { user: kuljit._id, skill: 'Diseño de Sistemas', category: 'domain', level: 5, interest: 5 },
    { user: santiago._id, skill: 'TypeScript', category: 'language', level: 5, interest: 4 },
    { user: carlos._id, skill: 'TypeScript', category: 'language', level: 4, interest: 4 },
    { user: romerd._id, skill: 'TypeScript', category: 'language', level: 4, interest: 3 },
    { user: victor._id, skill: 'React', category: 'framework', level: 4, interest: 5 },
    { user: olavo._id, skill: 'React', category: 'framework', level: 3, interest: 4 },
    { user: cutri._id, skill: 'Node.js', category: 'platform', level: 4, interest: 4 },
    { user: daniel._id, skill: 'PostgreSQL', category: 'platform', level: 3, interest: 3 },
    { user: pratik._id, skill: 'Go', category: 'language', level: 2, interest: 5 },
    { user: fabiano._id, skill: 'AWS', category: 'platform', level: 3, interest: 4 },
    { user: cervi._id, skill: 'Automatización de Pruebas', category: 'tooling', level: 4, interest: 5 },
  ]);

  /* ── OKRs (2026-Q2) ────────────────────────────────── */
  await ObjectiveModel.create([
    {
      title: 'Lanzar Billing v2 a GA',
      level: 'company',
      quarter: '2026-Q2',
      owner: javier._id,
      team: beta._id,
      linkedProjects: [projects[0]._id],
      keyResults: [
        { title: 'Rollout de Billing v2 a todos los clientes', metricType: 'percent', startValue: 0, targetValue: 100, currentValue: 55, confidence: 60 },
        { title: 'Tasa de éxito de pagos', metricType: 'percent', startValue: 97, targetValue: 99.5, currentValue: 98.2, confidence: 75 },
      ],
    },
    {
      title: 'Fortalecer la fiabilidad de la plataforma',
      level: 'team',
      quarter: '2026-Q2',
      owner: santiago._id,
      team: alpha._id,
      linkedProjects: [projects[1]._id],
      keyResults: [
        { title: 'Reducir incidentes P1 por trimestre', metricType: 'number', startValue: 8, targetValue: 2, currentValue: 5, confidence: 50 },
        { title: 'MTTR por debajo de 30 minutos', metricType: 'number', startValue: 90, targetValue: 30, currentValue: 60, confidence: 45 },
      ],
    },
    {
      title: 'Mejorar la experiencia de desarrollo',
      level: 'team',
      quarter: '2026-Q2',
      owner: carlos._id,
      team: beta._id,
      linkedProjects: [projects[2]._id],
      keyResults: [
        { title: 'Deploys por día', metricType: 'number', startValue: 1, targetValue: 4, currentValue: 3, confidence: 80 },
        { title: 'Pipeline de CI en menos de 10 minutos', metricType: 'boolean', targetValue: 1, currentValue: 1, confidence: 90 },
      ],
    },
  ]);

  /* ── 1:1s (rich: feedback, growth, goals, action items) ── */
  await OneOnOneModel.create([
    {
      manager: javier._id, report: santiago._id, date: days(6), mood: 'good',
      notes: 'Revisamos el push de fiabilidad de Squad Alpha. Mateo está motivado pero sobrecargado entre la guardia y MRF.',
      privateNotes: 'Fuerte candidato a promoción a EM en 2 trimestres. Atención al burnout por la guardia.',
      feedback: { strengths: 'Excelente liderazgo técnico y calma en los incidentes.', improvements: 'Delegar más la rotación de guardia para hacer crecer al equipo.' },
      careerGrowth: { currentLevel: 'Staff / Tech Lead', targetLevel: 'Engineering Manager', plan: 'Acompañar a Javier en las rondas de contratación y la planificación trimestral. Liderar el próximo postmortem de punta a punta.' },
      goals: [
        { title: 'Reducir incidentes P1 de Squad Alpha a <2/trimestre', category: 'performance', status: 'in_progress' },
        { title: 'Liderar una ronda de contratación en solitario', category: 'career', status: 'not_started' },
      ],
      actionItems: [
        { title: 'Redactar la propuesta de rotación de guardia', owner: 'report', done: true },
        { title: 'Compartir el risk register de MRF con Javier', owner: 'report', done: false },
        { title: 'Agendar skip-level con Joaquín', owner: 'manager', done: false },
      ],
      nextMeetingDate: days(-8),
    },
    {
      manager: javier._id, report: carlos._id, date: days(5), mood: 'neutral',
      notes: 'El timeline de Billing v2 está ajustado. A Tomás le preocupa la moral de Squad Beta y la carga de guardia.',
      privateNotes: 'La moral de Beta está bajando — atención a las señales de rotación.',
      feedback: { strengths: 'Gran sentido de producto y comunicación con stakeholders.', improvements: 'Plantear objeciones más temprano ante deadlines poco realistas.' },
      careerGrowth: { currentLevel: 'Staff / Tech Lead', targetLevel: 'Senior Staff', plan: 'Ser dueño del architecture review de Billing v2 y mentorear a dos ingenieros semi-senior.' },
      goals: [
        { title: 'Lanzar Billing v2 a GA', category: 'project', status: 'in_progress' },
        { title: 'Subir la señal de moral de Squad Beta a 70+', category: 'performance', status: 'in_progress' },
      ],
      actionItems: [
        { title: 'Re-dimensionar los hitos de Billing v2 con el PO', owner: 'report', done: false },
        { title: 'Aprobar 1 req extra de SRE para Beta', owner: 'manager', done: true },
      ],
      nextMeetingDate: days(-9),
    },
    {
      manager: santiago._id, report: romerd._id, date: days(3), mood: 'great',
      notes: 'Joaquín la está rompiendo con la remoción del auth shim. Listo para más ownership arquitectónico.',
      feedback: { strengths: 'Profundo expertise en backend, entrega confiable.', improvements: 'Documentar más las decisiones para el equipo.' },
      careerGrowth: { currentLevel: 'Senior', targetLevel: 'Staff', plan: 'Liderar la migración a configuración tipada como iniciativa de nivel staff.' },
      goals: [{ title: 'Remover el shim de auth legacy', category: 'project', status: 'in_progress' }],
      actionItems: [{ title: 'Escribir el ADR de los cambios de auth', owner: 'report', done: false }],
      nextMeetingDate: days(-11),
    },
    {
      manager: carlos._id, report: olavo._id, date: days(2), mood: 'concerned',
      notes: 'Tobías se siente sobrecargado con el trabajo de front-end y sin claridad sobre su camino de crecimiento.',
      privateNotes: 'Riesgo de fuga — abordar el plan de crecimiento y la carga este mes.',
      feedback: { strengths: 'Sólidas skills de React, buen ojo para UX.', improvements: 'Comunicar los bloqueos antes.' },
      careerGrowth: { currentLevel: 'Mid', targetLevel: 'Senior', plan: 'Definir un checklist claro de track senior y hacer pairing en diseño de sistemas.' },
      goals: [{ title: 'Ser dueño de la librería de componentes del sistema de diseño', category: 'skill', status: 'not_started' }],
      actionItems: [
        { title: 'Rebalancear la carga de Tobías', owner: 'manager', done: false },
        { title: 'Redactar el checklist de track senior', owner: 'manager', done: false },
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

  /* ── Engagement pulse (eNPS) — dos períodos, ambos equipos ─── */
  // r = recommend (0-10); d = [workload, clarity, growth, management] (1-10).
  const pulse = (team: typeof alpha, period: string, r: number, d: [number, number, number, number], comment?: string) => ({
    team: team._id,
    period,
    recommendScore: r,
    dimensions: { workload: d[0], clarity: d[1], growth: d[2], management: d[3] },
    comment,
  });
  await PulseResponseModel.insertMany([
    // Mayo 2026
    pulse(alpha, '2026-05', 9, [6, 8, 7, 9], 'El on-call pesa, pero el equipo está alineado.'),
    pulse(alpha, '2026-05', 7, [5, 7, 6, 8]),
    pulse(alpha, '2026-05', 5, [4, 6, 5, 7], 'Demasiado contexto cambiando de sprint a sprint.'),
    pulse(beta, '2026-05', 10, [7, 9, 8, 9], 'Muy buen momento del equipo.'),
    pulse(beta, '2026-05', 8, [6, 8, 7, 8]),
    pulse(beta, '2026-05', 6, [5, 6, 5, 6]),
    // Junio 2026
    pulse(alpha, '2026-06', 9, [7, 8, 8, 9]),
    pulse(alpha, '2026-06', 8, [6, 8, 7, 8], 'Mejoró la carga desde que sumamos a alguien al on-call.'),
    pulse(alpha, '2026-06', 6, [5, 7, 6, 7]),
    pulse(beta, '2026-06', 10, [8, 9, 8, 9]),
    pulse(beta, '2026-06', 9, [7, 9, 8, 9], 'Claridad de objetivos muy alta este mes.'),
    pulse(beta, '2026-06', 7, [6, 7, 6, 8]),
  ]);

  logger.info(`✅ Seed complete. Login: ${admin.email} / ${PW}`);
  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
