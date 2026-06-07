import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import type { IntegrationDoc } from '../integration.model.js';

/**
 * A normalized Jira issue/epic. The connector turns these into Nova Projects
 * (roadmap items). Same swap boundary as GitHub: dummy vs live, identical shape.
 */
export interface JiraIssue {
  externalId: string; // Jira issue id
  key: string; // e.g. "NOVA-101"
  summary: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | 'Highest';
  storyPoints?: number;
  progress: number; // 0..100
  teamHint: string;
  url: string;
}

export interface JiraProvider {
  fetchIssues(integration: IntegrationDoc): Promise<JiraIssue[]>;
}

/** Deterministic fake Jira backlog. */
export const dummyJiraProvider: JiraProvider = {
  async fetchIssues() {
    const issues: Omit<JiraIssue, 'externalId' | 'url'>[] = [
      { key: 'NOVA-101', summary: 'Checkout redesign', status: 'In Progress', priority: 'High', storyPoints: 13, progress: 45, teamHint: 'Product Engineering' },
      { key: 'NOVA-102', summary: 'Multi-region database failover', status: 'In Progress', priority: 'Highest', storyPoints: 21, progress: 30, teamHint: 'Platform' },
      { key: 'NOVA-103', summary: 'Self-serve onboarding flow', status: 'To Do', priority: 'Medium', storyPoints: 8, progress: 0, teamHint: 'Product Engineering' },
      { key: 'NOVA-104', summary: 'Audit logging service', status: 'In Review', priority: 'Medium', storyPoints: 5, progress: 80, teamHint: 'Platform' },
      { key: 'NOVA-105', summary: 'Design system v2', status: 'Done', priority: 'Low', storyPoints: 8, progress: 100, teamHint: 'Product Engineering' },
    ];
    return issues.map((i, idx) => ({
      ...i,
      externalId: `jira-${1000 + idx}`,
      url: `https://acme.atlassian.net/browse/${i.key}`,
    }));
  },
};

const PAGE_SIZE = 100;
const MAX_PAGES = 10; // tope de seguridad → hasta 1000 issues por sync

interface JiraApiIssue {
  id: string;
  key: string;
  fields: {
    summary?: string;
    status?: { name?: string; statusCategory?: { key?: string } };
    priority?: { name?: string };
    project?: { name?: string };
    [custom: string]: unknown;
  };
}

/** statusCategory de Jira (+ nombre) → estado normalizado. */
function statusFrom(status?: JiraApiIssue['fields']['status']): JiraIssue['status'] {
  if (/review/i.test(status?.name ?? '')) return 'In Review';
  switch (status?.statusCategory?.key) {
    case 'done':
      return 'Done';
    case 'indeterminate':
      return 'In Progress';
    default:
      return 'To Do';
  }
}

/** Prioridad de Jira (Highest/High/Medium/Low/Lowest) → enum normalizado. */
function priorityFrom(name?: string): JiraIssue['priority'] {
  const p = (name ?? '').toLowerCase();
  if (p === 'highest') return 'Highest';
  if (p === 'high') return 'High';
  if (p === 'low' || p === 'lowest') return 'Low';
  return 'Medium';
}

/** Progreso 0–100 derivado del estado (Jira no expone un % directo). */
const PROGRESS_BY_STATUS: Record<JiraIssue['status'], number> = {
  'To Do': 0,
  'In Progress': 40,
  'In Review': 80,
  Done: 100,
};

function resolveCreds(integration: IntegrationDoc) {
  const cfg = (integration.config ?? {}) as { baseUrl?: string; email?: string; apiToken?: string };
  return {
    baseUrl: (cfg.baseUrl || env.JIRA_BASE_URL || '').replace(/\/$/, ''),
    email: cfg.email || env.JIRA_EMAIL,
    apiToken: cfg.apiToken || env.JIRA_API_TOKEN,
  };
}

/**
 * Live provider: Jira Cloud REST API (enhanced search `/rest/api/3/search/jql`).
 * Auth Basic con email + API token, paginado por `nextPageToken`. Devuelve la
 * misma forma que el dummy, así el connector no cambia.
 */
export const liveJiraProvider: JiraProvider = {
  async fetchIssues(integration) {
    const { baseUrl, email, apiToken } = resolveCreds(integration);
    if (!baseUrl || !email || !apiToken) {
      throw new Error('Faltan credenciales de Jira (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN) para el modo live.');
    }

    const spField = env.JIRA_STORY_POINTS_FIELD;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const fields = ['summary', 'status', 'priority', 'project', spField].join(',');
    const out: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ jql: env.JIRA_JQL, maxResults: String(PAGE_SIZE), fields });
      if (nextPageToken) params.set('nextPageToken', nextPageToken);

      const res = await fetch(`${baseUrl}/rest/api/3/search/jql?${params.toString()}`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Jira API ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as { issues?: JiraApiIssue[]; nextPageToken?: string; isLast?: boolean };
      for (const it of data.issues ?? []) {
        const status = statusFrom(it.fields.status);
        const sp = it.fields[spField];
        out.push({
          externalId: it.id,
          key: it.key,
          summary: it.fields.summary ?? it.key,
          status,
          priority: priorityFrom(it.fields.priority?.name),
          storyPoints: typeof sp === 'number' ? sp : undefined,
          progress: PROGRESS_BY_STATUS[status],
          teamHint: it.fields.project?.name ?? '',
          url: `${baseUrl}/browse/${it.key}`,
        });
      }
      nextPageToken = data.nextPageToken;
      if (data.isLast || !nextPageToken) break;
    }

    logger.info({ count: out.length }, 'Jira live sync: issues traídos');
    return out;
  },
};
