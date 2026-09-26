/**
 * Check: checkCookieSecurity
 * Category: session-handling
 *
 * Inspects cookies set by the application at:
 *   a) Root URL (normalizedUrl)
 *   b) OAuth token endpoint (${normalizedUrl}/api/oauth/token)
 *
 * For each cookie in the Set-Cookie header, verifies:
 *   - HttpOnly flag is present (prevents client-side script access via XSS) [CWE-1004]
 *   - Secure flag is present when on HTTPS (prevents transmission over unencrypted HTTP) [CWE-614]
 *   - SameSite attribute is present (mitigates Cross-Site Request Forgery) [CWE-1275]
 *
 * Produces one finding per missing attribute per cookie.
 */

import { safeFetch } from '@/lib/httpHelpers.js';

function parseCookieAttributes(cookieStr) {
  const parts = cookieStr.split(';').map((p) => p.trim());
  const nameVal = parts[0] || '';
  const eqIdx = nameVal.indexOf('=');
  const cookieName = eqIdx > 0 ? nameVal.substring(0, eqIdx).trim() : nameVal.trim();

  const lowerParts = parts.slice(1).map((p) => p.toLowerCase());
  const hasHttpOnly = lowerParts.some((p) => p === 'httponly');
  const hasSecure = lowerParts.some((p) => p === 'secure');
  const hasSameSite = lowerParts.some((p) => p.startsWith('samesite=') || p === 'samesite');

  return {
    cookieName,
    hasHttpOnly,
    hasSecure,
    hasSameSite,
    rawCookie: cookieStr,
  };
}

function extractCookieStrings(response, headers) {
  // If getSetCookie exists on modern Headers
  if (response && response.headers && typeof response.headers.getSetCookie === 'function') {
    const list = response.headers.getSetCookie();
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  }

  const rawHeader = headers['set-cookie'] || '';
  if (!rawHeader) return [];

  // Split multiple cookies: comma followed by whitespace and a valid cookie name=val token
  return rawHeader.split(/,\s*(?=[A-Za-z0-9_%-]+=[^;]+)/).map((s) => s.trim()).filter(Boolean);
}

export const checkCookieSecurity = {
  id: 'checkCookieSecurity',
  category: 'session-handling',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');
    const isHttps = normalizedUrl.startsWith('https:');

    const targets = [
      { url: normalizedUrl, label: 'Root Page' },
      { url: `${normalizedUrl}/api/oauth/token`, label: 'OAuth Token Endpoint' },
    ];

    for (const target of targets) {
      const result = await safeFetch(target.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Sentinel-Security-Scanner/1.0',
          'Accept': '*/*',
        },
        redirect: 'manual',
      });

      if (!result.ok) {
        // Silently skip if endpoint 404s, times out or errors
        continue;
      }

      const cookieStrings = extractCookieStrings(result.response, result.headers);
      if (cookieStrings.length === 0) continue;

      for (const cookieStr of cookieStrings) {
        const parsed = parseCookieAttributes(cookieStr);
        if (!parsed.cookieName) continue;

        // 1. Missing HttpOnly
        if (!parsed.hasHttpOnly) {
          findings.push({
            checkId: 'checkCookieSecurity',
            category: 'session-handling',
            cweId: 'CWE-1004',
            title: `Cookie Missing HttpOnly Flag: ${parsed.cookieName}`,
            description: `The cookie '${parsed.cookieName}' set by ${target.label} (${target.url}) is missing the 'HttpOnly' flag. Without HttpOnly, cookies are accessible to client-side scripts via document.cookie, making session tokens vulnerable to exfiltration if a Cross-Site Scripting (XSS) flaw exists.`,
            affectedComponent: `Cookie: ${parsed.cookieName} (${target.url})`,
            severity: 'medium',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              target: target.url,
              cookieName: parsed.cookieName,
              rawCookie: parsed.rawCookie,
              missingAttribute: 'HttpOnly',
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Send GET request to '${target.url}'.\n2. Inspect 'Set-Cookie' response header for '${parsed.cookieName}'.\n3. Observe absence of the 'HttpOnly' attribute.`,
            businessImpact: 'Session hijacking risk: compromised frontend components or XSS flaws can steal authenticated session credentials.',
            remediation: "Set the 'HttpOnly' flag on all sensitive or session-linked cookies in Set-Cookie headers.",
          });
        }

        // 2. Missing Secure (only flag on HTTPS targets)
        if (isHttps && !parsed.hasSecure) {
          findings.push({
            checkId: 'checkCookieSecurity',
            category: 'session-handling',
            cweId: 'CWE-614',
            title: `Cookie Missing Secure Flag: ${parsed.cookieName}`,
            description: `The cookie '${parsed.cookieName}' on HTTPS target ${target.label} (${target.url}) is missing the 'Secure' flag. Without the Secure flag, user agents may transmit the cookie over unencrypted HTTP connections if cleartext redirects or mixed content occur.`,
            affectedComponent: `Cookie: ${parsed.cookieName} (${target.url})`,
            severity: 'medium',
            referenceScore: 'CVSS:3.1/AV:A/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              target: target.url,
              cookieName: parsed.cookieName,
              rawCookie: parsed.rawCookie,
              missingAttribute: 'Secure',
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Send HTTPS GET request to '${target.url}'.\n2. Inspect 'Set-Cookie' header for '${parsed.cookieName}'.\n3. Observe absence of 'Secure' flag.`,
            businessImpact: 'Man-in-the-Middle network attackers could intercept sensitive session cookies transmitted in cleartext.',
            remediation: "Enforce the 'Secure' attribute on all cookies served over HTTPS.",
          });
        }

        // 3. Missing SameSite
        if (!parsed.hasSameSite) {
          findings.push({
            checkId: 'checkCookieSecurity',
            category: 'session-handling',
            cweId: 'CWE-1275',
            title: `Cookie Missing SameSite Attribute: ${parsed.cookieName}`,
            description: `The cookie '${parsed.cookieName}' set by ${target.label} (${target.url}) lacks an explicit 'SameSite' attribute (Strict or Lax). Without SameSite, the browser may send this cookie on cross-site requests, increasing vulnerability to Cross-Site Request Forgery (CSRF).`,
            affectedComponent: `Cookie: ${parsed.cookieName} (${target.url})`,
            severity: 'low',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              target: target.url,
              cookieName: parsed.cookieName,
              rawCookie: parsed.rawCookie,
              missingAttribute: 'SameSite',
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Send GET request to '${target.url}'.\n2. Inspect 'Set-Cookie' header for '${parsed.cookieName}'.\n3. Observe absence of 'SameSite=Lax' or 'SameSite=Strict'.`,
            businessImpact: 'Higher risk of Cross-Site Request Forgery (CSRF) if the application performs sensitive state mutations via authenticated requests.',
            remediation: "Set 'SameSite=Lax' or 'SameSite=Strict' on all stateful cookies.",
          });
        }
      }
    }

    return findings;
  },
};
