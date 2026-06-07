import type { Types } from 'mongoose';
import { CloudCostModel, CLOUD_PROVIDERS } from './models/cloudCost.model.js';
import { ToolCostModel } from './models/toolCost.model.js';
import { TeamCostModel } from './models/teamCost.model.js';
import { ProductCostModel } from './models/productCost.model.js';
import { TechDebtCostModel } from './models/techDebtCost.model.js';
import { IncidentCostModel } from './models/incidentCost.model.js';
import { CostOfDelayModel } from './models/costOfDelay.model.js';
import { HiringRoiModel } from './models/hiringRoi.model.js';
import { EngineeringCostModel } from './models/engineeringCost.model.js';

interface SeedRefs {
  teamIds: Types.ObjectId[];
  projectIds: Types.ObjectId[];
  techDebtIds: Types.ObjectId[];
  incidentIds: Types.ObjectId[];
  userIds: Types.ObjectId[];
  /** Locale for the few human-readable labels. Defaults to Spanish. */
  locale?: 'es' | 'en';
}

/** Localized labels used inside the finance demo data. */
const FINANCE_TEXT = {
  es: {
    computeService: 'Cómputo',
    delayFeatures: ['Lanzamiento de Billing v2', 'Failover multi-región', 'SSO empresarial'],
    hiringRoles: ['Ingeniero de Plataforma Senior', 'SRE Staff', 'Ingeniero de Producto'],
  },
  en: {
    computeService: 'Compute',
    delayFeatures: ['Billing v2 launch', 'Multi-region failover', 'Enterprise SSO'],
    hiringRoles: ['Senior Platform Engineer', 'Staff SRE', 'Product Engineer'],
  },
} as const;

export async function seedFinance({ teamIds, projectIds, techDebtIds, incidentIds, userIds, locale = 'es' }: SeedRefs): Promise<void> {
  const tx = FINANCE_TEXT[locale];
  await Promise.all([
    CloudCostModel.deleteMany({}),
    ToolCostModel.deleteMany({}),
    TeamCostModel.deleteMany({}),
    ProductCostModel.deleteMany({}),
    TechDebtCostModel.deleteMany({}),
    IncidentCostModel.deleteMany({}),
    CostOfDelayModel.deleteMany({}),
    HiringRoiModel.deleteMany({}),
    EngineeringCostModel.deleteMany({}),
  ]);

  const year = 2026;

  // Top-level monthly engineering cost ledger (12 months).
  const engCosts = [];
  for (let m = 1; m <= 6; m++) {
    const growth = 1 + m * 0.03;
    engCosts.push({
      month: m,
      year,
      payrollCost: Math.round(320000 * growth),
      infrastructureCost: Math.round(48000 * growth),
      saasToolsCost: Math.round(22000 * growth),
      contractorsCost: Math.round(35000 * growth),
    });
  }
  await EngineeringCostModel.create(engCosts);

  // Cloud costs across providers for the last 6 months.
  const cloudRows = [];
  for (let m = 1; m <= 6; m++) {
    for (const provider of CLOUD_PROVIDERS) {
      const base: Record<string, number> = {
        AWS: 18000, GCP: 9000, Azure: 4000, Cloudflare: 1200, 'MongoDB Atlas': 2600, Vercel: 1800, Railway: 600,
      };
      cloudRows.push({
        provider,
        service: provider === 'AWS' ? 'EC2 + RDS + S3' : provider === 'MongoDB Atlas' ? 'Clúster M40' : tx.computeService,
        month: m,
        year,
        amount: Math.round((base[provider] ?? 1000) * (1 + m * 0.04)),
        team: teamIds[provider === 'AWS' ? 0 : 1],
      });
    }
  }
  await CloudCostModel.create(cloudRows);

  // SaaS tools with deliberate underutilization to trigger savings detection.
  await ToolCostModel.create([
    { toolName: 'Slack', category: 'communication', monthlyCost: 1200, activeLicenses: 150, usedLicenses: 142, renewalDate: new Date('2026-09-01'), owner: userIds[0] },
    { toolName: 'GitHub', category: 'source_control', monthlyCost: 900, activeLicenses: 120, usedLicenses: 118, renewalDate: new Date('2026-08-15'), owner: userIds[0] },
    { toolName: 'Datadog', category: 'observability', monthlyCost: 4500, activeLicenses: 100, usedLicenses: 55, renewalDate: new Date('2026-07-10'), owner: userIds[1] },
    { toolName: 'Figma', category: 'design', monthlyCost: 1500, activeLicenses: 60, usedLicenses: 24, renewalDate: new Date('2026-10-01'), owner: userIds[1] },
    { toolName: 'Jira', category: 'project_mgmt', monthlyCost: 1100, activeLicenses: 130, usedLicenses: 90, renewalDate: new Date('2026-11-20'), owner: userIds[0] },
    { toolName: 'Notion', category: 'docs', monthlyCost: 800, activeLicenses: 150, usedLicenses: 70, renewalDate: new Date('2026-06-30'), owner: userIds[1] },
  ]);

  // Team & product costs per month.
  const teamCostRows: Record<string, unknown>[] = [];
  const productCostRows: Record<string, unknown>[] = [];
  for (let m = 1; m <= 6; m++) {
    teamIds.forEach((team, idx) => {
      teamCostRows.push({
        team, month: m, year,
        payrollCost: 160000 + idx * 20000,
        infrastructureAllocation: 24000 + idx * 4000,
        toolingAllocation: 11000,
        contractorCost: idx === 1 ? 18000 : 6000,
        headcount: 4,
      });
    });
    projectIds.slice(0, 3).forEach((product, idx) => {
      productCostRows.push({
        product, month: m, year,
        payrollAllocation: 90000 + idx * 15000,
        infrastructureAllocation: 16000,
        toolingAllocation: 7000,
        monthlyRevenue: idx === 0 ? 180000 : idx === 1 ? 60000 : 140000,
      });
    });
  }
  await TeamCostModel.create(teamCostRows);
  await ProductCostModel.create(productCostRows);

  // Technical debt cost engine.
  if (techDebtIds.length) {
    await TechDebtCostModel.create([
      { technicalDebt: techDebtIds[0], team: teamIds[0], hoursLostPerMonth: 32, averageHourlyRate: 95, impactLevel: 'critical' },
      { technicalDebt: techDebtIds[1], team: teamIds[1], hoursLostPerMonth: 20, averageHourlyRate: 90, impactLevel: 'high' },
      { technicalDebt: techDebtIds[2] ?? techDebtIds[0], team: teamIds[0], hoursLostPerMonth: 12, averageHourlyRate: 88, impactLevel: 'medium' },
    ]);
  }

  // Incident cost engine.
  if (incidentIds.length) {
    await IncidentCostModel.create([
      { incident: incidentIds[0], team: teamIds[1], severity: 'SEV2', engineersInvolved: 3, durationHours: 4, estimatedHourlyRate: 95, customerImpactScore: 6 },
      { incident: incidentIds[1] ?? incidentIds[0], team: teamIds[0], severity: 'SEV1', engineersInvolved: 6, durationHours: 9, estimatedHourlyRate: 110, customerImpactScore: 9 },
    ]);
  }

  // Cost of delay.
  await CostOfDelayModel.create([
    { featureName: tx.delayFeatures[0], product: projectIds[0], team: teamIds[1], expectedMonthlyRevenue: 75000, delayMonths: 3, status: 'delayed' },
    { featureName: tx.delayFeatures[1], product: projectIds[1], team: teamIds[0], expectedMonthlyRevenue: 40000, delayMonths: 2, status: 'at_risk' },
    { featureName: tx.delayFeatures[2], team: teamIds[0], expectedMonthlyRevenue: 120000, delayMonths: 1, status: 'at_risk' },
  ]);

  // Hiring ROI.
  await HiringRoiModel.create([
    { role: tx.hiringRoles[0], team: teamIds[0], seniority: 'senior', annualCost: 185000, estimatedProductivityGain: 18, estimatedRevenueImpact: 420000, status: 'proposed' },
    { role: tx.hiringRoles[1], team: teamIds[0], seniority: 'staff', annualCost: 220000, estimatedProductivityGain: 22, estimatedRevenueImpact: 350000, status: 'proposed' },
    { role: tx.hiringRoles[2], team: teamIds[1], seniority: 'mid', annualCost: 140000, estimatedProductivityGain: 12, estimatedRevenueImpact: 180000, status: 'approved' },
  ]);
}
