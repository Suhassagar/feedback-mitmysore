const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const vaultController = require('../controllers/vaultController');
const { logSecurityAlert } = require('../utils/logger');

// Cryptographic Stealth Gate Secret Handshake
const STEALTH_GATE_SECRET = process.env.VAULT_GATE_SECRET || 'Mitm@AirGap@Stealth@2026';

/**
 * Stealth Gatekeeper Middleware
 * Any scanner, bot, or public caller lacking the secret handshake header receives HTTP 404 Not Found,
 * disguising the endpoint so it appears completely non-existent.
 */
const stealthGatekeeper = (req, res, next) => {
  const clientGate = req.headers['x-vault-stealth-gate'];
  if (!clientGate || clientGate !== STEALTH_GATE_SECRET) {
    return res.status(404).json({
      status: 404,
      error: "Not Found",
      message: `Cannot ${req.method} ${req.originalUrl}`
    });
  }
  next();
};

router.use(stealthGatekeeper);

// Strict rate limiter for Vault authentication attempts (Max 10 per 15 min per IP)
const vaultAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logSecurityAlert(
      req, 
      'VAULT', 
      'VAULT_RATE_LIMIT_EXCEEDED', 
      'Excessive Vault unlock attempts detected from this IP', 
      'CRITICAL'
    );
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many Vault unlock attempts from this IP. Gateway locked for 15 minutes.'
    });
  }
});

// Middleware: Authenticate Vault Bearer Token or Session
const isVaultAuthenticated = (req, res, next) => {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-vault-token']) {
    token = String(req.headers['x-vault-token']).trim();
  }

  if (token) {
    const verified = vaultController.verifyVaultToken(token);
    if (verified) {
      req.vaultUser = verified;
      return next();
    }
  }

  // Session fallback
  if (req.session?.vaultAuth?.authenticated) {
    req.vaultUser = {
      role: 'vault_operator',
      operator: req.session.vaultAuth.operator
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized. Vault session expired or invalid.'
  });
};

// --- Authentication (Stealth Gated + Rate Limited) ---
router.post('/auth', vaultAuthLimiter, vaultController.authenticateVault);

// --- Vault Protected God-Mode Operations ---
router.get('/check-auth', isVaultAuthenticated, vaultController.checkVaultAuth);
router.get('/overview', isVaultAuthenticated, vaultController.getVaultOverview);
router.get('/faculty', isVaultAuthenticated, vaultController.getFacultyList);

// Credential Recovery
router.post('/reset-admin', isVaultAuthenticated, vaultController.resetAdmin);
router.post('/reset-department', isVaultAuthenticated, vaultController.resetDepartment);
router.post('/reset-faculty', isVaultAuthenticated, vaultController.resetFaculty);

// Student God-Mode Control
router.get('/students', isVaultAuthenticated, vaultController.getStudentList);
router.post('/students/reset-submission', isVaultAuthenticated, vaultController.resetStudentSubmission);

// Session Master Circuit Breaker
router.post('/sessions/toggle-status', isVaultAuthenticated, vaultController.toggleSessionStatus);

// Engine & Queue Controls
router.get('/engine', isVaultAuthenticated, vaultController.getEngineStatus);
router.post('/engine/drain-queue', isVaultAuthenticated, vaultController.forceQueueDrain);
router.post('/engine/purge-cache', isVaultAuthenticated, vaultController.purgeCache);

// Audit Stream
router.get('/audit-stream', isVaultAuthenticated, vaultController.getAuditStream);

// Profile & Session Terminate
router.post('/profile', isVaultAuthenticated, vaultController.updateOperatorProfile);
router.post('/logout', isVaultAuthenticated, vaultController.logoutVault);

module.exports = router;
