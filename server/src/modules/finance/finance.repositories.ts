import type { Model } from 'mongoose';
import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { CloudCostModel, type CloudCostDoc } from './models/cloudCost.model.js';
import { ToolCostModel, type ToolCostDoc } from './models/toolCost.model.js';
import { TeamCostModel, type TeamCostDoc } from './models/teamCost.model.js';
import { ProductCostModel, type ProductCostDoc } from './models/productCost.model.js';
import { TechDebtCostModel, type TechDebtCostDoc } from './models/techDebtCost.model.js';
import { IncidentCostModel, type IncidentCostDoc } from './models/incidentCost.model.js';
import { CostOfDelayModel, type CostOfDelayDoc } from './models/costOfDelay.model.js';
import { HiringRoiModel, type HiringRoiDoc } from './models/hiringRoi.model.js';
import { EngineeringCostModel, type EngineeringCostDoc } from './models/engineeringCost.model.js';

/** Concrete repository with a configurable searchable-field list. */
class FinanceRepository<T> extends BaseRepository<T> {
  protected readonly searchableFields: string[];
  constructor(model: Model<T>, searchable: string[]) {
    super(model);
    this.searchableFields = searchable;
  }
}

export const cloudCostRepository = new FinanceRepository<CloudCostDoc>(CloudCostModel, ['provider', 'service', 'notes']);
export const toolCostRepository = new FinanceRepository<ToolCostDoc>(ToolCostModel, ['toolName', 'notes']);
export const teamCostRepository = new FinanceRepository<TeamCostDoc>(TeamCostModel, []);
export const productCostRepository = new FinanceRepository<ProductCostDoc>(ProductCostModel, []);
export const techDebtCostRepository = new FinanceRepository<TechDebtCostDoc>(TechDebtCostModel, []);
export const incidentCostRepository = new FinanceRepository<IncidentCostDoc>(IncidentCostModel, []);
export const costOfDelayRepository = new FinanceRepository<CostOfDelayDoc>(CostOfDelayModel, ['featureName', 'notes']);
export const hiringRoiRepository = new FinanceRepository<HiringRoiDoc>(HiringRoiModel, ['role', 'notes']);
export const engineeringCostRepository = new FinanceRepository<EngineeringCostDoc>(EngineeringCostModel, []);
