/**
 * URL and Dynamic Asset Protocol Sanitizer
 * Mitigates XSS, reverse tabnabbing, and dangerous protocol execution (javascript:, data:, vbscript:).
 */

const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

/**
 * Sanitizes an arbitrary URL string for safe use in <a> tags or navigation.
 * Blocks dangerous pseudoprotocols and protocol-relative URLs.
 * @param {string} url 
 * @returns {string} Sanitized URL or '#' if malicious/invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();

  // Block protocol-relative URLs (e.g. //attacker.com)
  if (trimmed.startsWith('//')) return '#';

  // Extract protocol if present
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex !== -1) {
    const protocol = trimmed.substring(0, colonIndex + 1).toLowerCase();
    if (DANGEROUS_PROTOCOLS.some(p => protocol.startsWith(p))) {
      return '#';
    }
    // Allow standard safe protocols
    if (protocol !== 'http:' && protocol !== 'https:' && protocol !== 'mailto:' && protocol !== 'tel:') {
      return '#';
    }
  }

  return trimmed;
}

/**
 * Validates dynamic image URLs (e.g. department logos, profile pictures).
 * Rejects non-image and malicious URI protocols.
 * @param {string} url 
 * @param {string} fallback 
 * @returns {string}
 */
export function safeImageUrl(url, fallback = '') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();

  // Block javascript, vbscript, or non-image data URIs
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return fallback;
  if (lower.startsWith('data:') && !lower.startsWith('data:image/')) return fallback;

  // Allow relative upload paths or http/https
  if (trimmed.startsWith('/') || lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:image/')) {
    return trimmed;
  }

  return fallback;
}
