import { Types } from 'mongoose';
import { upsertBySource } from '../../shared/source.js';
import { CloudCostModel } from '../../modules/finance/models/cloudCost.model.js';
import { TeamModel } from '../../modules/teams/team.model.js';
import type { Connector, SyncResult } from '../connector.js';
import type { IntegrationDoc } from '../integration.model.js';
import { dummyCloudProvider, liveCloudProvider } from '../providers/cloud.provider.js';

/** Cloud billing (AWS/GCP) → CloudCost. Feeds the Cloud Costs view + MoM growth alerts. */
export const cloudConnector: Connector = {
  provider: 'cloud',

  async sync(integration: IntegrationDoc): Promise<SyncResult> {
    const provider = integration.mode === 'live' ? liveCloudProvider : dummyCloudProvider;
    const lines = await provider.fetchBilling(integration);

    const teams = await TeamModel.find().select('name').lean();
    const byName = new Map(teams.map((t) => [t.name.toLowerCase(), t._id as Types.ObjectId]));
    const fallback = teams[0]?._id as Types.ObjectId | undefined;

    let created = 0;
    let updated = 0;
    for (const line of lines) {
      const res = await upsertBySource(
        CloudCostModel,
        'cloud',
        line.externalId,
        {
          provider: line.provider,
          service: line.service,
          year: line.year,
          month: line.month,
          amount: line.amount,
          currency: 'USD',
          team: byName.get(line.teamHint.toLowerCase()) ?? fallback,
          notes: line.note,
        },
        line.url,
      );
      if (res.created) created += 1;
      else if (res.updated) updated += 1;
    }
    return { created, updated };
  },
};
