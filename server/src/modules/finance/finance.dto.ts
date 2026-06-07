import { z } from 'zod';
import { CLOUD_PROVIDERS } from './models/cloudCost.model.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const money = z.number().min(0);
const month = z.number().int().min(1).max(12);
const year = z.number().int().min(2000).max(2100);

export const idParamSchema = z.object({ id: objectId });
export const listQuerySchema = z.object({}).passthrough();

/* ── CloudCost ─────────────────────────────────────────── */
export const createCloudCostSchema = z.object({
  provider: z.enum(CLOUD_PROVIDERS),
  service: z.string().min(1),
  month,
  year,
  amount: money,
  currency: z.string().optional(),
  team: objectId.optional(),
  product: objectId.optional(),
  notes: z.string().max(500).optional(),
});
export const updateCloudCostSchema = createCloudCostSchema.partial();

/* ── ToolCost ──────────────────────────────────────────── */
export const createToolCostSchema = z.object({
  toolName: z.string().min(1),
  category: z
    .enum(['communication', 'source_control', 'observability', 'design', 'project_mgmt', 'docs', 'security', 'other'])
    .optional(),
  monthlyCost: money,
  currency: z.string().optional(),
  activeLicenses: z.number().int().min(0).optional(),
  usedLicenses: z.number().int().min(0).optional(),
  renewalDate: z.coerce.date().optional(),
  owner: objectId.optional(),
  notes: z.string().max(500).optional(),
});
export const updateToolCostSchema = createToolCostSchema.partial();

/* ── TeamCost ──────────────────────────────────────────── */
export const createTeamCostSchema = z.object({
  team: objectId,
  month,
  year,
  payrollCost: money.optional(),
  infrastructureAllocation: money.optional(),
  toolingAllocation: money.optional(),
  contractorCost: money.optional(),
  headcount: z.number().int().min(0).optional(),
  currency: z.string().optional(),
});
export const updateTeamCostSchema = createTeamCostSchema.partial();

/* ── ProductCost ───────────────────────────────────────── */
export const createProductCostSchema = z.object({
  product: objectId,
  month,
  year,
  payrollAllocation: money.optional(),
  infrastructureAllocation: money.optional(),
  toolingAllocation: money.optional(),
  monthlyRevenue: money.optional(),
  currency: z.string().optional(),
});
export const updateProductCostSchema = createProductCostSchema.partial();

/* ── TechnicalDebtCost ─────────────────────────────────── */
export const createTechDebtCostSchema = z.object({
  technicalDebt: objectId,
  team: objectId.optional(),
  product: objectId.optional(),
  hoursLostPerMonth: money,
  averageHourlyRate: money,
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  currency: z.string().optional(),
});
export const updateTechDebtCostSchema = createTechDebtCostSchema.partial();

/* ── IncidentCost ──────────────────────────────────────── */
export const createIncidentCostSchema = z.object({
  incident: objectId,
  team: objectId.optional(),
  severity: z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']).optional(),
  engineersInvolved: z.number().min(0),
  durationHours: money,
  estimatedHourlyRate: money,
  customerImpactScore: z.number().min(0).max(10).optional(),
  currency: z.string().optional(),
});
export const updateIncidentCostSchema = createIncidentCostSchema.partial();

/* ── CostOfDelay ───────────────────────────────────────── */
export const createCostOfDelaySchema = z.object({
  featureName: z.string().min(1),
  product: objectId.optional(),
  team: objectId.optional(),
  expectedMonthlyRevenue: money,
  delayMonths: money,
  status: z.enum(['at_risk', 'delayed', 'shipped', 'cancelled']).optional(),
  currency: z.string().optional(),
  notes: z.string().max(500).optional(),
});
export const updateCostOfDelaySchema = createCostOfDelaySchema.partial();

/* ── HiringROI ─────────────────────────────────────────── */
export const createHiringRoiSchema = z.object({
  role: z.string().min(1),
  team: objectId.optional(),
  seniority: z.enum(['junior', 'mid', 'senior', 'staff', 'principal']).optional(),
  annualCost: money,
  estimatedProductivityGain: z.number().optional(),
  estimatedRevenueImpact: money.optional(),
  status: z.enum(['proposed', 'approved', 'hired', 'rejected']).optional(),
  currency: z.string().optional(),
  notes: z.string().max(500).optional(),
});
export const updateHiringRoiSchema = createHiringRoiSchema.partial();

/* ── EngineeringCost ───────────────────────────────────── */
export const createEngineeringCostSchema = z.object({
  month,
  year,
  payrollCost: money.optional(),
  infrastructureCost: money.optional(),
  saasToolsCost: money.optional(),
  contractorsCost: money.optional(),
  currency: z.string().optional(),
});
export const updateEngineeringCostSchema = createEngineeringCostSchema.partial();
