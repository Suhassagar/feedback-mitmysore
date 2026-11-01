const request = require('supertest');
const { app } = require('../server');
const db = require('../config/db');

describe('Air-Gapped Vault: Stealth Gatekeeper & God-Mode Engine Operations', () => {
  const STEALTH_SECRET = process.env.VAULT_GATE_SECRET || 'Mitm@AirGap@Stealth@2026';
  const MASTER_KEY = process.env.MASTER_VAULT_KEY || 'Mitm@Vault2026!BreakGlass';

  it('Stealth Cloaking: Request without X-Vault-Stealth-Gate returns HTTP 404 Not Found', async () => {
    const res = await request(app)
      .post('/vault/auth')
      .send({
        masterKey: MASTER_KEY,
        username: 'suhassagar',
        password: 'any'
      });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('status', 404);
    expect(res.body.message).toContain('Cannot POST /vault/auth');
  });

  it('Stealth Gatekeeper: Request with valid X-Vault-Stealth-Gate bypasses 404 and checks auth', async () => {
    const res = await request(app)
      .post('/vault/auth')
      .set('X-Vault-Stealth-Gate', STEALTH_SECRET)
      .send({
        masterKey: 'WrongMasterKey',
        username: 'suhassagar',
        password: 'any'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid Master Vault Key');
  });

  it('Triple-Factor Authentication: returns Bearer token when credentials match', async () => {
    const res = await request(app)
      .post('/vault/auth')
      .set('X-Vault-Stealth-Gate', STEALTH_SECRET)
      .send({
        masterKey: MASTER_KEY,
        username: 'suhassagar',
        password: 'suhas@6767'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.operator).toHaveProperty('username', 'suhassagar');
  });

  it('God-Mode Engine Telemetry: GET /vault/engine returns live operational metrics', async () => {
    // 1. Authenticate to get token
    const authRes = await request(app)
      .post('/vault/auth')
      .set('X-Vault-Stealth-Gate', STEALTH_SECRET)
      .send({
        masterKey: MASTER_KEY,
        username: 'suhassagar',
        password: 'suhas@6767'
      });

    const token = authRes.body.token;

    // 2. Fetch Engine status
    const engineRes = await request(app)
      .get('/vault/engine')
      .set('X-Vault-Stealth-Gate', STEALTH_SECRET)
      .set('Authorization', `Bearer ${token}`);

    expect(engineRes.status).toBe(200);
    expect(engineRes.body.success).toBe(true);
    expect(engineRes.body.engine).toHaveProperty('uptime');
    expect(engineRes.body.engine).toHaveProperty('memory');
    expect(engineRes.body.engine).toHaveProperty('queue');
  });

  it('God-Mode Queue Drain & Cache Purge: executes safely under vault authentication', async () => {
    const authRes = await request(app)
      .post('/vault/auth')
      .set('X-Vault-Stealth-Gate', STEALTH_SECRET)
      .send({
        masterKey: MASTER_KEY,
        username: 'suhassagar',
        password: 'suhas@6767'
      });

    const token = authRes.body.token;

    // Force Queue Drain
    const drainRes = await request(app)
      .post('/vault/engine/drain-queue')
      .set('X-Vault-Stealth-Gate', STEALTH_SECRET)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(drainRes.status).toBe(200);
    expect(drainRes.body.success).toBe(true);

    // Cache Purge
    const purgeRes = await request(app)
      .post('/vault/engine/purge-cache')
      .set('X-Vault-Stealth-Gate', STEALTH_SECRET)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(purgeRes.status).toBe(200);
    expect(purgeRes.body.success).toBe(true);
  });
});
