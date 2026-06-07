import { complete } from '../ai/openai.client.js';
import { financeService } from './finance.service.js';

const SYSTEM =
  'Sos el Asesor de Costos de Nova, un asistente de inteligencia financiera para CTOs y Heads de Ingeniería. ' +
  'Cuantificá todo en USD/mes o USD/año. Sé específico, priorizá por impacto en dólares y resaltá ahorros concretos. ' +
  'Formateá como bullets cortos y aptos para liderazgo. Respondé siempre en español.';

const usd = (n: number) => `USD ${Math.round(n).toLocaleString('en-US')}`;

class CostAdvisorService {
  /** Aggregates the full finance picture for analysis. */
  private async gatherContext() {
    const [exec, cloud, tools, incidents, debt, delay, hiring] = await Promise.all([
      financeService.executiveDashboard(),
      financeService.cloudAnalytics(),
      financeService.toolAnalytics(),
      financeService.incidentCostAnalytics(),
      financeService.techDebtCostAnalytics(),
      financeService.costOfDelayAnalytics(),
      financeService.hiringRoiAnalytics(),
    ]);
    return { exec, cloud, tools, incidents, debt, delay, hiring };
  }

  /** Savings opportunities, risk warnings, executive recommendations. */
  async advise() {
    const ctx = await this.gatherContext();
    const prompt = `Analizá estos datos de costos de ingeniería y producí: (1) oportunidades de ahorro rankeadas con estimaciones en dólares, (2) alertas de riesgo, (3) 3 recomendaciones ejecutivas. Respondé en español.\n${JSON.stringify(
      {
        totalEngineeringCost: ctx.exec.current.totalCost,
        cloudAlerts: ctx.cloud.alerts,
        wastedSaaSMonthly: ctx.tools.summary.totalWastedMonthly,
        underusedTools: ctx.tools.underused.map((t) => ({ tool: t.toolName, utilization: t.utilization, wasted: t.wastedMonthlySpend })),
        techDebtMonthlyCost: ctx.debt.totalMonthlyCost,
        incidentCost: ctx.incidents.totalCost,
        revenueAtRisk: ctx.delay.totalRevenueAtRisk,
      },
      null,
      2,
    )}`;

    return complete(SYSTEM, prompt, () => {
      const lines: string[] = ['**Análisis del Asesor de Costos**', '', '**Oportunidades de ahorro:**'];
      if (ctx.tools.summary.totalWastedMonthly > 0) {
        lines.push(
          `- Ingeniería podría ahorrar aproximadamente ${usd(ctx.tools.summary.totalWastedMonthly)}/mes (${usd(ctx.tools.summary.potentialAnnualSavings)}/año) reduciendo licencias SaaS sin usar en ${ctx.tools.summary.underusedCount} herramientas.`,
        );
      }
      const topDebt = ctx.debt.top[0];
      if (topDebt) {
        const td = topDebt as { technicalDebt?: { title?: string }; estimatedMonthlyCost?: number };
        lines.push(`- La deuda técnica "${td.technicalDebt?.title ?? 'ítem'}" está generando una pérdida de productividad estimada de ${usd(td.estimatedMonthlyCost ?? 0)}/mes.`);
      }
      lines.push('', '**Alertas de riesgo:**');
      for (const a of ctx.cloud.alerts) lines.push(`- ${a.message}.`);
      if (ctx.delay.totalRevenueAtRisk > 0) lines.push(`- ${usd(ctx.delay.totalRevenueAtRisk)} de ingresos en riesgo por iniciativas demoradas.`);
      if (ctx.incidents.totalCost > 0) lines.push(`- Los incidentes costaron un estimado de ${usd(ctx.incidents.totalCost)} hasta la fecha.`);
      lines.push('', '**Recomendaciones ejecutivas:**');
      lines.push('1. Recuperar las licencias SaaS sin uso en la próxima renovación.');
      lines.push('2. Financiar un sprint de reducción de deuda para el ítem más costoso.');
      lines.push('3. Repriorizar la iniciativa demorada más costosa.');
      return lines.join('\n');
    }).then((res) => ({ ...res, context: ctx }));
  }

  /** Weekly executive cost report. */
  async weeklyExecutiveReport() {
    const ctx = await this.gatherContext();
    const prompt = `Escribí un reporte semanal de costos ejecutivo que cubra: costo total de ingeniería, cambios de costo notables, nuevos riesgos, ahorros potenciales, impacto de incidentes y recomendaciones de contratación. Respondé en español.\n${JSON.stringify(
      {
        totalEngineeringCost: ctx.exec.current,
        cloud: ctx.cloud.byProvider,
        savings: ctx.tools.summary,
        techDebtMonthly: ctx.debt.totalMonthlyCost,
        incidents: ctx.incidents.totalCost,
        topHiringRoi: ctx.hiring.comparison.slice(0, 3),
      },
      null,
      2,
    )}`;

    return complete(SYSTEM, prompt, () => {
      const e = ctx.exec.current;
      const topHire = ctx.hiring.comparison[0];
      return [
        '**Reporte Semanal de Costos Ejecutivo**',
        '',
        `**Costo total de ingeniería:** ${usd(e.totalCost)}/mes (nómina ${usd(e.payrollCost)}, infra ${usd(e.infrastructureCost)}, SaaS ${usd(e.saasToolsCost)}, contractors ${usd(e.contractorsCost)}).`,
        `**Ahorro potencial:** ${usd(ctx.tools.summary.totalWastedMonthly)}/mes por licencias SaaS sin uso.`,
        `**Costo de deuda técnica:** ${usd(ctx.debt.totalMonthlyCost)}/mes de pérdida de productividad.`,
        `**Impacto de incidentes:** ${usd(ctx.incidents.totalCost)} de costo total estimado.`,
        `**Ingresos en riesgo:** ${usd(ctx.delay.totalRevenueAtRisk)} por iniciativas demoradas.`,
        topHire ? `**Recomendación de contratación:** "${topHire.role}" proyecta ${topHire.estimatedROI}% de ROI (${usd(topHire.estimatedRevenueImpact)} de impacto vs ${usd(topHire.annualCost)} de costo).` : '',
      ].filter(Boolean).join('\n');
    }).then((res) => ({ ...res, context: ctx }));
  }
}

export const costAdvisorService = new CostAdvisorService();
