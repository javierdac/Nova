import { complete } from './openai.client.js';
import { dashboardService } from '../dashboard/dashboard.service.js';
import { teamService } from '../teams/team.service.js';
import { TeamModel } from '../teams/team.model.js';
import { IncidentModel } from '../incidents/incident.model.js';
import { TechDebtModel } from '../techDebt/techDebt.model.js';
import { OneOnOneModel } from '../oneOnOnes/oneOnOne.model.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

const SYSTEM =
  'Sos Nova, un asistente de inteligencia de ingeniería para CTOs y Heads de Ingeniería. ' +
  'Sé conciso, específico y accionable. Preferí bullets y resaltá los riesgos explícitamente. Respondé siempre en español.';

class AIService {
  /** Weekly executive summary across roadmap, deployments and incidents. */
  async weeklyExecutiveSummary(teamId?: string) {
    const summary = await dashboardService.executiveSummary(teamId);
    const prompt = `Escribí un resumen ejecutivo semanal para el liderazgo de ingeniería en base a estas métricas:\n${JSON.stringify(
      summary,
      null,
      2,
    )}\nIncluí: highlights, riesgos y 3 focos recomendados. Respondé en español.`;

    return complete(SYSTEM, prompt, () => {
      const r = summary;
      return [
        `**Resumen Semanal de Ingeniería**`,
        `- Salud del roadmap: ${r.roadmapHealth.score}% en rumbo (${r.roadmapHealth.at_risk} en riesgo, ${r.roadmapHealth.off_track} fuera de rumbo).`,
        `- Salud de equipos: ${r.teamHealth.score}/100 en ${r.teamHealth.teams} equipos.`,
        `- Deploys (30d): ${r.deploymentMetrics.deployments30d}, lead time ${r.deploymentMetrics.avgLeadTimeHours}h, CFR ${r.deploymentMetrics.changeFailureRate}%.`,
        `- Incidentes (30d): ${r.incidentMetrics.total30d} en total, ${r.incidentMetrics.sev1} SEV1, MTTR ${r.incidentMetrics.avgMttrMinutes}m.`,
        `- Riesgo técnico: ${r.technicalRisks.openItems} ítems de deuda abiertos (${r.technicalRisks.highRisk} de alto riesgo).`,
        ``,
        `**Foco recomendado:** ${
          r.technicalRisks.highRisk > 0 ? 'reducir deuda técnica de alto riesgo; ' : ''
        }${r.incidentMetrics.sev1 > 0 ? 'revisar postmortems de SEV1; ' : ''}mejorar el lead time.`,
      ].join('\n');
    }).then((res) => ({ ...res, metrics: summary }));
  }

  /** Risk analysis for a single team from its health signals + workload. */
  async teamRiskAnalysis(teamId: string) {
    const team = await TeamModel.findById(teamId).lean();
    if (!team) throw new NotFoundError('Team');

    const [capacity, openIncidents, debt] = await Promise.all([
      teamService.computeCapacity(teamId),
      IncidentModel.countDocuments({ team: teamId, status: { $ne: 'resolved' } }),
      TechDebtModel.countDocuments({ team: teamId, status: { $nin: ['resolved', 'wont_fix'] } }),
    ]);
    const health = teamService.computeHealthScore(team.signals as never);

    const prompt = `Analizá los riesgos del equipo "${team.name}". Score de salud ${health.score} (${health.band}). Señales: ${JSON.stringify(
      team.signals,
    )}. Capacidad: ${capacity.availableHours}/${capacity.totalHours}h disponibles (${capacity.onPtoCount} en licencia). Incidentes abiertos: ${openIncidents}. Deuda técnica abierta: ${debt}. Dame una lista de riesgos priorizada con mitigaciones. Respondé en español.`;

    return complete(SYSTEM, prompt, () => {
      const risks: string[] = [];
      if (health.band !== 'healthy') risks.push(`- La salud del equipo es ${health.band} (${health.score}/100).`);
      if (capacity.availableHours < capacity.totalHours * 0.7)
        risks.push(`- Capacidad ajustada: solo ${capacity.availableHours}/${capacity.totalHours}h disponibles.`);
      if (openIncidents > 2) risks.push(`- Alta carga de incidentes abiertos (${openIncidents}).`);
      if (debt > 5) risks.push(`- Backlog de deuda técnica significativo (${debt} ítems).`);
      return risks.length
        ? `**Análisis de riesgo — ${team.name}**\n${risks.join('\n')}\n\nMitigaciones: rebalancear carga, agendar sprint de reducción de deuda, revisar rotación de guardia.`
        : `**Análisis de riesgo — ${team.name}**\nNo se detectaron riesgos materiales. El equipo está saludable.`;
    }).then((res) => ({ ...res, context: { health, capacity, openIncidents, debt } }));
  }

  /** Burnout detection from 1:1 moods and capacity over time. */
  async burnoutDetection(teamId?: string) {
    const match = teamId ? { team: teamId } : {};
    const recentMoods = await OneOnOneModel.aggregate([
      { $match: { date: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$report', moods: { $push: '$mood' }, count: { $sum: 1 } } },
    ]);
    const teams = await TeamModel.find(match).select('name signals').lean();

    const signals = {
      atRiskTeams: teams.filter((t) => (t.signals as { onCallLoad?: number })?.onCallLoad ?? 0 > 60).map((t) => t.name),
      concerningReports: recentMoods
        .filter((m) => (m.moods as string[]).filter((x) => x === 'at_risk' || x === 'concerned').length >= 2)
        .map((m) => String(m._id)),
    };

    const prompt = `Detectá riesgo de burnout. Equipos con alta carga de guardia: ${JSON.stringify(
      signals.atRiskTeams,
    )}. Reportes con ánimo preocupado/en riesgo repetido en 1:1: ${signals.concerningReports.length}. Recomendá intervenciones. Respondé en español.`;

    return complete(SYSTEM, prompt, () => {
      return [
        `**Señales de burnout**`,
        `- Equipos con alta carga de guardia: ${signals.atRiskTeams.length ? signals.atRiskTeams.join(', ') : 'ninguno'}.`,
        `- Reportes con ánimo preocupado/en riesgo en 1:1 recientes: ${signals.concerningReports.length}.`,
        ``,
        signals.concerningReports.length
          ? `**Acción:** agendar check-ins, redistribuir la guardia y considerar tiempo de recuperación.`
          : `**Acción:** sin señales agudas de burnout; seguir monitoreando el sentimiento de los 1:1.`,
      ].join('\n');
    }).then((res) => ({ ...res, signals }));
  }

  /** Recommendations for prioritizing the technical-debt backlog. */
  async techDebtRecommendations(teamId?: string) {
    const matrix = await techDebtMatrix(teamId);
    const prompt = `Dada esta matriz de priorización de deuda técnica, recomendá los 5 ítems principales a encarar el próximo trimestre con su justificación:\n${JSON.stringify(
      matrix,
      null,
      2,
    )}\nRespondé en español.`;
    return complete(SYSTEM, prompt, () => {
      const wins = matrix.quadrants.quick_win.slice(0, 5);
      return [
        `**Recomendaciones de deuda técnica**`,
        wins.length
          ? wins.map((w, i) => `${i + 1}. ${w.title} (prioridad ${w.priorityScore}, riesgo ${w.riskScore}/10) — quick win.`).join('\n')
          : 'Sin quick wins; enfocarse en los proyectos mayores de más alta prioridad.',
        ``,
        `Encarar primero los quick wins para ganar impulso, luego agendar el proyecto mayor principal.`,
      ].join('\n');
    }).then((res) => ({ ...res, matrix }));
  }

  /** Roadmap risk prediction from project status + capacity. */
  async roadmapRiskPrediction() {
    const summary = await dashboardService.executiveSummary();
    const prompt = `Predecí el riesgo de entrega del roadmap para el próximo trimestre a partir de: ${JSON.stringify(
      summary.roadmapHealth,
    )} y la salud de equipos ${summary.teamHealth.score}. Listá los proyectos/áreas con más probabilidad de atrasarse y por qué. Respondé en español.`;
    return complete(SYSTEM, prompt, () => {
      const r = summary.roadmapHealth;
      const level = r.healthPct >= 75 ? 'BAJO' : r.healthPct >= 50 ? 'MEDIO' : 'ALTO';
      return `**Riesgo del roadmap: ${level}**\n- ${r.off_track} proyectos fuera de rumbo, ${r.at_risk} en riesgo de ${r.total}.\n- Salud de equipos ${summary.teamHealth.score}/100.\n\nEnfocar la mitigación en el trabajo fuera de rumbo y proteger la capacidad del desgaste por incidentes.`;
    }).then((res) => ({ ...res, roadmap: summary.roadmapHealth }));
  }

  /** Full engineering health report (composite). */
  async engineeringHealthReport(teamId?: string) {
    const [summary, trends] = await Promise.all([
      dashboardService.executiveSummary(teamId),
      dashboardService.trends(teamId, 90),
    ]);
    const prompt = `Producí un reporte de salud de ingeniería a partir de las métricas ${JSON.stringify(
      summary,
    )} y las direcciones de tendencia de 90 días. Cubrí entrega, fiabilidad, personas y salud técnica con una nota (A-F) por área. Respondé en español.`;
    return complete(SYSTEM, prompt, () => {
      const grade = (pct: number) => (pct >= 85 ? 'A' : pct >= 70 ? 'B' : pct >= 55 ? 'C' : pct >= 40 ? 'D' : 'F');
      return [
        `**Reporte de Salud de Ingeniería**`,
        `- Entrega: ${grade(summary.roadmapHealth.score)} (roadmap ${summary.roadmapHealth.score}%).`,
        `- Fiabilidad: ${grade(100 - Math.min(100, summary.incidentMetrics.sev1 * 20))} (${summary.incidentMetrics.sev1} SEV1, MTTR ${summary.incidentMetrics.avgMttrMinutes}m).`,
        `- Personas: ${grade(summary.teamHealth.score)} (salud de equipos ${summary.teamHealth.score}/100).`,
        `- Técnico: ${grade(100 - Math.min(100, summary.technicalRisks.highRisk * 15))} (${summary.technicalRisks.openItems} ítems de deuda).`,
      ].join('\n');
    }).then((res) => ({ ...res, metrics: summary, trends }));
  }
}

// Local helper to avoid a circular import with the techDebt service.
async function techDebtMatrix(teamId?: string) {
  const { techDebtService } = await import('../techDebt/techDebt.service.js');
  return techDebtService.prioritizationMatrix(teamId);
}

export const aiService = new AIService();
