import type { IntegrationDoc } from './integration.model.js';

export interface SyncResult {
  created: number;
  updated: number;
}

/** A connector knows how to pull from a provider and upsert into Nova. */
export interface Connector {
  provider: 'github' | 'jira' | 'pagerduty' | 'cloud';
  sync(integration: IntegrationDoc): Promise<SyncResult>;
}
