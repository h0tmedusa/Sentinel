import crypto from 'node:crypto';

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 64,
};

/**
 * Hash a plaintext password using crypto.scrypt with a secure random salt.
 * Formats output as: saltHex:keyHex
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, SCRYPT_PARAMS.keyLen, { N: SCRYPT_PARAMS.N, r: SCRYPT_PARAMS.r, p: SCRYPT_PARAMS.p }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a password against a stored saltHex:keyHex string using timingSafeEqual.
 * @param {string} password
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== 'string') return false;
  const [saltHex, keyHex] = storedHash.split(':');
  if (!saltHex || !keyHex) return false;

  return new Promise((resolve) => {
    try {
      const salt = Buffer.from(saltHex, 'hex');
      const expectedKey = Buffer.from(keyHex, 'hex');

      crypto.scrypt(password, salt, expectedKey.length, { N: SCRYPT_PARAMS.N, r: SCRYPT_PARAMS.r, p: SCRYPT_PARAMS.p }, (err, derivedKey) => {
        if (err) return resolve(false);
        if (derivedKey.length !== expectedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(derivedKey, expectedKey));
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Sign a session payload with HMAC-SHA256.
 * Format: base64url(payload).signature
 * @param {object} payload
 * @returns {string}
 */
export function signSession(payload) {
  const secret = process.env.AUTH_SECRET || 'sentinel-dev-prototype-auth-secret-change-in-prod';
  const payloadStr = JSON.stringify(payload);
  const encodedPayload = Buffer.from(payloadStr).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and parse a signed session token.
 * Returns decoded payload if valid and untampered, or null.
 * @param {string} token
 * @returns {object|null}
 */
export function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const secret = process.env.AUTH_SECRET || 'sentinel-dev-prototype-auth-secret-change-in-prod';
  const expectedSignature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr);

    if (!payload.userId || !payload.role) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
