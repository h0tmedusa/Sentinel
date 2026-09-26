/**
 * Shared HTTP helper utilities for Sentinel check modules.
 *
 * Consolidates duplicated fetch-wrapping, header collection, body truncation,
 * and throttling logic into a single importable module.
 */

/**
 * Collect all response headers into a lowercase-keyed plain object.
 * @param {Response} response - Fetch API Response object.
 * @returns {Record<string, string>}
 */
export function collectHeaders(response) {
  const out = {};
  for (const [key, value] of response.headers.entries()) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

/**
 * Truncate text with a suffix marker if it exceeds maxLen.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function truncateBody(text, maxLen = 500) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '... [truncated]';
}

/**
 * Returns a promise that resolves after `ms` milliseconds.
 * Used for self-throttling outbound request bursts.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps `fetch` with an AbortController-based timeout and uniform error handling.
 *
 * On success returns:
 *   { ok: true, response, headers, body, durationMs }
 *   where `body` is the raw text read from the response and `headers` is a
 *   lowercase-keyed plain object.
 *
 * On timeout or network error returns:
 *   { ok: false, error: string, timedOut: boolean }
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeoutMs — default 8 000 ms
 */
export async function safeFetch(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const durationMs = Date.now() - startTime;
    const headers = collectHeaders(response);
    const body = await response.text();

    return { ok: true, response, headers, body, durationMs };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      timedOut: err.name === 'AbortError',
    };
  } finally {
    clearTimeout(timer);
  }
}
