import crypto from 'crypto';

/**
 * Hash a password using scrypt and a random 16-byte salt.
 * @param {string} password 
 * @returns {string} salt:derivedKeyHex
 */
export function hashPassword(password) {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a candidate password against a stored salt:hash string (with plaintext fallback for migration).
 * @param {string} password 
 * @param {string} storedHash 
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  
  // Backward compatibility / fallback for non-salted strings
  if (!storedHash.includes(':')) {
    return password === storedHash;
  }

  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    console.error('Password verification error:', err.message);
    return false;
  }
}
