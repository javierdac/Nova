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

/** Live provider stub — implement with the Jira REST API (JQL search). */
export const liveJiraProvider: JiraProvider = {
  async fetchIssues() {
    throw new Error('Jira live provider not configured yet. Set credentials and implement fetchIssues().');
  },
};
