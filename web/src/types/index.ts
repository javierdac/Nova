export type Role =
  | 'admin'
  | 'cto'
  | 'head_of_engineering'
  | 'engineering_manager'
  | 'engineer'
  | 'viewer';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  title?: string;
  team?: string;
  manager?: string;
  seniority?: string;
  timezone?: string;
  weeklyCapacityHours?: number;
  isActive?: boolean;
  avatarUrl?: string;
  createdAt?: string;
}

export interface Team {
  _id: string;
  name: string;
  description?: string;
  mission?: string;
  lead?: User | string;
  members?: User[] | string[];
  signals?: { morale: number; velocityConfidence: number; onCallLoad: number; attrition: number };
  healthScore?: number;
  healthBand?: 'healthy' | 'at_risk' | 'critical';
  capacity?: { totalHours: number; availableHours: number; onPtoCount: number };
  pto?: Array<{ _id: string; user: string; startDate: string; endDate: string; type: string; note?: string }>;
  isActive?: boolean;
}

export interface Project {
  _id: string;
  name: string;
  key?: string;
  description?: string;
  status: string;
  priority: string;
  investmentCategory?: 'new_value' | 'ktlo';
  team?: { name: string } | string;
  owner?: { name: string } | string;
  progress: number;
  roadmapHealth: 'on_track' | 'at_risk' | 'off_track';
  targetDate?: string;
  milestones?: Array<{ _id: string; title: string; status: string; dueDate?: string }>;
}

export interface Incident {
  _id: string;
  title: string;
  description?: string;
  severity: 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
  status: string;
  detectedAt: string;
  resolvedAt?: string;
  mttrMinutes?: number;
  affectedUsers?: number;
  commander?: { name: string } | string;
  team?: { name: string } | string;
  timeline?: Array<{ _id: string; at: string; type: string; message: string }>;
  postmortem?: Record<string, unknown>;
}

export interface TechDebt {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  impactScore: number;
  riskScore: number;
  effortScore: number;
  priorityScore: number;
  quadrant: 'quick_win' | 'major_project' | 'fill_in' | 'thankless';
}

export interface ArchitectureComponent {
  _id: string;
  name: string;
  type: string;
  lifecycle: string;
  tier: string;
  language?: string;
  description?: string;
  repoUrl?: string;
  docsUrl?: string;
  runbookUrl?: string;
  ownerTeam?: { _id?: string; name: string } | string;
  dependencies?: Array<{ _id?: string; name: string; type: string } | string>;
  apiSpec?: { protocol?: string; version?: string; baseUrl?: string };
  dbSpec?: { engine?: string; version?: string; multiTenant?: boolean };
  tags?: string[];
}

export interface ArchitectureGraph {
  nodes: Array<{ id: string; name: string; type: string; lifecycle: string; tier: string }>;
  edges: Array<{ from: string; to: string }>;
}

export interface OneOnOneGoal {
  _id?: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'achieved' | 'dropped';
  category: 'performance' | 'career' | 'skill' | 'project';
  dueDate?: string;
}

export interface OneOnOneActionItem {
  _id?: string;
  title: string;
  owner: 'manager' | 'report';
  done: boolean;
}

export interface OneOnOne {
  _id: string;
  manager: { _id?: string; name: string } | string;
  report: { _id?: string; name: string } | string;
  date: string;
  notes?: string;
  privateNotes?: string;
  mood?: string;
  feedback?: { strengths?: string; improvements?: string };
  careerGrowth?: { currentLevel?: string; targetLevel?: string; plan?: string };
  goals?: OneOnOneGoal[];
  actionItems?: OneOnOneActionItem[];
  nextMeetingDate?: string;
}

export interface ExecutiveSummary {
  roadmapHealth: { score: number; on_track: number; at_risk: number; off_track: number; total: number };
  teamHealth: { score: number; teams: number };
  technicalRisks: { openItems: number; highRisk: number; avgRiskScore: number };
  deploymentMetrics: { deployments30d: number; avgLeadTimeHours: number; changeFailureRate: number };
  incidentMetrics: { total30d: number; open: number; sev1: number; avgMttrMinutes: number };
}

export interface Trends {
  leadTime: Array<{ date: string; value: number }>;
  deploymentFrequency: Array<{ date: string; value: number }>;
  incidentTrend: Array<{ date: string; count: number; sev1: number }>;
  teamCapacity: Array<{ date: string; available: number; committed: number }>;
}

export interface AIResult {
  content: string;
  model: string;
  source: 'openai' | 'fallback';
  [key: string]: unknown;
}

/* ── People & Org ──────────────────────────────────────── */
export interface Candidate {
  _id?: string;
  name: string;
  stage: 'applied' | 'screen' | 'onsite' | 'offer' | 'hired' | 'rejected';
  appliedAt?: string;
  note?: string;
}

export interface Position {
  _id: string;
  title: string;
  team?: string;
  seniority?: string;
  status: 'planned' | 'open' | 'interviewing' | 'offer' | 'filled' | 'frozen';
  budgetedMonthlyCost?: number;
  openedAt?: string;
  targetStartDate?: string;
  filledAt?: string;
  filledBy?: string;
  pipeline?: Candidate[];
  notes?: string;
}

export interface Skill {
  _id: string;
  user: string;
  skill: string;
  category: string;
  level: number;
  interest: number;
}

export interface SkillCatalogItem {
  _id: string;
  name: string;
  category: string;
  description?: string;
}

export interface Headcount {
  byTeam: Array<{ teamId: string; team: string; actual: number; open: number; planned: number; openBudgetMonthly: number }>;
  totals: { actual: number; open: number; openBudgetMonthly: number };
}

export interface Funnel {
  byStage: Array<{ stage: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  avgTimeToFillDays: number;
  openReqs: number;
}

export interface SkillMatrix {
  skills: Array<{ skill: string; category: string; people: number; avgLevel: number; experts: number; busFactorRisk: boolean }>;
  busFactor: { atRiskCount: number; skills: Array<{ skill: string; experts: number }> };
}

export interface OrgChart {
  nodes: Array<{ id: string; name: string; title: string; role: string; seniority?: string; team: string | null; managerId: string | null; directReports: number }>;
  stats: { people: number; managers: number; maxSpanOfControl: number };
}

export interface AttritionRisk {
  people: Array<{ userId: string; name: string; title: string; team: string | null; seniority?: string; tenureMonths: number; riskScore: number; band: 'low' | 'medium' | 'high'; factors: string[] }>;
  summary: { high: number; medium: number; low: number };
}

/* ── OKRs & delivery forecast ──────────────────────────── */
export interface KeyResult {
  _id?: string;
  title: string;
  metricType: 'percent' | 'number' | 'currency' | 'boolean';
  startValue?: number;
  targetValue: number;
  currentValue?: number;
  confidence?: number;
  progress?: number;
}

export interface Objective {
  _id: string;
  title: string;
  description?: string;
  owner?: { name: string } | string;
  team?: { name: string } | string;
  quarter: string;
  level: 'company' | 'team';
  status: 'on_track' | 'at_risk' | 'off_track' | 'achieved';
  progress: number;
  confidence: number;
  keyResults: KeyResult[];
  linkedProjects?: Array<{ _id: string; name: string; key?: string; progress?: number } | string>;
}

export interface OkrRollup {
  overall: OkrGroup;
  company: OkrGroup;
  byTeam: Array<{ team: string } & OkrGroup>;
}
export interface OkrGroup {
  objectives: number;
  avgProgress: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  achieved: number;
}

export interface Forecast {
  projectId: string;
  name: string;
  key?: string;
  team: string | null;
  progress: number;
  remainingPct: number;
  weeklyVelocity: number;
  p50Weeks: number;
  p85Weeks: number;
  p50Date: string;
  p85Date: string;
  targetDate: string | null;
  onTimeProbability: number | null;
  band: 'likely' | 'at_risk' | 'unlikely' | 'done';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
