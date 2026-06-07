import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { BrandSplash } from '@/components/shared/Logo';

// Code-split every page for a fast initial load.
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Teams = lazy(() => import('@/pages/Teams'));
const Users = lazy(() => import('@/pages/Users'));
const Projects = lazy(() => import('@/pages/Projects'));
const Incidents = lazy(() => import('@/pages/Incidents'));
const TechDebt = lazy(() => import('@/pages/TechDebt'));
const Architecture = lazy(() => import('@/pages/Architecture'));
const OneOnOnes = lazy(() => import('@/pages/OneOnOnes'));
const AIInsights = lazy(() => import('@/pages/AIInsights'));
const Settings = lazy(() => import('@/pages/Settings'));
const Integrations = lazy(() => import('@/pages/Integrations'));
const Brief = lazy(() => import('@/pages/Brief'));
const Scorecard = lazy(() => import('@/pages/Scorecard'));
const Engagement = lazy(() => import('@/pages/Engagement'));

// People & Org module
const PeopleDashboard = lazy(() => import('@/pages/org/PeopleDashboard'));
const Headcount = lazy(() => import('@/pages/org/Headcount'));
const SkillsMatrix = lazy(() => import('@/pages/org/SkillsMatrix'));
const Retention = lazy(() => import('@/pages/org/Retention'));

// Delivery (OKRs & forecast) module
const OKRsBoard = lazy(() => import('@/pages/okrs/OKRsBoard'));
const DeliveryForecast = lazy(() => import('@/pages/okrs/DeliveryForecast'));
const Investment = lazy(() => import('@/pages/Investment'));

// Finance module
const FinanceDashboard = lazy(() => import('@/pages/finance/FinanceDashboard'));
const CloudCosts = lazy(() => import('@/pages/finance/CloudCosts'));
const SaaSCosts = lazy(() => import('@/pages/finance/SaaSCosts'));
const TeamCosts = lazy(() => import('@/pages/finance/TeamCosts'));
const ProductCosts = lazy(() => import('@/pages/finance/ProductCosts'));
const TechDebtCosts = lazy(() => import('@/pages/finance/TechDebtCosts'));
const IncidentCosts = lazy(() => import('@/pages/finance/IncidentCosts'));
const CostOfDelay = lazy(() => import('@/pages/finance/CostOfDelay'));
const HiringROI = lazy(() => import('@/pages/finance/HiringROI'));
const CostAdvisor = lazy(() => import('@/pages/finance/CostAdvisor'));
const ExecutiveReports = lazy(() => import('@/pages/finance/ExecutiveReports'));

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/brief', element: <Brief /> },
          { path: '/scorecard', element: <Scorecard /> },
          { path: '/teams', element: <Teams /> },
          { path: '/users', element: <Users /> },
          { path: '/projects', element: <Projects /> },
          { path: '/incidents', element: <Incidents /> },
          { path: '/tech-debt', element: <TechDebt /> },
          { path: '/architecture', element: <Architecture /> },
          { path: '/one-on-ones', element: <OneOnOnes /> },
          { path: '/ai-insights', element: <AIInsights /> },
          { path: '/settings', element: <Settings /> },
          { path: '/integrations', element: <Integrations /> },
          // People & Org
          { path: '/org', element: <PeopleDashboard /> },
          { path: '/org/headcount', element: <Headcount /> },
          { path: '/org/skills', element: <SkillsMatrix /> },
          { path: '/org/retention', element: <Retention /> },
          { path: '/org/engagement', element: <Engagement /> },
          // Delivery
          { path: '/okrs', element: <OKRsBoard /> },
          { path: '/okrs/forecast', element: <DeliveryForecast /> },
          { path: '/investment', element: <Investment /> },
          // Finance & Cost Intelligence
          { path: '/finance', element: <FinanceDashboard /> },
          { path: '/finance/cloud', element: <CloudCosts /> },
          { path: '/finance/saas', element: <SaaSCosts /> },
          { path: '/finance/teams', element: <TeamCosts /> },
          { path: '/finance/products', element: <ProductCosts /> },
          { path: '/finance/tech-debt', element: <TechDebtCosts /> },
          { path: '/finance/incidents', element: <IncidentCosts /> },
          { path: '/finance/cost-of-delay', element: <CostOfDelay /> },
          { path: '/finance/hiring-roi', element: <HiringROI /> },
          { path: '/finance/advisor', element: <CostAdvisor /> },
          { path: '/finance/reports', element: <ExecutiveReports /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default function App() {
  return (
    <Suspense fallback={<BrandSplash label="Cargando Nova…" />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
