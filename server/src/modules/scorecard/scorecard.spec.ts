import { scoreDimensions, type ScoreInput } from './scorecard.service.js';

const dim = (r: ReturnType<typeof scoreDimensions>, d: string) => r.dimensions.find((x) => x.dimension === d)!.score;

describe('Scorecard dimensions (unit)', () => {
  it('scores a healthy org and picks the weakest dimension', () => {
    const input: ScoreInput = {
      roadmapScore: 90,
      teamHealth: 80,
      newValuePct: 75,
      changeFailureRate: 5,
      incidents: { sev1: 0, open: 0, avgMttrMinutes: 60 },
      techDebt: { highRisk: 0, avgRiskScore: 4 },
    };
    const r = scoreDimensions(input);
    expect(dim(r, 'reliability')).toBe(94); // 100 - min(20, 60/10=6)
    expect(dim(r, 'quality')).toBe(100); // no high-risk debt, avgRisk < 5
    expect(dim(r, 'cost')).toBe(75); // newValuePct, CFR not high
    expect(r.global).toBe(88); // 90*.25+94*.25+100*.15+80*.2+75*.15 = 88.25
    expect(r.weakest).toBe('cost');
  });

  it('penalises incidents, debt and a high change-failure rate', () => {
    const input: ScoreInput = {
      roadmapScore: 50,
      teamHealth: 60,
      newValuePct: 50,
      changeFailureRate: 20,
      incidents: { sev1: 1, open: 2, avgMttrMinutes: 300 },
      techDebt: { highRisk: 3, avgRiskScore: 8 },
    };
    const r = scoreDimensions(input);
    expect(dim(r, 'reliability')).toBe(50); // 100 - 20 - 10 - min(20, 30)
    expect(dim(r, 'quality')).toBe(40); // 100 - 36 - (8-5)*8
    expect(dim(r, 'cost')).toBe(40); // 50 - 10 (CFR > 15)
  });

  it('clamps dimensions to 0–100', () => {
    const r = scoreDimensions({
      roadmapScore: 200,
      teamHealth: -50,
      newValuePct: 0,
      changeFailureRate: 0,
      incidents: { sev1: 10, open: 10, avgMttrMinutes: 0 },
      techDebt: { highRisk: 0, avgRiskScore: 0 },
    });
    expect(dim(r, 'delivery')).toBe(100);
    expect(dim(r, 'people')).toBe(0);
    expect(dim(r, 'reliability')).toBe(0);
  });
});
