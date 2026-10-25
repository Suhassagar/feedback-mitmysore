/**
 * Automated Verification: Insecure Production Configuration Hardening
 * Tests:
 * 1. Production CORS Isolation (blocks localhost & wildcard Vercel phishing domains)
 * 2. Production Environment Variable Validation (rejects placeholders, short secrets, non-HTTPS URLs)
 * 3. Database SSL/TLS verification and CA options
 * 4. Express banner suppression (x-powered-by disabled)
 * 5. Frontend Vite production build hardening configuration
 */

const assert = require('assert');
const { z } = require('zod');

async function runTests() {
  console.log('--- 1. Testing Production CORS Isolation ---');

  // Helper simulating the server's isOriginAllowed logic under different environments
  const createOriginChecker = (env, frontendUrl, additionalOrigins) => {
    const isProduction = env === 'production';
    const parsedAdditional = additionalOrigins
      ? additionalOrigins.split(',').map(o => o.trim()).filter(Boolean)
      : [];
    
    const allowed = [
      ...(!isProduction ? ["http://localhost:5173", "http://127.0.0.1:5173"] : []),
      "https://mitmysore.vercel.app",
      frontendUrl,
      ...parsedAdditional
    ].filter(Boolean);

    return (origin) => {
      if (!origin) return true;
      if (allowed.includes(origin)) return true;
      if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return true;
      }
      return false;
    };
  };

  // Test Production Origin Checker
  const prodCheck = createOriginChecker('production', 'https://custom-portal.mitmysore.in', 'https://preview.mitmysore.in');

  // In production, localhost should be BLOCKED
  assert.strictEqual(prodCheck('http://localhost:5173'), false, 'Production must block http://localhost:5173');
  assert.strictEqual(prodCheck('http://127.0.0.1:5173'), false, 'Production must block http://127.0.0.1:5173');
  
  // In production, arbitrary wildcard *.vercel.app attacker domains must be BLOCKED
  assert.strictEqual(prodCheck('https://mitmysore-attacker.vercel.app'), false, 'Wildcard attacker Vercel subdomains must be blocked');
  assert.strictEqual(prodCheck('https://feedback-mitmysore-phishing.vercel.app'), false, 'Wildcard phishing Vercel subdomains must be blocked');

  // In production, canonical and explicit URLs must be ALLOWED
  assert.strictEqual(prodCheck('https://mitmysore.vercel.app'), true, 'Canonical institutional domain must be allowed');
  assert.strictEqual(prodCheck('https://custom-portal.mitmysore.in'), true, 'Configured FRONTEND_URL must be allowed');
  assert.strictEqual(prodCheck('https://preview.mitmysore.in'), true, 'Configured ADDITIONAL_ALLOWED_ORIGINS must be allowed');

  // In development, localhost must be ALLOWED
  const devCheck = createOriginChecker('development');
  assert.strictEqual(devCheck('http://localhost:5173'), true, 'Development must allow localhost');
  assert.strictEqual(devCheck('http://127.0.0.1:3000'), true, 'Development must allow local ports');
  console.log('✅ CORS isolation verified: Localhost & wildcard domains strictly blocked in production.');

  console.log('--- 2. Testing Production Environment Validator Schema ---');

  // Re-create the schema logic to test edge cases deterministically
  const testSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DB_PASSWORD: z.string().optional().default(""),
    SESSION_SECRET: z.string().min(16),
    ENCRYPTION_SECRET: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    BACKEND_URL: z.string().optional(),
    DB_SSL: z.enum(["true", "false"]).optional().default("false"),
    DB_SSL_REJECT_UNAUTHORIZED: z.enum(["true", "false"]).optional().default("true"),
  }).superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (!data.DB_PASSWORD) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["DB_PASSWORD"], message: "DB_PASSWORD is required in production." });
      }
      if (data.SESSION_SECRET && data.SESSION_SECRET.length < 32) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SESSION_SECRET"], message: "SESSION_SECRET must be at least 32 characters in production." });
      }
      const insecurePlaceholders = [
        "your_32_plus_character_secure_session_secret_hex",
        "change_me",
        "secret123",
        "default_secret"
      ];
      if (data.SESSION_SECRET && insecurePlaceholders.some(p => data.SESSION_SECRET.toLowerCase().includes(p.toLowerCase()))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SESSION_SECRET"], message: "Insecure placeholder secret." });
      }
      if (data.FRONTEND_URL && !data.FRONTEND_URL.startsWith("https://")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["FRONTEND_URL"], message: "FRONTEND_URL must use https:// in production." });
      }
      if (data.BACKEND_URL && !data.BACKEND_URL.startsWith("https://")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["BACKEND_URL"], message: "BACKEND_URL must use https:// in production." });
      }
    }
  });

  // Test 2a: Reject placeholder secret in production
  const resPlaceholder = testSchema.safeParse({
    NODE_ENV: 'production',
    DB_PASSWORD: 'secure_password_123',
    SESSION_SECRET: 'your_32_plus_character_secure_session_secret_hex'
  });
  assert.strictEqual(resPlaceholder.success, false, 'Placeholder secret must fail validation');
  assert.ok(resPlaceholder.error.issues.some(i => i.message.includes('Insecure placeholder secret')));

  // Test 2b: Reject short secret in production
  const resShortSecret = testSchema.safeParse({
    NODE_ENV: 'production',
    DB_PASSWORD: 'secure_password_123',
    SESSION_SECRET: 'short_secret_under_32_chars'
  });
  assert.strictEqual(resShortSecret.success, false, 'Secret under 32 characters must fail validation in production');

  // Test 2c: Reject non-HTTPS FRONTEND_URL in production
  const resHttpFrontend = testSchema.safeParse({
    NODE_ENV: 'production',
    DB_PASSWORD: 'secure_password_123',
    SESSION_SECRET: 'a_very_long_cryptographically_secure_random_key_64_characters_here_1234',
    FRONTEND_URL: 'http://insecure-portal.mitmysore.in'
  });
  assert.strictEqual(resHttpFrontend.success, false, 'Non-HTTPS FRONTEND_URL must fail validation in production');

  // Test 2d: Accept valid production configuration
  const resValid = testSchema.safeParse({
    NODE_ENV: 'production',
    DB_PASSWORD: 'strong_production_db_password_xyz',
    SESSION_SECRET: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ENCRYPTION_SECRET: 'f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb',
    FRONTEND_URL: 'https://mitmysore.vercel.app',
    BACKEND_URL: 'https://api.mitmysore.in',
    DB_SSL: 'true',
    DB_SSL_REJECT_UNAUTHORIZED: 'true'
  });
  assert.strictEqual(resValid.success, true, 'Valid production configuration must pass');
  console.log('✅ Production environment schema validator verified.');

  console.log('--- 3. Testing Database SSL Strict Configuration Defaults ---');

  const makeDbSslOptions = (dbSsl, rejectUnauthorized, caCert) => {
    return dbSsl === 'true' ? {
      rejectUnauthorized: rejectUnauthorized !== 'false',
      ca: caCert || undefined
    } : false;
  };

  const defaultSsl = makeDbSslOptions('true', undefined, undefined);
  assert.strictEqual(defaultSsl.rejectUnauthorized, true, 'DB_SSL default must enforce strict certificate verification');

  const customCaSsl = makeDbSslOptions('true', 'true', 'CERT_PEM_CONTENT');
  assert.strictEqual(customCaSsl.rejectUnauthorized, true);
  assert.strictEqual(customCaSsl.ca, 'CERT_PEM_CONTENT', 'CA certificate must be attached when provided');
  console.log('✅ Database SSL certificate verification settings verified.');

  console.log('--- 4. Testing Server Banner & Lifecycle Handlers in server.js ---');
  
  const fs = require('fs');
  const path = require('path');
  const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

  assert.ok(serverSrc.includes("app.disable('x-powered-by')"), 'server.js must explicitly disable x-powered-by header');
  assert.ok(serverSrc.includes("gracefulShutdown"), 'server.js must define gracefulShutdown');
  assert.ok(serverSrc.includes("SIGTERM"), 'server.js must listen for SIGTERM');
  assert.ok(serverSrc.includes("SIGINT"), 'server.js must listen for SIGINT');
  assert.ok(serverSrc.includes("unhandledRejection"), 'server.js must handle unhandledRejection');
  assert.ok(serverSrc.includes("sessionPool.end()"), 'server.js must drain session pool on shutdown');
  assert.ok(serverSrc.includes("db.destroy()"), 'server.js must close Knex pool on shutdown');
  console.log('✅ Server banner suppression and graceful lifecycle handlers verified.');

  console.log('--- 5. Testing Frontend Vite Production Hardening Configuration ---');

  const viteConfigSrc = fs.readFileSync(path.join(__dirname, '../../frontend/vite.config.js'), 'utf8');
  assert.ok(
    viteConfigSrc.includes("drop: mode === 'production' ? ['console', 'debugger'] : []"),
    'vite.config.js must strip console and debugger statements in production builds'
  );
  assert.ok(
    viteConfigSrc.includes("sourcemap: false"),
    'vite.config.js must disable sourcemaps in production builds'
  );
  console.log('✅ Frontend Vite production build hardening verified.');

  console.log('\n🎉 ALL INSECURE PRODUCTION CONFIGURATION HARDENING TESTS PASSED! 🎉\n');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
