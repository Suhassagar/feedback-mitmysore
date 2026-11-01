const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  privilegedLoginLimiter,
  labSurgeLimiter,
  studentLoginLimiter
} = require('../middleware/rateLimiter');

// Strict brute-force defense for administrative accounts with passwords
router.post('/admin-login', privilegedLoginLimiter, authController.adminLogin);
router.post('/department-login', privilegedLoginLimiter, authController.departmentLogin);
router.post('/faculty-login', privilegedLoginLimiter, authController.facultyLogin);

// High-capacity lab NAT surge limiter + per-USN identity limiter for student logins
router.post('/student-login', labSurgeLimiter, studentLoginLimiter, authController.studentLogin);

router.post('/logout', authController.logout);
router.post('/logout-silent', authController.silentLogout);
router.get('/check-session', authController.checkSession);

module.exports = router;

