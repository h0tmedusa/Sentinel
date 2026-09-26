/**
 * URL parsing, normalization, and SSRF protection for Sentinel scan targets.
 *
 * This tool is designed to test local and staging targets (localhost, private LAN)
 * so those ranges are explicitly allowed. Only cloud metadata endpoints are blocked.
 */

const BLOCKED_HOSTNAMES = [
  '169.254.169.254',        // AWS / GCP / Azure instance metadata
  'metadata.google.internal', // GCP metadata alias
  '100.100.100.200',        // Alibaba Cloud metadata
];

/**
 * Parse, normalize and validate a raw target URL.
 *
 * - Trims whitespace; prepends `http://` if no protocol present.
 * - Validates via URL constructor.
 * - Blocks cloud metadata hostnames (SSRF protection).
 * - Strips query params and hash fragments from the base target URL.
 *
 * @param {string} rawUrl
 * @returns {{ normalizedUrl: string, hostname: string, port: string, protocol: string, pathname: string }}
 * @throws {Error} on invalid or blocked URLs
 */
export function parseAndNormalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Target URL is required and must be a non-empty string.');
  }

  let trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Target URL is required and must be a non-empty string.');
  }

  // Prepend http:// if no protocol present
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `http://${trimmed}`;
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    throw new Error(`Invalid target URL: "${rawUrl}". ${err.message}`);
  }

  // SSRF protection — block cloud metadata endpoints only
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error(
      `Blocked: "${hostname}" is a cloud metadata endpoint. ` +
      'Scanning cloud metadata services is not permitted.'
    );
  }

  // Build normalized URL: protocol + host + pathname (no query/hash)
  const normalizedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, '');

  return {
    normalizedUrl,
    hostname: parsed.hostname,
    port: parsed.port,
    protocol: parsed.protocol,
    pathname: parsed.pathname,
  };
}
