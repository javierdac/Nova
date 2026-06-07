import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
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

const LOOKBACK_DAYS = 30;
const PER_PAGE = 100;
const MAX_PAGES = 5; // por repo → hasta 500 PRs

interface GithubPull {
  number: number;
  title: string;
  created_at: string;
  merged_at: string | null;
  html_url: string;
}

/** PRs de "Revert/Hotfix/Rollback" → proxy de despliegue fallido (CFR). */
const FAILURE_RE = /^(revert|hotfix|rollback)\b|^revert:/i;

function resolveCreds(integration: IntegrationDoc) {
  const cfg = (integration.config ?? {}) as { token?: string; repos?: string };
  const reposRaw = cfg.repos || env.GITHUB_REPOS || '';
  return {
    token: cfg.token || env.GITHUB_TOKEN,
    repos: reposRaw.split(',').map((r) => r.trim()).filter(Boolean), // ["owner/repo", ...]
  };
}

/**
 * Live provider: GitHub REST (Pull Requests). DORA aproximado desde merges a la
 * rama por defecto — señal disponible en cualquier repo (no requiere Deployments
 * configurados). Agrega por día y repo, igual que el dummy:
 *   - deployments  = PRs mergeados ese día (merge a main ≈ deploy en trunk-based)
 *   - leadTimeHours = promedio (merged_at − created_at) = ciclo del PR
 *   - changeFailureRate = (PRs revert/hotfix) / (PRs mergeados) del día
 */
export const liveGithubProvider: GithubProvider = {
  async fetchActivity(integration) {
    const { token, repos } = resolveCreds(integration);
    if (!token || repos.length === 0) {
      throw new Error('Faltan credenciales de GitHub (GITHUB_TOKEN y GITHUB_REPOS) para el modo live.');
    }

    const since = Date.now() - LOOKBACK_DAYS * 86_400_000;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const out: GithubActivity[] = [];

    for (const repo of repos) {
      const teamHint = repo.split('/')[1] ?? repo; // nombre del repo → equipo
      // Acumuladores por día: total PRs, suma de lead time (h), fallos.
      const byDay = new Map<string, { count: number; leadSum: number; failures: number }>();

      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = `${env.GITHUB_API_URL}/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=${PER_PAGE}&page=${page}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`GitHub API ${res.status} (${repo}): ${body.slice(0, 160)}`);
        }
        const pulls = (await res.json()) as GithubPull[];
        if (pulls.length === 0) break;

        let oldestUpdatedBeforeWindow = false;
        for (const pr of pulls) {
          if (!pr.merged_at) continue;
          const merged = new Date(pr.merged_at).getTime();
          if (merged < since) {
            oldestUpdatedBeforeWindow = true;
            continue;
          }
          const day = pr.merged_at.slice(0, 10);
          const bucket = byDay.get(day) ?? { count: 0, leadSum: 0, failures: 0 };
          bucket.count += 1;
          bucket.leadSum += (merged - new Date(pr.created_at).getTime()) / 3_600_000;
          if (FAILURE_RE.test(pr.title)) bucket.failures += 1;
          byDay.set(day, bucket);
        }
        // Orden por updated desc: si llegamos a PRs viejos y la página no llenó, cortamos.
        if (oldestUpdatedBeforeWindow || pulls.length < PER_PAGE) break;
      }

      for (const [date, b] of byDay) {
        out.push({
          externalId: `gh:${teamHint}:${date}`,
          teamHint,
          date,
          deployments: b.count,
          leadTimeHours: Number((b.leadSum / b.count).toFixed(1)),
          changeFailureRate: Number((b.failures / b.count).toFixed(3)),
          url: `https://github.com/${repo}/pulls?q=is%3Apr+is%3Amerged`,
        });
      }
    }

    logger.info({ points: out.length, repos: repos.length }, 'GitHub live sync: actividad agregada');
    return out;
  },
};
