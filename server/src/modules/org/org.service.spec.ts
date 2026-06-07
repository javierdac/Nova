import { computeAttritionRisk } from './org.service.js';

describe('computeAttritionRisk (unit)', () => {
  it('rates a settled person on a healthy team as low risk', () => {
    const r = computeAttritionRisk({
      tenureMonths: 6,
      seniority: 'mid',
      signals: { attrition: 8, morale: 80, onCallLoad: 25 },
    });
    expect(r.band).toBe('low');
    expect(r.factors).toHaveLength(0);
  });

  it('flags high risk when team signals and tenure window stack up', () => {
    const r = computeAttritionRisk({
      tenureMonths: 18,
      seniority: 'senior',
      signals: { attrition: 25, morale: 50, onCallLoad: 70 },
    });
    expect(r.band).toBe('high');
    expect(r.factors).toEqual(
      expect.arrayContaining(['highAttrition', 'lowMorale', 'heavyOnCall', 'flightWindow']),
    );
  });

  it('raises risk on negative team eNPS and eases it on strong eNPS', () => {
    const baseSignals = { attrition: 8, morale: 80, onCallLoad: 25 };
    const neutral = computeAttritionRisk({ tenureMonths: 6, seniority: 'mid', signals: baseSignals });
    const negative = computeAttritionRisk({ tenureMonths: 6, seniority: 'mid', signals: baseSignals, teamEnps: -20 });
    const strong = computeAttritionRisk({ tenureMonths: 6, seniority: 'mid', signals: baseSignals, teamEnps: 70 });

    expect(negative.score).toBeGreaterThan(neutral.score);
    expect(negative.factors).toContain('negativeEnps');
    expect(strong.score).toBeLessThanOrEqual(neutral.score);
  });

  it('clamps the score to 0-100', () => {
    const r = computeAttritionRisk({
      tenureMonths: 18,
      seniority: 'principal',
      signals: { attrition: 90, morale: 10, onCallLoad: 100 },
    });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
