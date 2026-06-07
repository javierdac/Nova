import { NotFoundError } from '../../shared/errors/AppError.js';
import { ProjectModel } from '../projects/project.model.js';
import { TeamModel } from '../teams/team.model.js';
import { MetricSnapshotModel } from '../metrics/metric.model.js';

const SIMULATIONS = 2000;
const WEEK_MS = 7 * 864e5;

/** Box-Muller normal sample. Truncated by callers as needed. */
function gaussian(mean: number, std: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export interface ProjectForecast {
  projectId: string;
  name: string;
  key?: string;
  team: string | null;
  progress: number;
  remainingPct: number;
  weeklyVelocity: number;
  p50Weeks: number;
  p85Weeks: number;
  p50Date: string;
  p85Date: string;
  targetDate: string | null;
  onTimeProbability: number | null;
  band: 'likely' | 'at_risk' | 'unlikely' | 'done';
}

class ForecastService {
  /**
   * Monte Carlo delivery forecast for one project. Weekly velocity (percent
   * points/week) is derived from the team's velocityConfidence signal and recent
   * deployment throughput; variance grows as confidence drops. Returns P50/P85
   * completion dates and the probability of hitting the target date.
   */
  private async forecastProject(project: {
    _id: unknown;
    name: string;
    key?: string;
    progress?: number;
    targetDate?: Date | null;
    team?: unknown;
  }): Promise<ProjectForecast> {
    const remainingPct = Math.max(0, 100 - (project.progress ?? 0));
    const team = project.team ? await TeamModel.findById(project.team).select('name signals').lean() : null;
    const velocityConfidence = (team?.signals?.velocityConfidence as number) ?? 60;

    // Recent throughput from metric snapshots (last 30 days) modulates velocity.
    const since = new Date(Date.now() - 30 * 864e5);
    const recent = project.team
      ? await MetricSnapshotModel.find({ team: project.team, date: { $gte: since } })
          .select('deploymentFrequency')
          .lean()
      : [];
    const avgDeployFreq = recent.length
      ? recent.reduce((s, m) => s + (m.deploymentFrequency ?? 0), 0) / recent.length
      : 1;
    const throughputFactor = 0.6 + 0.4 * Math.min(1, avgDeployFreq / 3);

    // Base velocity 4%..12% per week scaled by confidence, then by throughput.
    const baseVelocity = (4 + (velocityConfidence / 100) * 8) * throughputFactor;
    const std = baseVelocity * (1 - velocityConfidence / 100) * 1.5 + 1;

    const now = Date.now();
    const band = remainingPct <= 0 ? ('done' as const) : null;

    let weeksSamples: number[] = [];
    if (!band) {
      const samples: number[] = [];
      for (let i = 0; i < SIMULATIONS; i++) {
        let done = 0;
        let weeks = 0;
        while (done < remainingPct && weeks < 260) {
          done += Math.max(0.5, gaussian(baseVelocity, std));
          weeks++;
        }
        samples.push(weeks);
      }
      weeksSamples = samples.sort((a, b) => a - b);
    }

    const p50Weeks = band ? 0 : percentile(weeksSamples, 50);
    const p85Weeks = band ? 0 : percentile(weeksSamples, 85);
    const p50Date = new Date(now + p50Weeks * WEEK_MS).toISOString();
    const p85Date = new Date(now + p85Weeks * WEEK_MS).toISOString();

    let onTimeProbability: number | null = null;
    let finalBand: ProjectForecast['band'] = band ?? 'likely';
    if (project.targetDate) {
      const targetWeeks = (new Date(project.targetDate).getTime() - now) / WEEK_MS;
      if (band) {
        onTimeProbability = 1;
      } else {
        const hits = weeksSamples.filter((w) => w <= targetWeeks).length;
        onTimeProbability = Number((hits / weeksSamples.length).toFixed(2));
        finalBand = onTimeProbability >= 0.8 ? 'likely' : onTimeProbability >= 0.5 ? 'at_risk' : 'unlikely';
      }
    }

    return {
      projectId: String(project._id),
      name: project.name,
      key: project.key,
      team: team?.name ?? null,
      progress: project.progress ?? 0,
      remainingPct,
      weeklyVelocity: Number(baseVelocity.toFixed(2)),
      p50Weeks,
      p85Weeks,
      p50Date,
      p85Date,
      targetDate: project.targetDate ? new Date(project.targetDate).toISOString() : null,
      onTimeProbability,
      band: finalBand,
    };
  }

  async forecastOne(projectId: string): Promise<ProjectForecast> {
    const project = await ProjectModel.findById(projectId).select('name key progress targetDate team').lean();
    if (!project) throw new NotFoundError('Project');
    return this.forecastProject(project as Parameters<ForecastService['forecastProject']>[0]);
  }

  async forecastActive(): Promise<ProjectForecast[]> {
    const projects = await ProjectModel.find({ status: { $in: ['planned', 'active'] } })
      .select('name key progress targetDate team')
      .lean();
    return Promise.all(
      projects.map((p) => this.forecastProject(p as Parameters<ForecastService['forecastProject']>[0])),
    );
  }
}

export const forecastService = new ForecastService();
