const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { logSecurityAlert } = require('../utils/logger');

const createRateLimitHandler = (message, reason) => (req, res, next, options) => {
  logSecurityAlert(req, 'SECURITY', 'RATE_LIMIT_EXCEEDED', reason || (typeof message === 'string' ? message : JSON.stringify(message)), 'FAILED');
  res.status(options.statusCode).json(typeof message === 'string' ? { success: false, message } : message);
};

// 1. General API Rate Limiter
// Prevents basic abuse of general GET endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, 
  message: { error: "Too many requests, please try again later." }
});

// 2. Sensitive Endpoints Limiter
// Keyed by student USN / session when available, falling back to official IPv6-safe ipKeyGenerator.
// Uses a high ceiling (500) to support computer labs sharing a single NAT gateway IP.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, 
  keyGenerator: (req) => req.session?.usn || ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler({ error: "Too many requests to this endpoint, please try again later." }, "Excessive requests to sensitive endpoint")
});

// 3. Email Health Check Limiter (Protects SMTP server and prevents external blacklisting)
const emailHealthLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler({ success: false, message: "Too many email health check requests, please try again after 10 minutes." }, "Excessive email health check requests")
});

// 4. Faculty Registration Limiter (Prevents registration spam & DB pool exhaustion)
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler({ success: false, message: "Too many registration attempts from this IP, please try again after 15 minutes." }, "Excessive faculty registration attempts")
});

// 5. Profile Picture Upload Limiter (Prevents Cloudinary API credit & bandwidth burn)
const profileUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  keyGenerator: (req) => req.session?.faculty_id || ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler({ success: false, message: "Too many profile upload attempts, please try again after 15 minutes." }, "Excessive profile picture upload attempts")
});

// 6. Student Feedback Submission Limiter (Calibrated for real student workflows, max 30 courses/15min)
const feedbackSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  keyGenerator: (req) => req.session?.usn || ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler({ error: "Too many feedback submissions, please try again later." }, "Excessive student feedback submission attempts")
});

// 7. Privileged Administrative Login Limiter (Admin, Department, Faculty)
// Strict password brute-force defense (5 attempts per 15 min per IP in production)
const privilegedLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler(
    { success: false, message: "Too many login attempts from this IP, please try again after 15 minutes." },
    "Excessive privileged account login attempts from IP"
  )
});

// 8. Campus Lab NAT Gateway Surge Limiter (DDoS / Gateway Flooding Shield)
// Up to 1,200 total login attempts per 15 min per IP to permit 10+ concurrent college computer labs
const labSurgeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 1200 : 3000,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler(
    {
      success: false,
      message: "Campus network login limit exceeded. Please wait 2 minutes before signing in."
    },
    "Campus lab NAT gateway surge limit exceeded"
  )
});

// 9. Identity-Aware Student Login Limiter (Per-USN Account Protection)
// Keyed strictly by normalized USN; successful logins consume 0 quota
const studentLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    const rawUsn = req.body?.usn;
    if (rawUsn && typeof rawUsn === 'string' && rawUsn.trim().length >= 3) {
      return 10; // Max 10 failed login attempts per unique USN
    }
    return 20; // Max 20 attempts for empty/malformed USN probes per IP
  },
  keyGenerator: (req) => {
    const rawUsn = req.body?.usn;
    if (rawUsn && typeof rawUsn === 'string' && rawUsn.trim().length >= 3) {
      const cleanUsn = rawUsn.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      return `student_auth:${cleanUsn}`;
    }
    return `student_anon:${ipKeyGenerator(req.ip)}`;
  },
  skipSuccessfulRequests: true, // Legitimate successful logins do not decrement the budget
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler(
    { 
      success: false, 
      message: "Too many failed login attempts for this student ID. Please double-check your USN or wait 15 minutes." 
    }, 
    "Excessive student login attempts for specific USN"
  )
});

module.exports = {
  apiLimiter,
  sensitiveLimiter,
  emailHealthLimiter,
  registrationLimiter,
  profileUploadLimiter,
  feedbackSubmissionLimiter,
  privilegedLoginLimiter,
  labSurgeLimiter,
  studentLoginLimiter
};
