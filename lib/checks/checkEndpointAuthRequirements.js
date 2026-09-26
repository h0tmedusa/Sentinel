/**
 * Check 3: checkEndpointAuthRequirements
 * For each path in lib/checks/config/endpoints.js (current World Monitor candidateEndpoints):
 *
 * Condition A (No-key check):
 *   Request the endpoint with NO credentials attached.
 *   Flag any HTTP 200 with non-empty body → missing authentication gate.
 *   Severity: critical or high based on path/response keyword heuristic.
 *
 * Condition B (Invalid-key check):
 *   Request the same endpoint with an obviously invalid API key string.
 *   If HTTP 200 is returned, flag separately as "API Key Not Validated" —
 *   the key was present but not actually checked.
 *   Severity: always critical (broken key validation is worse than missing auth).
 *
 * Both findings use confidence: "confirmed" and carry full request/response evidence.
 */

import { candidateEndpoints, apiKeyConfig } from './config/endpoints.js';

function evaluateSeverity(path, bodyText) {
  const sensitiveKeywords = [
    'password', 'token', 'secret', 'key', 'credential', 'auth',
    'admin', 'session', 'hash', 'private', 'email', 'quota', 'grant',
    'entitlement', 'revoke', 'mcp', 'referral',
  ];
  const lowerPath = path.toLowerCase();
  const lowerBody = (bodyText || '').toLowerCase();

  const isSensitivePath =
    lowerPath.includes('user') ||
    lowerPath.includes('internal') ||
    lowerPath.includes('entitlement') ||
    lowerPath.includes('quota') ||
    lowerPath.includes('revoke') ||
    lowerPath.includes('grant') ||
    lowerPath.includes('referral') ||
    lowerPath.includes('notification') ||
    lowerPath.includes('mcp') ||
    lowerPath.includes('profile') ||
    lowerPath.includes('config') ||
    lowerPath.includes('admin') ||
    lowerPath.includes('secret');

  const containsSensitiveData = sensitiveKeywords.some((kw) => lowerBody.includes(kw));

  if (isSensitivePath && containsSensitiveData) {
    return {
      severity: 'critical',
      score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    };
  }

  return {
    severity: 'high',
    score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
  };
}

function parseBodySnippet(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (e) {
    if (rawText.length > 500) {
      return rawText.slice(0, 500) + '... [truncated]';
    }
    return rawText;
  }
}

async function probeEndpoint(endpointUrl, method, headers) {
  const responseHeaders = {};
  const startTime = Date.now();
  let response;
  let responseBody = '';

  try {
    response = await fetch(endpointUrl, {
      method,
      headers,
      redirect: 'manual',
    });

    for (const [key, value] of response.headers.entries()) {
      responseHeaders[key.toLowerCase()] = value;
    }

    responseBody = await response.text();
  } catch (err) {
    return null;
  }

  return {
    status: response.status,
    statusText: response.statusText,
    durationMs: Date.now() - startTime,
    headers: responseHeaders,
    rawBody: responseBody,
  };
}

export const checkEndpointAuthRequirements = {
  id: 'checkEndpointAuthRequirements',
  category: 'access-control',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');
    const invalidKey = apiKeyConfig.getInvalidKey();

    for (const ep of candidateEndpoints) {
      if (!ep.requiresAuth) continue;

      const endpointUrl = `${normalizedUrl}${ep.path}`;
      const method = ep.method || 'GET';

      // ── Condition A: No credentials at all ───────────────────────────────
      const noKeyHeaders = {
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Accept': 'application/json, text/plain, */*',
      };

      const noKeyResult = await probeEndpoint(endpointUrl, method, noKeyHeaders);
      if (!noKeyResult) continue; // host unreachable; skip this endpoint entirely

      const noKeyHasContent = noKeyResult.rawBody && noKeyResult.rawBody.trim().length > 0;

      if (noKeyResult.status === 200 && noKeyHasContent) {
        const { severity, score } = evaluateSeverity(ep.path, noKeyResult.rawBody);
        const bodySnippet = parseBodySnippet(noKeyResult.rawBody);

        findings.push({
          checkId: 'checkEndpointAuthRequirements',
          category: 'access-control',
          title: `Unauthenticated Access Permitted: ${ep.path}`,
          description: `The endpoint '${ep.path}' was requested without any credentials and returned HTTP 200 OK with application data instead of HTTP 401 Unauthorized or 403 Forbidden. Description: ${ep.description}.`,
          affectedComponent: `Endpoint: ${ep.path} (${ep.description || 'API Route'})`,
          severity,
          referenceScore: score,
          confidence: 'confirmed',
          evidence: JSON.stringify({
            condition: 'no-api-key',
            request: {
              url: endpointUrl,
              method,
              headers: noKeyHeaders,
              authAttached: false,
            },
            response: {
              status: noKeyResult.status,
              statusText: noKeyResult.statusText,
              durationMs: noKeyResult.durationMs,
              headers: noKeyResult.headers,
              bodySnippet,
            },
            timestamp: new Date().toISOString(),
          }),
          stepsToReproduce: `1. Send an unauthenticated ${method} request to '${endpointUrl}' with no Authorization header or API key.\n2. Observe HTTP 200 OK with non-empty response body.`,
          businessImpact:
            severity === 'critical'
              ? 'Sensitive user, system, or configuration data is exposed to any unauthenticated remote client without access control enforcement.'
              : 'Internal intelligence or operational endpoints are reachable without required authentication gates.',
          remediation: `Enforce mandatory authentication middleware for '${ep.path}'. Return HTTP 401 when requests lack valid session credentials or API keys.`,
        });
      }

      // ── Condition B: Invalid API key attached ────────────────────────────
      const invalidKeyHeaders = {
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Accept': 'application/json, text/plain, */*',
      };
      // Attach the invalid key through apiKeyConfig helper
      const invalidKeyHeadersFinal = apiKeyConfig.attachKey(invalidKeyHeaders, invalidKey);

      const invalidKeyResult = await probeEndpoint(endpointUrl, method, invalidKeyHeadersFinal);

      if (invalidKeyResult) {
        const invalidKeyHasContent = invalidKeyResult.rawBody && invalidKeyResult.rawBody.trim().length > 0;

        if (invalidKeyResult.status === 200 && invalidKeyHasContent) {
          const bodySnippet = parseBodySnippet(invalidKeyResult.rawBody);

          findings.push({
            checkId: 'checkEndpointAuthRequirements',
            category: 'access-control',
            title: `API Key Not Validated: ${ep.path}`,
            description: `The endpoint '${ep.path}' accepted an obviously invalid API key ('${invalidKey}') and returned HTTP 200 OK with application data. The server is not performing any validation of the provided API key — the key is ignored rather than rejected. Description: ${ep.description}.`,
            affectedComponent: `Endpoint: ${ep.path} (${ep.description || 'API Route'})`,
            severity: 'critical',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              condition: 'invalid-api-key',
              request: {
                url: endpointUrl,
                method,
                headers: invalidKeyHeadersFinal,
                apiKeyAttached: invalidKey,
                apiKeyValid: false,
              },
              response: {
                status: invalidKeyResult.status,
                statusText: invalidKeyResult.statusText,
                durationMs: invalidKeyResult.durationMs,
                headers: invalidKeyResult.headers,
                bodySnippet,
              },
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Send a ${method} request to '${endpointUrl}'.\n2. Attach an obviously invalid API key: '${apiKeyConfig.headerName}: ${invalidKey}'.\n3. Observe HTTP 200 OK — the server does not reject the malformed key.`,
            businessImpact:
              'The API key authentication mechanism is non-functional. Any client can forge a random key string and gain full access, rendering the authentication layer completely ineffective.',
            remediation: `Implement server-side API key validation for '${ep.path}': look up the presented key in the authoritative store, reject with HTTP 401 if unrecognised, and log failed attempts for monitoring.`,
          });
        }
      }
    }

    return findings;
  },
};
