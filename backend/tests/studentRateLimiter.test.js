const express = require('express');
const supertest = require('supertest');
const {
  studentLoginLimiter,
  labSurgeLimiter,
  privilegedLoginLimiter
} = require('../middleware/rateLimiter');

describe('Campus Lab Student Login Rate Limiter & NAT Immunity', () => {

  it('Lab Concurrency: Allows 50 distinct students from the exact same IP address without 429 lockout', async () => {
    const app = express();
    app.use(express.json());
    // Mount dual-tier limiter
    app.post('/api/student-login', labSurgeLimiter, studentLoginLimiter, (req, res) => {
      // Simulate successful login
      res.json({ success: true, usn: req.body.usn });
    });

    const client = supertest(app);
    const sharedLabIp = '103.112.45.10';

    // Simulate 50 distinct students in a computer lab logging in simultaneously from the same public IP
    for (let i = 1; i <= 50; i++) {
      const usn = `4MH21CS${String(i).padStart(3, '0')}`;
      const res = await client
        .post('/api/student-login')
        .set('X-Forwarded-For', sharedLabIp)
        .send({ usn, session_id: 'SESS_LAB_2026' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('Per-Identity Guard: Blocks excessive failed login attempts (>10) for a single specific USN', async () => {
    const app = express();
    app.use(express.json());
    // Simulate failed login attempts (status 404 or 401)
    app.post('/api/student-login', labSurgeLimiter, studentLoginLimiter, (req, res) => {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    });

    const client = supertest(app);
    const targetUsn = '4MH21CS999';

    // Attempts 1 to 10 should fail with 401 (not rate limited yet)
    for (let attempt = 1; attempt <= 10; attempt++) {
      const res = await client
        .post('/api/student-login')
        .send({ usn: targetUsn, session_id: 'WRONG_SESSION' });

      expect(res.status).toBe(401);
    }

    // 11th failed attempt for this specific USN must be blocked with HTTP 429
    const blockedRes = await client
      .post('/api/student-login')
      .send({ usn: targetUsn, session_id: 'WRONG_SESSION' });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.message).toContain('Too many failed login attempts for this student ID');
  });

  it('Lab Immunity: A blocked USN does NOT block other students on the same computer lab IP', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/student-login', labSurgeLimiter, studentLoginLimiter, (req, res) => {
      if (req.body.usn === '4MH21CS_ATTACKER') {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      return res.json({ success: true, usn: req.body.usn });
    });

    const client = supertest(app);
    const sharedLabIp = '103.112.45.10';

    // Attacker on terminal 1 exhausts their 10 attempts
    for (let attempt = 1; attempt <= 10; attempt++) {
      await client
        .post('/api/student-login')
        .set('X-Forwarded-For', sharedLabIp)
        .send({ usn: '4MH21CS_ATTACKER', session_id: 'TEST' });
    }

    // Attacker is now blocked
    const attackerBlocked = await client
      .post('/api/student-login')
      .set('X-Forwarded-For', sharedLabIp)
      .send({ usn: '4MH21CS_ATTACKER', session_id: 'TEST' });
    expect(attackerBlocked.status).toBe(429);

    // Honest student on terminal 2 on the SAME IP should log in without issue
    const honestStudentRes = await client
      .post('/api/student-login')
      .set('X-Forwarded-For', sharedLabIp)
      .send({ usn: '4MH21CS088', session_id: 'TEST' });

    expect(honestStudentRes.status).toBe(200);
    expect(honestStudentRes.body.success).toBe(true);
  });

  it('Privileged Defense: Administrative accounts strictly block after ceiling', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/admin-login', privilegedLoginLimiter, (req, res) => {
      res.status(401).json({ success: false, message: 'Invalid password' });
    });

    const client = supertest(app);
    const limit = process.env.NODE_ENV === 'production' ? 5 : 100;

    for (let i = 1; i <= limit; i++) {
      const res = await client.post('/api/admin-login').send({ username: 'admin', password: 'wrong' });
      expect(res.status).toBe(401);
    }

    // Next request must be throttled with 429
    const blocked = await client.post('/api/admin-login').send({ username: 'admin', password: 'wrong' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toContain('Too many login attempts from this IP');
  });

});
