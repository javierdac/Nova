import { Types } from 'mongoose';
import { upsertBySource } from '../../shared/source.js';
import { IncidentModel } from '../../modules/incidents/incident.model.js';
import { TeamModel } from '../../modules/teams/team.model.js';
import type { Connector, SyncResult } from '../connector.js';
import type { IntegrationDoc } from '../integration.model.js';
import { dummyPagerDutyProvider, livePagerDutyProvider, type PagerDutyIncident } from '../providers/pagerduty.provider.js';

const SEVERITY_MAP: Record<PagerDutyIncident['urgency'], string> = {
  critical: 'SEV1',
  high: 'SEV2',
  low: 'SEV3',
  info: 'SEV4',
};
const STATUS_MAP: Record<PagerDutyIncident['state'], string> = {
  triggered: 'open',
  acknowledged: 'investigating',
  resolved: 'resolved',
};

/** PagerDuty → Incident (reliability + MTTR). Feeds the incidents view and dashboard roll-up. */
export const pagerdutyConnector: Connector = {
  provider: 'pagerduty',

  async sync(integration: IntegrationDoc): Promise<SyncResult> {
    const provider = integration.mode === 'live' ? livePagerDutyProvider : dummyPagerDutyProvider;
    const incidents = await provider.fetchIncidents(integration);

    const teams = await TeamModel.find().select('name').lean();
    const byName = new Map(teams.map((t) => [t.name.toLowerCase(), t._id as Types.ObjectId]));
    const fallback = teams[0]?._id as Types.ObjectId | undefined;

    let created = 0;
    let updated = 0;
    for (const inc of incidents) {
      const detectedAt = new Date(inc.detectedAt);
      const resolvedAt = inc.resolvedAt ? new Date(inc.resolvedAt) : undefined;
      const mttrMinutes = resolvedAt ? Math.round((resolvedAt.getTime() - detectedAt.getTime()) / 60000) : undefined;

      const res = await upsertBySource(
        IncidentModel,
        'pagerduty',
        inc.externalId,
        {
          title: inc.title,
          description: inc.description,
          severity: SEVERITY_MAP[inc.urgency],
          status: STATUS_MAP[inc.state],
          team: byName.get(inc.serviceHint.toLowerCase()) ?? fallback,
          detectedAt,
          resolvedAt,
          mttrMinutes,
          affectedUsers: inc.affectedUsers,
        },
        inc.url,
      );
      if (res.created) created += 1;
      else if (res.updated) updated += 1;
    }
    return { created, updated };
  },
};
