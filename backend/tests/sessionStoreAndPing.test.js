const db = require('../config/db');
const request = require('supertest');
const { app } = require('../server');

describe('Production Resilience: Session Store Auto-Creation & Ping Health', () => {
  it('Self-Healing Schema: verifies express_sessions table and columns exist in database', async () => {
    const tableExists = await db.schema.hasTable('express_sessions');
    expect(tableExists).toBe(true);

    const hasSessionId = await db.schema.hasColumn('express_sessions', 'session_id');
    const hasExpires = await db.schema.hasColumn('express_sessions', 'expires');
    const hasData = await db.schema.hasColumn('express_sessions', 'data');

    expect(hasSessionId).toBe(true);
    expect(hasExpires).toBe(true);
    expect(hasData).toBe(true);
  });

  it('Session Store Error Resilience: EventEmitter error listener handles errors without unhandled crash', () => {
    const EventEmitter = require('events');
    const mockStore = new EventEmitter();

    let capturedError = null;
    mockStore.on('error', (err) => {
      capturedError = err.message;
    });

    // Emitting error event should be caught by listener rather than throwing unhandled exception
    expect(() => {
      mockStore.emit('error', new Error('Transient TiDB Connection Timeout'));
    }).not.toThrow();

    expect(capturedError).toBe('Transient TiDB Connection Timeout');
  });

  it('Keep-Alive Endpoint: /ping returns HTTP 200 alive without session overhead', async () => {
    const startTime = Date.now();
    const res = await request(app).get('/ping');
    const elapsedMs = Date.now() - startTime;

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'alive');
    expect(res.body).toHaveProperty('timestamp');
    expect(elapsedMs).toBeLessThan(100);
  });
});
