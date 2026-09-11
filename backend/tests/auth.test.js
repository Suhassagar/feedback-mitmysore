const request = require('supertest');
const { app, server } = require('../server');

describe('Auth API Endpoints', () => {
  afterAll(() => {
    // Close the server and DB connections after tests to prevent hanging
    server.close();
  });

  describe('POST /auth/admin-login', () => {
    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/admin-login')
        .send({
          username: 'wronguser',
          password: 'wrongpassword',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid username or password');
    });
  });

  describe('GET /auth/check-session', () => {
    it('should return no active session when not logged in', async () => {
      const response = await request(app).get('/auth/check-session');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No active session');
    });
  });
});
