import { buildBrief, type BriefInputs } from './brief.service.js';

const base: BriefInputs = {
  summary: {
    incidentMetrics: { sev1: 0, open: 0, avgMttrMinutes: 0 },
    deploymentMetrics: { changeFailureRate: 5 },
    roadmapHealth: { off_track: 0, at_risk: 0 },
    technicalRisks: { highRisk: 0 },
  },
  attrition: { summary: { high: 0, medium: 0 }, people: [] },
  cloud: { alerts: [] },
  investment: { categories: [{ category: 'incidents', pct: 0.5 }] },
};

describe('Weekly brief builder (unit)', () => {
  it('reports all-clear when nothing is wrong', () => {
    const r = buildBrief(base);
    expect(r.items).toHaveLength(0);
    expect(r.summary.total).toBe(0);
    expect(r.headline).toMatch(/verde/);
  });

  it('flags SEV1, off-track roadmap and high flight-risk as urgent', () => {
    const r = buildBrief({
      ...base,
      summary: { ...base.summary, incidentMetrics: { sev1: 1, open: 1, avgMttrMinutes: 0 }, roadmapHealth: { off_track: 2, at_risk: 0 } },
      attrition: { summary: { high: 3, medium: 0 }, people: [{ band: 'high', name: 'Ana' }] },
    });
    expect(r.summary.high).toBe(3); // reliability + delivery + people
    expect(r.items[0].severity).toBe('high'); // sorted high-first
    expect(r.items.find((i) => i.domain === 'people')!.detail).toContain('Ana');
  });

  it('treats cloud-growth and incident-heavy capacity as medium', () => {
    const r = buildBrief({
      ...base,
      cloud: { alerts: [{ message: 'El gasto de nube creció 25% mes a mes' }] },
      investment: { categories: [{ category: 'incidents', pct: 18 }] },
    });
    expect(r.summary.medium).toBe(2);
    expect(r.summary.high).toBe(0);
  });
});
