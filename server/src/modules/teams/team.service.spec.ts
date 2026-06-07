import { teamService } from './team.service.js';

describe('TeamService.computeHealthScore (unit)', () => {
  it('rates a strong team as healthy', () => {
    const r = teamService.computeHealthScore({ morale: 90, velocityConfidence: 88, onCallLoad: 20, attrition: 5 });
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.band).toBe('healthy');
  });

  it('rates a struggling team as critical', () => {
    const r = teamService.computeHealthScore({ morale: 30, velocityConfidence: 25, onCallLoad: 85, attrition: 60 });
    expect(r.score).toBeLessThan(50);
    expect(r.band).toBe('critical');
  });

  it('clamps score within 0-100', () => {
    const r = teamService.computeHealthScore({ morale: 100, velocityConfidence: 100, onCallLoad: 0, attrition: 0 });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
