import { dashboardService } from '../dashboard/dashboard.service.js';
import { orgService } from '../org/org.service.js';
import { financeService } from '../finance/finance.service.js';
import { investmentService } from '../investment/investment.service.js';

/**
 * Weekly Brief / Action Center.
 *
 * The Head of Engineering doesn't want to hunt across ten dashboards — they want
 * to be told what needs attention. This pulls anomalies from every domain Nova
 * already tracks (reliability, delivery, people, cost) into one prioritized list
 * plus a one-line headline. Purely derived; no new data to enter.
 */

export type Severity = 'high' | 'medium' | 'low';
export type Domain = 'reliability' | 'delivery' | 'people' | 'cost';

export interface BriefItem {
  domain: Domain;
  severity: Severity;
  title: string;
  detail: string;
}

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export interface BriefInputs {
  summary: {
    incidentMetrics: { sev1: number; open: number; avgMttrMinutes: number };
    deploymentMetrics: { changeFailureRate: number };
    roadmapHealth: { off_track: number; at_risk: number };
    technicalRisks: { highRisk: number };
  };
  attrition: { summary: { high: number; medium: number }; people: { band: string; name: string }[] };
  cloud: { alerts: { message: string }[] };
  investment: { categories: { category: string; pct: number }[] };
}

/** Pure: turns the four domain snapshots into a prioritized brief. */
export function buildBrief({ summary, attrition, cloud, investment }: BriefInputs) {
  const items: BriefItem[] = [];
  const push = (domain: Domain, severity: Severity, title: string, detail: string) =>
    items.push({ domain, severity, title, detail });

  /* ── Reliability ─────────────────────────────────── */
  const inc = summary.incidentMetrics;
  if (inc.sev1 > 0) push('reliability', 'high', `${inc.sev1} incidente(s) SEV1 sin resolver`, 'Severidad máxima activa — requiere foco inmediato.');
  else if (inc.open > 0) push('reliability', 'medium', `${inc.open} incidentes abiertos`, 'Hay incidentes sin resolver en los últimos 30 días.');
  if (summary.deploymentMetrics.changeFailureRate > 15)
    push('reliability', 'medium', `Change Failure Rate alto (${summary.deploymentMetrics.changeFailureRate}%)`, 'Más de 1 de cada 7 deploys falla; revisar pipeline de calidad.');
  if (inc.avgMttrMinutes > 120) push('reliability', 'medium', `MTTR alto (${inc.avgMttrMinutes} min)`, 'La recuperación promedio supera las 2 horas.');

  /* ── Delivery ────────────────────────────────────── */
  const rm = summary.roadmapHealth;
  if (rm.off_track > 0) push('delivery', 'high', `${rm.off_track} proyecto(s) fuera de rumbo`, 'Roadmap en rojo — riesgo de incumplir compromisos.');
  else if (rm.at_risk > 0) push('delivery', 'medium', `${rm.at_risk} proyecto(s) en riesgo`, 'Salud de roadmap en amarillo; vale un check-in.');
  if (summary.technicalRisks.highRisk > 0)
    push('delivery', 'medium', `${summary.technicalRisks.highRisk} ítems de deuda técnica de alto riesgo`, 'Deuda con riesgo ≥ 8/10 acumulándose.');

  /* ── People ──────────────────────────────────────── */
  if (attrition.summary.high > 0) {
    const names = attrition.people.filter((p) => p.band === 'high').slice(0, 3).map((p) => p.name).join(', ');
    push('people', 'high', `${attrition.summary.high} persona(s) con riesgo de fuga alto`, names ? `Mayor riesgo: ${names}.` : 'Revisar señales de equipo y 1:1s.');
  } else if (attrition.summary.medium > 0) {
    push('people', 'low', `${attrition.summary.medium} persona(s) con riesgo de fuga medio`, 'Monitorear; aún no es crítico.');
  }

  /* ── Cost ────────────────────────────────────────── */
  for (const alert of cloud.alerts) push('cost', 'medium', 'Crecimiento de costo de nube', alert.message);
  const incidentSlice = investment.categories.find((c) => c.category === 'incidents');
  if (incidentSlice && incidentSlice.pct >= 15)
    push('cost', 'medium', `Incidentes consumen ${incidentSlice.pct}% de la capacidad`, 'Parte grande del esfuerzo va a no planificado.');

  items.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  const summaryCounts = {
    high: items.filter((i) => i.severity === 'high').length,
    medium: items.filter((i) => i.severity === 'medium').length,
    low: items.filter((i) => i.severity === 'low').length,
    total: items.length,
  };

  let headline: string;
  if (summaryCounts.total === 0) headline = 'Sin alertas: todos los indicadores en verde esta semana.';
  else if (summaryCounts.high > 0) headline = `${summaryCounts.high} tema(s) urgente(s) y ${summaryCounts.medium} a vigilar esta semana.`;
  else headline = `Sin urgencias; ${summaryCounts.medium + summaryCounts.low} tema(s) a vigilar esta semana.`;

  return { summary: summaryCounts, headline, items };
}

class BriefService {
  async weekly(teamId?: string) {
    const [summary, attrition, cloud, investment] = await Promise.all([
      dashboardService.executiveSummary(teamId),
      orgService.attritionRisk(),
      financeService.cloudAnalytics(),
      investmentService.allocation({ teamId }),
    ]);
    return buildBrief({ summary, attrition, cloud, investment });
  }
}

export const briefService = new BriefService();
