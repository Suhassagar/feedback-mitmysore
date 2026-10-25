const crypto = require('crypto');

/**
 * Institutional AES-256-CBC Field-Level Encryption Utility
 * Used for encrypting sensitive communication notes and audit records at rest.
 */

const IV_LENGTH = 16; // 16 bytes for AES block size

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error("Fatal Cryptographic Error: ENCRYPTION_SECRET or SESSION_SECRET must be configured with at least 16 characters.");
  }
  return crypto.scryptSync(secret.trim(), 'salt', 32);
}

/**
 * Encrypts plaintext string into an IV-prefixed hex string (ivHex:encryptedHex).
 * @param {string} text Plaintext to encrypt
 * @returns {string} Encrypted cipher string
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') return text;
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts an IV-prefixed hex string back to plaintext.
 * @param {string} cipherText Formatted as ivHex:encryptedHex
 * @returns {string} Decrypted plaintext or safe fallback
 */
function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  
  const parts = cipherText.split(':');
  // If not in iv:cipher format, return as-is (e.g., legacy unencrypted data)
  if (parts.length !== 2 || parts[0].length !== 32) {
    return cipherText;
  }
  
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (err) {
    console.error("Field Decryption Failed:", err.message);
    return "[Encrypted Message - Decryption Failed]";
  }
}

module.exports = {
  encrypt,
  decrypt
};
