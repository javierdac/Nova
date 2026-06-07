import { projectEffortPoints, splitRemaining } from './investment.service.js';

describe('Investment effort model (unit)', () => {
  it('weights project effort by priority and status', () => {
    expect(projectEffortPoints('critical', 'active')).toBe(20); // 10 * 2 * 1
    expect(projectEffortPoints('medium', 'active')).toBe(10); // 10 * 1 * 1
    expect(projectEffortPoints('high', 'planned')).toBe(6); // 10 * 1.5 * 0.4
    expect(projectEffortPoints('low', 'active')).toBe(5); // 10 * 0.5 * 1
  });

  it('defaults to medium/active when fields are missing', () => {
    expect(projectEffortPoints(undefined, undefined)).toBe(10);
  });

  it('splits remaining cost proportionally to points', () => {
    expect(splitRemaining(1000, 3, 10)).toBe(300);
    expect(splitRemaining(1000, 7, 10)).toBe(700);
  });

  it('returns 0 when there are no planned points (avoids divide-by-zero)', () => {
    expect(splitRemaining(1000, 0, 0)).toBe(0);
  });
});
