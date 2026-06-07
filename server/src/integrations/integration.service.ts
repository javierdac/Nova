import { BadRequestError } from '../shared/errors/AppError.js';
import { logger } from '../config/logger.js';
import { IntegrationModel, PROVIDERS, type Provider } from './integration.model.js';
import { SyncRunModel } from './syncRun.model.js';
import type { Connector } from './connector.js';
import { githubConnector } from './github/github.connector.js';
import { jiraConnector } from './jira/jira.connector.js';
import { pagerdutyConnector } from './pagerduty/pagerduty.connector.js';
import { cloudConnector } from './cloud/cloud.connector.js';

const CONNECTORS: Record<Provider, Connector> = {
  github: githubConnector,
  jira: jiraConnector,
  pagerduty: pagerdutyConnector,
  cloud: cloudConnector,
};

class IntegrationService {
  /** Finds the integration doc, creating a disconnected default if missing. */
  private async ensure(provider: Provider) {
    let integration = await IntegrationModel.findOne({ provider });
    if (!integration) integration = await IntegrationModel.create({ provider });
    return integration;
  }

  /** All providers with current status + their latest run, for the UI. */
  async list() {
    const docs = await Promise.all(PROVIDERS.map((p) => this.ensure(p)));
    const runs = await SyncRunModel.aggregate<{ _id: Provider; run: unknown }>([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$provider', run: { $first: '$$ROOT' } } },
    ]);
    const lastRun = new Map(runs.map((r) => [r._id, r.run]));
    return docs.map((d) => ({
      provider: d.provider,
      status: d.status,
      mode: d.mode,
      lastSyncAt: d.lastSyncAt ?? null,
      lastError: d.lastError ?? null,
      lastRun: lastRun.get(d.provider as Provider) ?? null,
    }));
  }

  /** Toggle dummy/live or connect/disconnect. */
  async configure(provider: Provider, patch: { mode?: 'dummy' | 'live'; status?: 'connected' | 'disconnected' }) {
    if (!PROVIDERS.includes(provider)) throw new BadRequestError('Unknown provider');
    const integration = await this.ensure(provider);
    if (patch.mode) integration.mode = patch.mode;
    if (patch.status) integration.status = patch.status;
    await integration.save();
    return integration.toObject();
  }

  /** Run a sync for one provider and record the outcome. */
  async sync(provider: Provider) {
    if (!PROVIDERS.includes(provider)) throw new BadRequestError('Unknown provider');
    const integration = await this.ensure(provider);
    const startedAt = Date.now();
    try {
      const { created, updated } = await CONNECTORS[provider].sync(integration);
      integration.status = 'connected';
      integration.lastSyncAt = new Date();
      integration.lastError = undefined;
      await integration.save();

      const run = await SyncRunModel.create({
        provider,
        mode: integration.mode,
        status: 'success',
        created,
        updated,
        durationMs: Date.now() - startedAt,
      });
      logger.info({ provider, created, updated, mode: integration.mode }, 'Integration sync completed');
      return run.toObject();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      integration.status = 'error';
      integration.lastError = message;
      await integration.save();
      await SyncRunModel.create({ provider, mode: integration.mode, status: 'error', error: message, durationMs: Date.now() - startedAt });
      logger.error({ err, provider }, 'Integration sync failed');
      throw new BadRequestError(message);
    }
  }

  async runs(provider: Provider, limit = 10) {
    return SyncRunModel.find({ provider }).sort({ createdAt: -1 }).limit(limit).lean();
  }
}

export const integrationService = new IntegrationService();
