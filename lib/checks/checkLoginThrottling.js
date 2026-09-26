/**
 * Check 6: checkLoginThrottling (Rate Limiting & Anti-Brute-Force Verification)
 * Sends 20 rapid POST requests with incorrect credentials to the authentication endpoint.
 * Checks whether any get throttled (HTTP 429 Too Many Requests) or delayed/rejected.
 * Flags the complete absence of rate limiting / throttling.
 * 
 * Captures request count, timings, status distribution, and sample responses as evidence.
 * confidence: "confirmed"
 * severity: "medium"
 */

import { authConfig } from './config/endpoints.js';

export const checkLoginThrottling = {
  id: 'checkLoginThrottling',
  category: 'session-handling',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');
    const loginEndpointUrl = `${normalizedUrl}${authConfig.loginPath}`;

    const REQUEST_COUNT = 20;
    const requestResults = [];
    let throttledCount = 0;
    let successfulCount = 0;
    let failedAuthCount = 0;
    const overallStartTime = Date.now();

    for (let i = 1; i <= REQUEST_COUNT; i++) {
      const payload = {
        username: `test_audit_user_${i}@example.local`,
        password: `AuditInvalidPass_${Math.random().toString(36).substring(2)}!`,
      };

      const reqHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Accept': 'application/json',
      };

      const reqStart = Date.now();
      try {
        const res = await fetch(loginEndpointUrl, {
          method: authConfig.loginMethod || 'POST',
          headers: reqHeaders,
          body: JSON.stringify(payload),
          redirect: 'manual',
        });

        const reqDuration = Date.now() - reqStart;
        const status = res.status;

        if (status === 429) {
          throttledCount++;
        } else if (status === 200) {
          successfulCount++;
        } else {
          failedAuthCount++;
        }

        // Store sample records (first, middle, last)
        if (i === 1 || i === 10 || i === REQUEST_COUNT) {
          requestResults.push({
            requestIndex: i,
            status,
            statusText: res.statusText,
            durationMs: reqDuration,
            retryAfterHeader: res.headers.get('retry-after') || null,
          });
        }
      } catch (err) {
        // If login endpoint does not exist or connection fails
        if (i === 1) {
          return findings;
        }
      }
    }

    const totalDurationMs = Date.now() - overallStartTime;

    // If zero requests encountered 429 (Too Many Requests) or throttling behavior
    if (throttledCount === 0 && failedAuthCount + successfulCount >= REQUEST_COUNT) {
      findings.push({
        checkId: 'checkLoginThrottling',
        category: 'session-handling',
        title: 'Missing Authentication Rate Limiting & Throttling',
        description: `Sent ${REQUEST_COUNT} rapid sequential authentication attempts with invalid credentials to '${authConfig.loginPath}'. All ${REQUEST_COUNT} requests were processed without encountering HTTP 429 (Too Many Requests) or exponential backoff. The absence of rate limiting allows credential stuffing and brute-force attacks against user accounts.`,
        affectedComponent: `Endpoint: ${authConfig.loginPath}`,
        severity: 'medium',
        referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
        confidence: 'confirmed',
        evidence: JSON.stringify({
          endpoint: loginEndpointUrl,
          totalRequestsSent: REQUEST_COUNT,
          throttledCount_429: throttledCount,
          nonThrottledCount: failedAuthCount + successfulCount,
          totalDurationMs,
          averageDurationMs: Math.round(totalDurationMs / REQUEST_COUNT),
          sampleRequests: requestResults,
          timestamp: new Date().toISOString(),
        }),
        stepsToReproduce: `1. Send ${REQUEST_COUNT} rapid POST requests to '${loginEndpointUrl}' with invalid credentials.\n2. Observe that 0 requests return HTTP 429 and no throttling headers (e.g., Retry-After) are provided.`,
        businessImpact: 'Permits automated brute-force attacks and credential stuffing against internal user accounts without rate restrictions.',
        remediation: "Implement IP-based and account-based rate limiting on the authentication endpoint (e.g., maximum 5 failed attempts per minute before enforcing temporary lockouts or HTTP 429 responses).",
      });
    }

    return findings;
  },
};
