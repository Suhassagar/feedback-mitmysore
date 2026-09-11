const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // Strict in production, relaxed for development testing
  message: { success: false, message: "Too many login attempts from this IP, please try again after 15 minutes." }
});

router.post('/admin-login', loginLimiter, authController.adminLogin);
router.post('/department-login', loginLimiter, authController.departmentLogin);
router.post('/faculty-login', loginLimiter, authController.facultyLogin);
router.post('/student-login', loginLimiter, authController.studentLogin);
router.post('/logout', authController.logout);
router.post('/logout-silent', authController.silentLogout);
router.get('/check-session', authController.checkSession);

module.exports = router;
