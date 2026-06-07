import type { IntegrationDoc } from '../integration.model.js';

/**
 * A normalized daily activity point pulled from GitHub. The connector turns
 * these into MetricSnapshot rollups (DORA). This is the swap boundary: the
 * dummy provider returns canned data; the live provider will call the GitHub API
 * and produce the exact same shape — the connector never changes.
 */
export interface GithubActivity {
  externalId: string; // stable id per data point, e.g. "gh:platform:2026-06-01"
  teamHint: string; // repo/team name to resolve against Nova teams
  date: string; // YYYY-MM-DD
  deployments: number;
  leadTimeHours: number;
  changeFailureRate: number; // 0..1
  url: string;
}

export interface GithubProvider {
  fetchActivity(integration: IntegrationDoc): Promise<GithubActivity[]>;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Deterministic fake GitHub data for the last 14 days across two repos. */
export const dummyGithubProvider: GithubProvider = {
  async fetchActivity() {
    const repos = ['Platform', 'Product Engineering'];
    const out: GithubActivity[] = [];
    for (let d = 13; d >= 0; d--) {
      const date = new Date(Date.now() - d * 86_400_000);
      const wobble = (d % 7) / 7;
      repos.forEach((repo, i) => {
        out.push({
          externalId: `gh:${repo}:${ymd(date)}`,
          teamHint: repo,
          date: ymd(date),
          deployments: Math.round(1 + wobble * 4 + i),
          leadTimeHours: Number((20 + wobble * 28 + i * 4).toFixed(1)),
          changeFailureRate: Number((0.04 + wobble * 0.12).toFixed(3)),
          url: `https://github.com/acme/${repo.toLowerCase().replace(/\s+/g, '-')}/deployments`,
        });
      });
    }
    return out;
  },
};

/**
 * Live provider — swap the connector's `mode` to 'live' to use this. Replace the
 * body with real GitHub REST/GraphQL calls (PRs + deployments) mapped to
 * GithubActivity[]. Kept as a stub so the wiring is ready.
 */
export const liveGithubProvider: GithubProvider = {
  async fetchActivity() {
    throw new Error('GitHub live provider not configured yet. Set credentials and implement fetchActivity().');
  },
};
