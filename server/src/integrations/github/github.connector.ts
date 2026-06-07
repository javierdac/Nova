import { Types } from 'mongoose';
import { upsertBySource } from '../../shared/source.js';
import { MetricSnapshotModel } from '../../modules/metrics/metric.model.js';
import { TeamModel } from '../../modules/teams/team.model.js';
import type { Connector, SyncResult } from '../connector.js';
import type { IntegrationDoc } from '../integration.model.js';
import { dummyGithubProvider, liveGithubProvider } from '../providers/github.provider.js';

/** GitHub → MetricSnapshot (DORA). Feeds the existing dashboard trend charts. */
export const githubConnector: Connector = {
  provider: 'github',

  async sync(integration: IntegrationDoc): Promise<SyncResult> {
    const provider = integration.mode === 'live' ? liveGithubProvider : dummyGithubProvider;
    const activity = await provider.fetchActivity(integration);

    const teams = await TeamModel.find().select('name').lean();
    const byName = new Map(teams.map((t) => [t.name.toLowerCase(), t._id as Types.ObjectId]));
    const fallback = teams[0]?._id as Types.ObjectId | undefined;

    let created = 0;
    let updated = 0;
    for (const a of activity) {
      const team = byName.get(a.teamHint.toLowerCase()) ?? fallback;
      const res = await upsertBySource(
        MetricSnapshotModel,
        'github',
        a.externalId,
        {
          team,
          date: new Date(a.date),
          deploymentCount: a.deployments,
          deploymentFrequency: a.deployments,
          leadTimeHours: a.leadTimeHours,
          changeFailureRate: a.changeFailureRate,
        },
        a.url,
      );
      if (res.created) created += 1;
      else if (res.updated) updated += 1;
    }
    return { created, updated };
  },
};
