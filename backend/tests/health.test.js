const request = require('supertest');
const { app, server } = require('../server');

describe('Keep-Alive & Health Endpoints', () => {
  afterAll(() => {
    server.close();
  });

  it('GET /ping should respond with status 200 and alive status without DB dependency', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health should respond with status 200 and uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /health/email should verify SMTP configuration and respond with diagnostics', async () => {
    const res = await request(app).get('/health/email');
    expect(res.body).toHaveProperty('configured');
    expect(res.body).toHaveProperty('timestamp');
  });
});
