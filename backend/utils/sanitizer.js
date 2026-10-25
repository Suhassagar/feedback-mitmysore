/**
 * Institutional Input & Output Sanitization Utility
 * Mitigates SQL LIKE wildcard injection, CSV formula injection, indirect prompt injection, and HTML email injection.
 */

/**
 * Escapes SQL LIKE wildcard metacharacters (%, _, and \) so user search inputs are matched literally.
 * @param {string} str Untrusted search query
 * @returns {string} Sanitized string safe for SQL LIKE pattern
 */
function escapeSqlLike(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/([\\%_])/g, '\\$1');
}

/**
 * Sanitizes a cell value for CSV / Excel exports to prevent Formula Injection (CWE-1236).
 * Prepends a single quote if string starts with formula triggers (=, +, -, @, tab, return).
 * Doubles internal double quotes to maintain RFC-4180 CSV compliance.
 * @param {*} val Value to sanitize
 * @returns {string} Safe CSV cell string wrapped in quotes
 */
function sanitizeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  
  // Neutralize formula execution in spreadsheet applications
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  
  // Double internal quotes for CSV specification
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Encodes special characters into safe HTML entities to prevent HTML/Markup injection in emails.
 * @param {string} str Untrusted text
 * @returns {string} HTML-escaped string
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes untrusted user text before passing into an LLM prompt.
 * Strips pseudo-system tags and control delimiters to prevent prompt boundary breakouts.
 * @param {string} str Untrusted student/user feedback
 * @returns {string} Cleaned prompt text
 */
function sanitizePromptText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<\/?student_feedback_data>/gi, '')
    .replace(/<\/?feedback_remarks>/gi, '')
    .replace(/\[\/?(SYSTEM|ASSISTANT|USER)\]/gi, '')
    .replace(/<<\/?SYS>>/gi, '')
    .replace(/\[\/?INST\]/gi, '')
    .replace(/<\|im_start\|>|<\|im_end\|>/gi, '')
    .trim();
}

/**
 * Masks Personally Identifiable Information (PII) from qualitative feedback before feeding into an LLM context.
 * Masks:
 * 1. Email addresses
 * 2. 10-digit mobile phone numbers
 * 3. VTU / College student USN numbers (e.g. 1ME20CS001)
 * @param {string} text Feedback or query text
 * @returns {string} Text with PII masked
 */
function maskSensitivePii(text) {
  if (typeof text !== 'string') return '';
  return text
    // Mask emails
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, '[EMAIL MASKED]')
    // Mask mobile phone numbers (+91 optional, 10 digits starting with 6-9)
    .replace(/(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, '[PHONE MASKED]')
    // Mask VTU USN (e.g. 1ME20CS001, 4MH21IS045)
    .replace(/\b\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}\b/gi, '[USN MASKED]');
}

module.exports = {
  escapeSqlLike,
  sanitizeCsvCell,
  escapeHtml,
  sanitizePromptText,
  maskSensitivePii
};
