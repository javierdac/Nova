import { computeKeyResultProgress, rollupObjective } from './okr.service.js';

describe('OKR rollup (unit)', () => {
  it('computes linear key-result progress and clamps to 0-100', () => {
    expect(computeKeyResultProgress({ startValue: 0, targetValue: 100, currentValue: 40 })).toBe(40);
    expect(computeKeyResultProgress({ startValue: 20, targetValue: 120, currentValue: 70 })).toBe(50);
    expect(computeKeyResultProgress({ startValue: 0, targetValue: 100, currentValue: 200 })).toBe(100);
    expect(computeKeyResultProgress({ startValue: 0, targetValue: 100, currentValue: -10 })).toBe(0);
  });

  it('treats boolean key results as all-or-nothing', () => {
    expect(computeKeyResultProgress({ metricType: 'boolean', targetValue: 1, currentValue: 1 })).toBe(100);
    expect(computeKeyResultProgress({ metricType: 'boolean', targetValue: 1, currentValue: 0 })).toBe(0);
  });

  it('averages progress and derives status from confidence', () => {
    const healthy = rollupObjective([
      { startValue: 0, targetValue: 100, currentValue: 60, confidence: 85 },
      { startValue: 0, targetValue: 100, currentValue: 40, confidence: 80 },
    ]);
    expect(healthy.progress).toBe(50);
    expect(healthy.status).toBe('on_track');

    const shaky = rollupObjective([{ startValue: 0, targetValue: 100, currentValue: 30, confidence: 55 }]);
    expect(shaky.status).toBe('at_risk');

    const failing = rollupObjective([{ startValue: 0, targetValue: 100, currentValue: 10, confidence: 30 }]);
    expect(failing.status).toBe('off_track');
  });

  it('marks a fully-delivered objective as achieved regardless of confidence', () => {
    const done = rollupObjective([{ startValue: 0, targetValue: 100, currentValue: 100, confidence: 20 }]);
    expect(done.progress).toBe(100);
    expect(done.status).toBe('achieved');
  });

  it('treats an objective with no key results as off-track', () => {
    expect(rollupObjective([])).toEqual({ progress: 0, confidence: 0, status: 'off_track' });
  });
});
