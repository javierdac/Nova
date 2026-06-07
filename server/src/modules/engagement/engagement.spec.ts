import { enps } from './engagement.service.js';

const r = (...scores: number[]) => scores.map((s) => ({ recommendScore: s }));

describe('eNPS (unit)', () => {
  it('classifies promoters (9–10), passives (7–8) and detractors (0–6)', () => {
    expect(enps(r(10, 9, 8, 7, 6, 0))).toEqual({ enps: 0, promoters: 2, passives: 2, detractors: 2 });
  });

  it('is +100 when everyone is a promoter', () => {
    expect(enps(r(9, 10, 9)).enps).toBe(100);
  });

  it('is −100 when everyone is a detractor', () => {
    expect(enps(r(0, 3, 6)).enps).toBe(-100);
  });

  it('returns zeros for no responses', () => {
    expect(enps([])).toEqual({ enps: 0, promoters: 0, passives: 0, detractors: 0 });
  });

  it('rounds the score', () => {
    // 2 promoters, 1 detractor of 3 → (2-1)/3*100 = 33.3 → 33
    expect(enps(r(9, 10, 0)).enps).toBe(33);
  });
});
