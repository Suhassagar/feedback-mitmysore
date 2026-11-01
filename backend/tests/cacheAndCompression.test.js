const request = require('supertest');
const { app, server } = require('../server');
const cacheService = require('../services/cacheService');

describe('Phase 2: In-Memory TTL Cache & Compression Verification', () => {
  afterAll(() => {
    server.close();
  });

  describe('In-Memory Cache Service (cacheService)', () => {
    beforeEach(() => {
      cacheService.flush();
    });

    it('should store and retrieve data correctly', () => {
      cacheService.set('test:key', { message: 'hello world' }, 60);
      const data = cacheService.get('test:key');
      expect(data).toBeDefined();
      expect(data.message).toBe('hello world');
    });

    it('should delete keys matching wildcard patterns', () => {
      cacheService.set('questions:dept:CSE', [{ id: 1 }, { id: 2 }], 60);
      cacheService.set('questions:dept:ECE', [{ id: 3 }], 60);
      cacheService.set('sessions:dept:CSE', [{ id: 10 }], 60);

      // Invalidate all questions
      const deletedCount = cacheService.delPattern('questions:*');
      expect(deletedCount).toBe(2);

      expect(cacheService.get('questions:dept:CSE')).toBeUndefined();
      expect(cacheService.get('questions:dept:ECE')).toBeUndefined();
      // Sessions should remain intact
      expect(cacheService.get('sessions:dept:CSE')).toBeDefined();
    });

    it('should report cache stats for observability', () => {
      cacheService.set('departments:active', [{ dept: 'CSE' }], 60);
      const stats = cacheService.getStats();
      expect(stats.keys).toBe(1);
      expect(stats.stats).toBeDefined();
    });
  });

  describe('HTTP Response Compression', () => {
    it('should compress responses larger than 1KB with gzip when client supports gzip', async () => {
      // Mock large department data > 1KB
      const largeDepartments = Array.from({ length: 25 }, (_, i) => ({
        dept_id: `DEPT_${i}`,
        dept_name: `Department of Advanced Engineering and Information Sciences Division ${i}`,
        is_active: true,
        logo_url: `https://res.cloudinary.com/college/image/upload/v1234567/dept_${i}.png`,
        brand_color: '#0D1B2A',
        brand_accent: '#415A77',
        logo_lqip: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PC9zdmc+'
      }));

      // Cache under departments:active
      cacheService.set('departments:active', largeDepartments, 60);

      const res = await request(app)
        .get('/departments')
        .set('Accept-Encoding', 'gzip');

      // Should be served directly from RAM cache
      expect(res.headers['x-cache-status']).toBe('HIT');
      // Should have Content-Encoding: gzip
      expect(res.headers['content-encoding']).toBe('gzip');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(25);
    });

    it('should respect x-no-compression header and return uncompressed data', async () => {
      const largeDepartments = Array.from({ length: 25 }, (_, i) => ({
        dept_id: `DEPT_NOCOMP_${i}`,
        dept_name: `Department Division ${i}`,
        is_active: true,
        logo_url: `https://res.cloudinary.com/college/dept_${i}.png`
      }));
      cacheService.set('departments:active', largeDepartments, 60);

      const res = await request(app)
        .get('/departments')
        .set('Accept-Encoding', 'gzip')
        .set('x-no-compression', 'true');

      expect(res.headers['x-cache-status']).toBe('HIT');
      expect(res.headers['content-encoding']).toBeUndefined();
      expect(res.status).toBe(200);
    });
  });
});
