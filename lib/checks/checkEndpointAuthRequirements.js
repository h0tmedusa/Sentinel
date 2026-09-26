/**
 * Check 3: checkEndpointAuthRequirements
 * For each path in lib/checks/config/endpoints.js:
 * Requests the endpoint with NO authorization header / credentials attached.
 * Flags any response that returns HTTP 200 with a non-empty body instead of 401 Unauthorized / 403 Forbidden.
 * 
 * Captures full request and response (status, headers, body snippet) as evidence.
 * confidence: "confirmed"
 * severity: "high" or "critical" depending on data sensitivity returned.
 */

import { candidateEndpoints } from './config/endpoints.js';

function evaluateSeverity(path, bodyText) {
  const sensitiveKeywords = [
    'password', 'token', 'secret', 'key', 'credential', 'auth', 
    'admin', 'session', 'hash', 'private', 'email'
  ];
  const lowerPath = path.toLowerCase();
  const lowerBody = (bodyText || '').toLowerCase();

  const isSensitivePath = lowerPath.includes('profile') || 
                          lowerPath.includes('config') || 
                          lowerPath.includes('user') || 
                          lowerPath.includes('admin') || 
                          lowerPath.includes('secret');

  const containsSensitiveData = sensitiveKeywords.some(kw => lowerBody.includes(kw));

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

export const checkEndpointAuthRequirements = {
  id: 'checkEndpointAuthRequirements',
  category: 'access-control',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    for (const ep of candidateEndpoints) {
      // Only test endpoints designated as requiring authentication
      if (!ep.requiresAuth) continue;

      const endpointUrl = `${normalizedUrl}${ep.path}`;
      const method = ep.method || 'GET';
      const requestHeaders = {
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Accept': 'application/json, text/plain, */*',
      };

      const startTime = Date.now();
      let response;
      let responseBody = '';
      let responseHeaders = {};

      try {
        response = await fetch(endpointUrl, {
          method,
          headers: requestHeaders,
          redirect: 'manual',
        });

        for (const [key, value] of response.headers.entries()) {
          responseHeaders[key.toLowerCase()] = value;
        }

        responseBody = await response.text();
      } catch (err) {
        // Connection error for this individual endpoint; continue to others
        continue;
      }

      const durationMs = Date.now() - startTime;
      const status = response.status;
      const hasContent = responseBody && responseBody.trim().length > 0;

      // Flag any endpoint expected to require auth that returns 200 with non-empty payload
      if (status === 200 && hasContent) {
        const { severity, score } = evaluateSeverity(ep.path, responseBody);

        let parsedBodySnippet = responseBody;
        try {
          const parsedJson = JSON.parse(responseBody);
          parsedBodySnippet = parsedJson;
        } catch (e) {
          if (responseBody.length > 500) {
            parsedBodySnippet = responseBody.slice(0, 500) + '... [truncated]';
          }
        }

        findings.push({
          checkId: 'checkEndpointAuthRequirements',
          category: 'access-control',
          title: `Unauthenticated Access Permitted: ${ep.path}`,
          description: `The endpoint '${ep.path}' was requested without authentication credentials, but returned HTTP 200 OK with application data instead of HTTP 401 Unauthorized or 403 Forbidden.`,
          affectedComponent: `Endpoint: ${ep.path} (${ep.description || 'API Route'})`,
          severity,
          referenceScore: score,
          confidence: 'confirmed',
          evidence: JSON.stringify({
            request: {
              url: endpointUrl,
              method,
              headers: requestHeaders,
              authAttached: false,
            },
            response: {
              status,
              statusText: response.statusText,
              durationMs,
              headers: responseHeaders,
              bodySnippet: parsedBodySnippet,
            },
            timestamp: new Date().toISOString(),
          }),
          stepsToReproduce: `1. Issue an unauthenticated ${method} request to '${endpointUrl}' without Authorization headers or cookies.\n2. Observe HTTP 200 OK response with non-empty payload.`,
          businessImpact: severity === 'critical'
            ? 'Sensitive user, system, or configuration telemetry is exposed directly to unauthenticated remote clients without access control.'
            : 'Internal intelligence feeds or operational data endpoints are exposed without required authentication gates.',
          remediation: `Implement mandatory authentication middleware (e.g. session validation or JWT verification) for '${ep.path}'. Return HTTP 401/403 when requests lack valid credentials.`,
        });
      }
    }

    return findings;
  },
};
