import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();
const prefix = '/api/v1';

describe('Auth flow (integration)', () => {
  const creds = { name: 'Test User', email: 'test@eos.dev', password: 'Password123!' };

  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post(`${prefix}/auth/register`).send(creds);
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(creds.email);
  });

  it('rejects duplicate registration', async () => {
    await request(app).post(`${prefix}/auth/register`).send(creds);
    const res = await request(app).post(`${prefix}/auth/register`).send(creds);
    expect(res.status).toBe(409);
  });

  it('logs in and accesses a protected route', async () => {
    await request(app).post(`${prefix}/auth/register`).send(creds);
    const login = await request(app).post(`${prefix}/auth/login`).send({ email: creds.email, password: creds.password });
    expect(login.status).toBe(200);

    const me = await request(app).get(`${prefix}/auth/me`).set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(creds.email);
  });

  it('rejects protected route without token', async () => {
    const res = await request(app).get(`${prefix}/users`);
    expect(res.status).toBe(401);
  });

  it('rotates refresh tokens', async () => {
    await request(app).post(`${prefix}/auth/register`).send(creds);
    const login = await request(app).post(`${prefix}/auth/login`).send({ email: creds.email, password: creds.password });
    const refresh = await request(app).post(`${prefix}/auth/refresh`).send({ refreshToken: login.body.data.refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.accessToken).toBeDefined();
  });

  it('rejects invalid credentials', async () => {
    await request(app).post(`${prefix}/auth/register`).send(creds);
    const res = await request(app).post(`${prefix}/auth/login`).send({ email: creds.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
