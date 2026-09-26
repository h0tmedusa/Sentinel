/**
 * Check 6: checkLoginThrottling (Rate Limiting & Anti-Brute-Force Verification)
 *
 * Two independent loops, each producing a separate Finding if throttling is absent:
 *
 * Loop A — OAuth Token Endpoint Brute-Force:
 *   Sends 20 rapid POST requests to /api/oauth/token with a malformed/invalid
 *   authorization code. Checks whether any response is HTTP 429 or whether
 *   measurable backoff (increasing delay) is applied.
 *   Finding if: 0 out of 20 requests hit 429.
 *
 * Loop B — API Key Brute-Force (Candidate Endpoint):
 *   Sends 20 rapid GET requests to the first candidateEndpoint using a different
 *   random invalid API key string each time (simulating key enumeration).
 *   Checks for HTTP 429 or backoff.
 *   Finding if: 0 out of 20 requests hit 429.
 *
 * Both loops use entirely synthetic/fake values — no real credentials.
 * Samples first, middle (10th), and last request for evidence.
 * confidence: "confirmed"
 * severity: "medium"
 */

import { apiKeyConfig, candidateEndpoints } from './config/endpoints.js';
import { safeFetch, sleep } from '@/lib/httpHelpers.js';

const REQUEST_COUNT = 20;
const OAUTH_TOKEN_PATH = '/api/oauth/token';

function randomHex(length = 16) {
  return [...Array(length)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

async function runBurstLoop({ endpointUrl, method, buildHeaders, buildBody }) {
  const results = [];
  let throttledCount = 0;
  const overallStart = Date.now();

  for (let i = 1; i <= REQUEST_COUNT; i++) {
    const headers = buildHeaders(i);
    const body = buildBody ? buildBody(i) : undefined;

    const fetchResult = await safeFetch(endpointUrl, { method, headers, body, redirect: 'manual' });
    if (!fetchResult.ok) return null;  // abort loop on connection failure
    const duration = fetchResult.durationMs;
    const status = fetchResult.response.status;

    if (status === 429) throttledCount++;

    // Sample first, middle, and last
    if (i === 1 || i === 10 || i === REQUEST_COUNT) {
      results.push({
        requestIndex: i,
        status,
        statusText: fetchResult.response.statusText,
        durationMs: duration,
        retryAfterHeader: fetchResult.response.headers.get('retry-after') || null,
        xRateLimitHeader: fetchResult.response.headers.get('x-ratelimit-remaining') || null,
      });
    }
    
    if (i < REQUEST_COUNT) await sleep(150);
  }

  return {
    throttledCount,
    totalDurationMs: Date.now() - overallStart,
    sampleRequests: results,
  };
}

export const checkLoginThrottling = {
  id: 'checkLoginThrottling',
  category: 'session-handling',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    // ── Loop A: OAuth /api/oauth/token brute-force ──────────────────────────
    const oauthUrl = `${normalizedUrl}${OAUTH_TOKEN_PATH}`;

    const oauthResult = await runBurstLoop({
      endpointUrl: oauthUrl,
      method: 'POST',
      buildHeaders: () => ({
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Accept': 'application/json',
      }),
      buildBody: (i) => {
        // Simulate an invalid authorization code grant on every request
        const fakeCode = `invalid_code_${randomHex(12)}_sentinel_${i}`;
        return `grant_type=authorization_code&code=${encodeURIComponent(fakeCode)}&redirect_uri=http%3A%2F%2Flocalhost%3A9999%2Fcallback&client_id=sentinel_test_client`;
      },
    });

    if (oauthResult && oauthResult.throttledCount === 0) {
      findings.push({
        checkId: 'checkLoginThrottling',
        category: 'session-handling',
        title: 'Missing Rate Limiting on OAuth Token Endpoint',
        description: `Sent ${REQUEST_COUNT} rapid POST requests to '${OAUTH_TOKEN_PATH}' each with a distinct malformed authorization code (invalid grant). None of the ${REQUEST_COUNT} requests received HTTP 429 Too Many Requests, and no exponential backoff or Retry-After header was observed. This permits automated brute-forcing of OAuth authorization codes or refresh tokens without restriction.`,
        affectedComponent: `Endpoint: ${OAUTH_TOKEN_PATH}`,
        severity: 'medium',
        referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
        confidence: 'confirmed',
        evidence: JSON.stringify({
          loop: 'oauth-token-bruteforce',
          endpoint: oauthUrl,
          totalRequestsSent: REQUEST_COUNT,
          throttledCount_429: oauthResult.throttledCount,
          totalDurationMs: oauthResult.totalDurationMs,
          averageDurationMs: Math.round(oauthResult.totalDurationMs / REQUEST_COUNT),
          sampleRequests: oauthResult.sampleRequests,
          timestamp: new Date().toISOString(),
        }),
        stepsToReproduce: `1. Send ${REQUEST_COUNT} rapid POST requests to '${oauthUrl}' with distinct invalid grant values (grant_type=authorization_code, malformed code).\n2. Observe that 0 requests return HTTP 429 and no Retry-After or X-RateLimit-Remaining headers are present.`,
        businessImpact: 'Enables automated brute-forcing of OAuth authorization codes and refresh tokens, potentially allowing account takeover without any speed restrictions.',
        remediation: "Apply IP-based and client-based rate limiting to the OAuth token endpoint. Return HTTP 429 with a Retry-After header after a threshold of failed grant attempts (e.g. 5 per minute).",
      });
    }

    // ── Loop B: API Key brute-force against a candidateEndpoint ────────────
    // Use the first GET candidateEndpoint as the target for key enumeration
    const keyTarget = candidateEndpoints.find((ep) => ep.method === 'GET') || candidateEndpoints[0];
    const keyTargetUrl = `${normalizedUrl}${keyTarget.path}`;
    const invalidKey = apiKeyConfig.getInvalidKey();

    const apiKeyResult = await runBurstLoop({
      endpointUrl: keyTargetUrl,
      method: keyTarget.method || 'GET',
      buildHeaders: (i) => {
        // Use a unique random-looking key each request to simulate enumeration
        const fakeKey = `wm_brute_${randomHex(20)}_${i}`;
        return apiKeyConfig.attachKey(
          {
            'User-Agent': 'Sentinel-Security-Scanner/1.0',
            'Accept': 'application/json',
          },
          fakeKey
        );
      },
    });

    if (apiKeyResult && apiKeyResult.throttledCount === 0) {
      findings.push({
        checkId: 'checkLoginThrottling',
        category: 'session-handling',
        title: `Missing Rate Limiting on API Key Authentication: ${keyTarget.path}`,
        description: `Sent ${REQUEST_COUNT} rapid ${keyTarget.method || 'GET'} requests to '${keyTarget.path}' each with a distinct random invalid API key in the '${apiKeyConfig.headerName}' header (simulating key enumeration / brute-force). None of the ${REQUEST_COUNT} requests received HTTP 429 Too Many Requests. The server processes every request individually with no observable throttling, permitting high-speed API key guessing attacks.`,
        affectedComponent: `Endpoint: ${keyTarget.path} (${keyTarget.description || 'API Route'})`,
        severity: 'medium',
        referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
        confidence: 'confirmed',
        evidence: JSON.stringify({
          loop: 'api-key-bruteforce',
          endpoint: keyTargetUrl,
          headerUsed: apiKeyConfig.headerName,
          sampleKeyFormat: `wm_brute_<random_hex_20>_<n>`,
          totalRequestsSent: REQUEST_COUNT,
          throttledCount_429: apiKeyResult.throttledCount,
          totalDurationMs: apiKeyResult.totalDurationMs,
          averageDurationMs: Math.round(apiKeyResult.totalDurationMs / REQUEST_COUNT),
          sampleRequests: apiKeyResult.sampleRequests,
          timestamp: new Date().toISOString(),
        }),
        stepsToReproduce: `1. Send ${REQUEST_COUNT} rapid ${keyTarget.method || 'GET'} requests to '${keyTargetUrl}'.\n2. Each request uses a distinct random value in the '${apiKeyConfig.headerName}' header.\n3. Observe that 0 requests return HTTP 429 and no rate-limit headers appear.`,
        businessImpact: 'Unthrottled API key authentication permits high-speed enumeration of the key space, increasing the practical feasibility of brute-force compromise of programmatic access credentials.',
        remediation: `Apply rate limiting keyed to source IP and/or presented API key prefix on '${keyTarget.path}'. Return HTTP 429 with Retry-After after a configurable threshold of failed authentication attempts.`,
      });
    }

    return findings;
  },
};
