const rateLimit = require('express-rate-limit');

// 1. General API Rate Limiter
// Prevents basic abuse of general GET endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, 
  message: { error: "Too many requests, please try again later." }
});

// 2. Sensitive Endpoints Limiter
// Keyed by student USN / session when available, with higher ceiling (500)
// to prevent blocking college computer labs sharing a single NAT gateway IP.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, 
  keyGenerator: (req) => req.session?.usn || req.ip,
  validate: { keyGeneratorIpFallback: false },
  message: { error: "Too many requests to this endpoint, please try again later." }
});

module.exports = {
  apiLimiter,
  sensitiveLimiter
};
