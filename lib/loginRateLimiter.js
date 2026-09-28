/**
 * In-memory login attempt rate limiter keyed by (IP + username).
 *
 * Prototype behavior:
 * 5 failed attempts within window -> temporary cooldown (lockout).
 * Failed attempts increment only on invalid credentials.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minute window
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minute cooldown

const attemptsStore = new Map();

/**
 * Clean up expired attempts from memory.
 */
function cleanupStore() {
  const now = Date.now();
  for (const [key, data] of attemptsStore.entries()) {
    if (now - data.lastAttempt > WINDOW_MS && (!data.lockoutUntil || now > data.lockoutUntil)) {
      attemptsStore.delete(key);
    }
  }
}

/**
 * Check if the given ip and username are currently locked out.
 * @param {string} ip
 * @param {string} username
 * @returns {{ isLocked: boolean, remainingMs: number }}
 */
export function checkLoginRateLimit(ip, username) {
  cleanupStore();
  const key = `${ip || 'unknown'}:${(username || '').toLowerCase()}`;
  const record = attemptsStore.get(key);

  if (!record) {
    return { isLocked: false, remainingMs: 0 };
  }

  const now = Date.now();
  if (record.lockoutUntil && record.lockoutUntil > now) {
    return { isLocked: true, remainingMs: record.lockoutUntil - now };
  }

  return { isLocked: false, remainingMs: 0 };
}

/**
 * Record a failed login attempt for ip + username.
 * If 5 failed attempts are reached, triggers cooldown lockout.
 * @param {string} ip
 * @param {string} username
 */
export function recordFailedLogin(ip, username) {
  cleanupStore();
  const key = `${ip || 'unknown'}:${(username || '').toLowerCase()}`;
  const now = Date.now();
  const record = attemptsStore.get(key) || { count: 0, firstAttempt: now, lastAttempt: now, lockoutUntil: 0 };

  // If outside window, reset count
  if (now - record.firstAttempt > WINDOW_MS && (!record.lockoutUntil || now > record.lockoutUntil)) {
    record.count = 1;
    record.firstAttempt = now;
    record.lockoutUntil = 0;
  } else {
    record.count += 1;
  }

  record.lastAttempt = now;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockoutUntil = now + COOLDOWN_MS;
  }

  attemptsStore.set(key, record);
}

/**
 * Clear failed login attempts upon successful authentication.
 * @param {string} ip
 * @param {string} username
 */
export function clearLoginAttempts(ip, username) {
  const key = `${ip || 'unknown'}:${(username || '').toLowerCase()}`;
  attemptsStore.delete(key);
}
