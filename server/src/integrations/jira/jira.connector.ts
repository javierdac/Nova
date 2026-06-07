import { Types } from 'mongoose';
import { upsertBySource } from '../../shared/source.js';
import { ProjectModel } from '../../modules/projects/project.model.js';
import { TeamModel } from '../../modules/teams/team.model.js';
import type { Connector, SyncResult } from '../connector.js';
import type { IntegrationDoc } from '../integration.model.js';
import { dummyJiraProvider, liveJiraProvider, type JiraIssue } from '../providers/jira.provider.js';

const STATUS_MAP: Record<JiraIssue['status'], string> = {
  'To Do': 'planned',
  'In Progress': 'active',
  'In Review': 'active',
  Done: 'completed',
};
const PRIORITY_MAP: Record<JiraIssue['priority'], string> = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Highest: 'critical',
};

/** Roadmap health derived from progress vs. status. */
function roadmapHealth(issue: JiraIssue): string {
  if (issue.status === 'Done') return 'on_track';
  if (issue.progress < 25 && issue.priority === 'Highest') return 'off_track';
  if (issue.progress < 50) return 'at_risk';
  return 'on_track';
}

/** Jira → Project (roadmap items). */
export const jiraConnector: Connector = {
  provider: 'jira',

  async sync(integration: IntegrationDoc): Promise<SyncResult> {
    const provider = integration.mode === 'live' ? liveJiraProvider : dummyJiraProvider;
    const issues = await provider.fetchIssues(integration);

    const teams = await TeamModel.find().select('name').lean();
    const byName = new Map(teams.map((t) => [t.name.toLowerCase(), t._id as Types.ObjectId]));
    const fallback = teams[0]?._id as Types.ObjectId | undefined;

    let created = 0;
    let updated = 0;
    for (const issue of issues) {
      const res = await upsertBySource(
        ProjectModel,
        'jira',
        issue.externalId,
        {
          name: issue.summary,
          key: issue.key,
          status: STATUS_MAP[issue.status],
          priority: PRIORITY_MAP[issue.priority],
          progress: issue.progress,
          roadmapHealth: roadmapHealth(issue),
          team: byName.get(issue.teamHint.toLowerCase()) ?? fallback,
        },
        issue.url,
      );
      if (res.created) created += 1;
      else if (res.updated) updated += 1;
    }
    return { created, updated };
  },
};
