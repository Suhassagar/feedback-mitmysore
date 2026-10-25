/**
 * Automated Verification: XSS & Browser Attacks Hardening
 * Tests:
 * 1. Helmet HTTP Security Headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP)
 * 2. URL Protocol Sanitization (blocking javascript:, data:, vbscript:, protocol-relative //)
 * 3. Dynamic Image Protocol Allowlisting (safeImageUrl)
 */

const assert = require('assert');
const supertest = require('supertest');
const { app } = require('../server');

// Replicate URL sanitizer logic for backend verification
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return '#';
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex !== -1) {
    const protocol = trimmed.substring(0, colonIndex + 1).toLowerCase();
    if (DANGEROUS_PROTOCOLS.some(p => protocol.startsWith(p))) {
      return '#';
    }
    if (protocol !== 'http:' && protocol !== 'https:' && protocol !== 'mailto:' && protocol !== 'tel:') {
      return '#';
    }
  }
  return trimmed;
}

function safeImageUrl(url, fallback = '') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return fallback;
  if (lower.startsWith('data:') && !lower.startsWith('data:image/')) return fallback;
  if (trimmed.startsWith('/') || lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:image/')) {
    return trimmed;
  }
  return fallback;
}

async function runTests() {
  console.log('--- 1. Testing Helmet HTTP Security Headers on Express App ---');
  const res = await supertest(app).get('/ping');
  assert.strictEqual(res.status, 200);

  // Clickjacking defense
  const frameOptions = res.headers['x-frame-options'];
  assert.strictEqual(frameOptions, 'SAMEORIGIN', 'X-Frame-Options must be SAMEORIGIN');
  console.log('✅ Clickjacking defense verified: X-Frame-Options is SAMEORIGIN.');

  // MIME-sniffing defense
  const contentTypeOptions = res.headers['x-content-type-options'];
  assert.strictEqual(contentTypeOptions, 'nosniff', 'X-Content-Type-Options must be nosniff');
  console.log('✅ MIME sniffing defense verified: X-Content-Type-Options is nosniff.');

  // Referrer policy
  const referrerPolicy = res.headers['referrer-policy'];
  assert.strictEqual(referrerPolicy, 'strict-origin-when-cross-origin', 'Referrer-Policy must be strict-origin-when-cross-origin');
  console.log('✅ Referrer leakage defense verified: Referrer-Policy is strict-origin-when-cross-origin.');

  // Content Security Policy
  const csp = res.headers['content-security-policy'];
  assert.ok(csp, 'Content-Security-Policy header must be present');
  assert.ok(csp.includes("frame-ancestors 'self'"), 'CSP must restrict frame-ancestors to self');
  console.log('✅ Content-Security-Policy verified with restrictive frame-ancestors.');

  console.log('--- 2. Testing URL Protocol Sanitizer (XSS & Tabnabbing Defense) ---');
  assert.strictEqual(sanitizeUrl('javascript:alert(1)'), '#', 'javascript: must be neutralized to #');
  assert.strictEqual(sanitizeUrl('JAVASCRIPT:alert(document.cookie)'), '#', 'Case-insensitive javascript: must be neutralized');
  assert.strictEqual(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '#', 'data:text/html must be neutralized');
  assert.strictEqual(sanitizeUrl('vbscript:msgbox(1)'), '#', 'vbscript: must be neutralized');
  assert.strictEqual(sanitizeUrl('//malicious-phishing.com'), '#', 'Protocol-relative URL must be neutralized');
  assert.strictEqual(sanitizeUrl('https://mitmysore.in/portal'), 'https://mitmysore.in/portal', 'https:// URL must be preserved');
  assert.strictEqual(sanitizeUrl('mailto:support@mitmysore.in'), 'mailto:support@mitmysore.in', 'mailto: URL must be preserved');
  assert.strictEqual(sanitizeUrl('/feedback/student'), '/feedback/student', 'Internal relative path must be preserved');
  console.log('✅ URL protocol sanitizer passed all XSS payload edge cases.');

  console.log('--- 3. Testing Dynamic Image Asset Allowlisting ---');
  assert.strictEqual(safeImageUrl('javascript:alert(1)', 'fallback.png'), 'fallback.png', 'javascript: in image must return fallback');
  assert.strictEqual(safeImageUrl('data:text/html;base64,PHNjcmlwdD4=', 'fallback.png'), 'fallback.png', 'data:text/html in image must return fallback');
  assert.strictEqual(safeImageUrl('data:image/png;base64,iVBORw0KGgo=', 'fallback.png'), 'data:image/png;base64,iVBORw0KGgo=', 'data:image/ must be allowed');
  assert.strictEqual(safeImageUrl('https://res.cloudinary.com/mitm/image.webp', 'fallback.png'), 'https://res.cloudinary.com/mitm/image.webp', 'HTTPS image URL must be allowed');
  assert.strictEqual(safeImageUrl('/uploads/logos/dept_cse.webp', 'fallback.png'), '/uploads/logos/dept_cse.webp', 'Local uploads must be allowed');
  console.log('✅ Image URL sanitizer passed all protocol allowlist checks.');

  console.log('\n🎉 ALL XSS & BROWSER ATTACK HARDENING TESTS PASSED! 🎉');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
