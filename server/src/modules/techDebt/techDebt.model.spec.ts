import { TechDebtModel } from './techDebt.model.js';

describe('TechDebt score derivation (unit/integration)', () => {
  it('computes priorityScore and quick_win quadrant for high-value low-effort items', async () => {
    const doc = await TechDebtModel.create({ title: 'Quick win', impactScore: 8, riskScore: 8, effortScore: 2 });
    expect(doc.priorityScore).toBe(8); // (8+8)/2
    expect(doc.quadrant).toBe('quick_win');
  });

  it('classifies high-value high-effort as major_project', async () => {
    const doc = await TechDebtModel.create({ title: 'Big rewrite', impactScore: 9, riskScore: 9, effortScore: 9 });
    expect(doc.quadrant).toBe('major_project');
  });

  it('recomputes scores on update', async () => {
    const doc = await TechDebtModel.create({ title: 'Adjust', impactScore: 3, riskScore: 3, effortScore: 9 });
    expect(doc.quadrant).toBe('thankless');
    const updated = await TechDebtModel.findByIdAndUpdate(doc._id, { impactScore: 9, riskScore: 9, effortScore: 2 }, { new: true });
    expect(updated?.quadrant).toBe('quick_win');
  });
});
