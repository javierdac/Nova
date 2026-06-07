import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users2,
  UserCog,
  FolderKanban,
  AlertOctagon,
  Wrench,
  Boxes,
  MessagesSquare,
  Settings,
  Wallet,
  ChevronDown,
  Cloud,
  CreditCard,
  Receipt,
  PackageOpen,
  Bug,
  Clock,
  TrendingUp,
  FileText,
  UserPlus,
  GraduationCap,
  Library,
  HeartPulse,
  Target,
  LineChart,
  Network,
  Plug,
  PieChart,
  Inbox,
  Gauge,
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';

const nav = [
  { to: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/brief', key: 'nav.brief', icon: Inbox },
  { to: '/scorecard', key: 'nav.scorecard', icon: Gauge },
  { to: '/teams', key: 'nav.teams', icon: Users2 },
  { to: '/users', key: 'nav.users', icon: UserCog },
  { to: '/projects', key: 'nav.projects', icon: FolderKanban },
  { to: '/incidents', key: 'nav.incidents', icon: AlertOctagon },
  { to: '/tech-debt', key: 'nav.techDebt', icon: Wrench },
  { to: '/architecture', key: 'nav.architecture', icon: Boxes },
  { to: '/one-on-ones', key: 'nav.oneOnOnes', icon: MessagesSquare },
  // AI Insights oculto por ahora (a pedido). La ruta sigue existiendo pero no se muestra en el menú.
  // { to: '/ai-insights', key: 'nav.aiInsights', icon: Sparkles },
];

const org = [
  { to: '/org', key: 'nav.peopleDashboard', icon: Network, end: true },
  { to: '/org/headcount', key: 'nav.headcount', icon: UserPlus },
  { to: '/org/skills', key: 'nav.skills', icon: GraduationCap },
  { to: '/org/skill-catalog', key: 'nav.skillCatalog', icon: Library },
  { to: '/org/retention', key: 'nav.retention', icon: HeartPulse },
  { to: '/org/engagement', key: 'nav.engagement', icon: Smile },
];

const delivery = [
  { to: '/okrs', key: 'nav.okrs', icon: Target, end: true },
  { to: '/okrs/forecast', key: 'nav.forecast', icon: LineChart },
  { to: '/investment', key: 'nav.investment', icon: PieChart },
];

const finance = [
  { to: '/finance', key: 'nav.financeDashboard', icon: LayoutDashboard, end: true },
  { to: '/finance/cloud', key: 'nav.cloudCosts', icon: Cloud },
  { to: '/finance/saas', key: 'nav.saasCosts', icon: CreditCard },
  { to: '/finance/teams', key: 'nav.teamCosts', icon: Users2 },
  { to: '/finance/products', key: 'nav.productCosts', icon: PackageOpen },
  { to: '/finance/tech-debt', key: 'nav.techDebtCosts', icon: Receipt },
  { to: '/finance/incidents', key: 'nav.incidentCosts', icon: Bug },
  { to: '/finance/cost-of-delay', key: 'nav.costOfDelay', icon: Clock },
  { to: '/finance/hiring-roi', key: 'nav.hiringRoi', icon: TrendingUp },
  // Asesor de Costos IA oculto por ahora (a pedido). La ruta sigue activa.
  // { to: '/finance/advisor', key: 'nav.aiCostAdvisor', icon: Bot },
  { to: '/finance/reports', key: 'nav.executiveReports', icon: FileText },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  );

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  const [finOpen, setFinOpen] = useState(true);
  const [orgOpen, setOrgOpen] = useState(true);
  const [delOpen, setDelOpen] = useState(true);
  const { t } = useTranslation();
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r bg-card transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-card px-6">
        <Logo className="h-9 w-9" />
        <div>
          <p className="text-sm font-bold leading-tight">{t('brand.name')}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('brand.tagline')}</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {nav.map(({ to, key, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onNavigate} className={linkClass}>
            <Icon className="h-4 w-4" />
            {t(key)}
          </NavLink>
        ))}

        {/* People & Org section */}
        <button
          onClick={() => setOrgOpen((v) => !v)}
          className="mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <span className="flex items-center gap-3"><Users2 className="h-4 w-4" /> {t('nav.peopleOrg')}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', orgOpen && 'rotate-180')} />
        </button>
        {orgOpen && (
          <div className="ml-3 flex flex-col gap-1 border-l pl-2">
            {org.map(({ to, key, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={onNavigate} className={linkClass}>
                <Icon className="h-4 w-4" />
                {t(key)}
              </NavLink>
            ))}
          </div>
        )}

        {/* Delivery section */}
        <button
          onClick={() => setDelOpen((v) => !v)}
          className="mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <span className="flex items-center gap-3"><Target className="h-4 w-4" /> {t('nav.delivery')}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', delOpen && 'rotate-180')} />
        </button>
        {delOpen && (
          <div className="ml-3 flex flex-col gap-1 border-l pl-2">
            {delivery.map(({ to, key, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={onNavigate} className={linkClass}>
                <Icon className="h-4 w-4" />
                {t(key)}
              </NavLink>
            ))}
          </div>
        )}

        {/* Finance section */}
        <button
          onClick={() => setFinOpen((v) => !v)}
          className="mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <span className="flex items-center gap-3"><Wallet className="h-4 w-4" /> {t('nav.finance')}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', finOpen && 'rotate-180')} />
        </button>
        {finOpen && (
          <div className="ml-3 flex flex-col gap-1 border-l pl-2">
            {finance.map(({ to, key, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={onNavigate} className={linkClass}>
                <Icon className="h-4 w-4" />
                {t(key)}
              </NavLink>
            ))}
          </div>
        )}

        <NavLink to="/integrations" onClick={onNavigate} className={(s) => cn(linkClass(s), 'mt-2')}>
          <Plug className="h-4 w-4" />
          {t('nav.integrations')}
        </NavLink>
        <NavLink to="/settings" onClick={onNavigate} className={linkClass}>
          <Settings className="h-4 w-4" />
          {t('nav.settings')}
        </NavLink>
      </nav>
    </aside>
  );
}
