import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();
const prefix = '/api/v1';

async function authedToken(role = 'engineering_manager') {
  await request(app)
    .post(`${prefix}/auth/register`)
    .send({ name: 'Mgr', email: `mgr-${role}@eos.dev`, password: 'Password123!', role });
  const login = await request(app).post(`${prefix}/auth/login`).send({ email: `mgr-${role}@eos.dev`, password: 'Password123!' });
  return login.body.data.accessToken as string;
}

describe('Incidents (integration)', () => {
  it('creates an incident with an initial timeline entry and computes MTTR on resolve', async () => {
    const token = await authedToken();
    const create = await request(app)
      .post(`${prefix}/incidents`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'DB connection pool exhausted', severity: 'SEV2' });
    expect(create.status).toBe(201);
    expect(create.body.data.timeline).toHaveLength(1);

    const id = create.body.data._id ?? create.body.data.id;
    const resolve = await request(app)
      .patch(`${prefix}/incidents/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved' });
    expect(resolve.status).toBe(200);
    expect(resolve.body.data.resolvedAt).toBeDefined();
    expect(typeof resolve.body.data.mttrMinutes).toBe('number');
  });

  it('paginates and filters by severity', async () => {
    const token = await authedToken();
    await request(app).post(`${prefix}/incidents`).set('Authorization', `Bearer ${token}`).send({ title: 'Alpha outage', severity: 'SEV1' });
    await request(app).post(`${prefix}/incidents`).set('Authorization', `Bearer ${token}`).send({ title: 'Bravo degradation', severity: 'SEV3' });

    const res = await request(app).get(`${prefix}/incidents?severity=SEV1&limit=10`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((i: { severity: string }) => i.severity === 'SEV1')).toBe(true);
    expect(res.body.meta.total).toBe(1);
  });
});
