/**
 * Check 5: checkErrorHandling (Verbose Errors & Debug Info Leakage)
 *
 * For each candidateEndpoint, sends malformed input matching the endpoint's
 * declared HTTP method:
 *   - GET endpoints: malformed query parameters (oversized values, type
 *     confusion, unescaped special chars) appended to the URL.
 *   - POST endpoints: malformed JSON bodies (broken syntax, wrong type,
 *     oversized string).
 *
 * Additionally, /api/oauth/token is tested explicitly with malformed POST
 * bodies (it's a real POST endpoint and a prime candidate for verbose errors).
 *
 * Detection checks whether the response leaks:
 *   - Stack traces
 *   - Server file paths
 *   - ORM / database error signatures
 *
 * confidence: "confirmed"
 * severity: "medium"
 */

import { candidateEndpoints } from './config/endpoints.js';
import { safeFetch, sleep } from '@/lib/httpHelpers.js';

// ── Payloads for POST endpoints ──────────────────────────────────────────────
const POST_PAYLOADS = [
  {
    name: 'Broken JSON Syntax',
    headers: { 'Content-Type': 'application/json' },
    body: '{"invalid_json": true, "unclosed_bracket": ',
  },
  {
    name: 'Type Confusion (Array where Object expected)',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(['unexpected', 'array', 12345]),
  },
  {
    name: 'Oversized String Input',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: 'A'.repeat(8192), test_field: 'error_trigger' }),
  },
];

// ── Payloads for GET endpoints (appended as query strings) ───────────────────
const GET_QUERY_PAYLOADS = [
  {
    name: 'Oversized Query Parameter',
    queryString: `?id=${'X'.repeat(4096)}&overflow=true`,
  },
  {
    name: 'Type Confusion (Array in Query Param)',
    queryString: '?id[]=1&id[]=2&id[]=3&userId[object]=true&__proto__=test',
  },
  {
    name: 'Unescaped Special Characters',
    queryString: '?q=<script>alert(1)</script>&path=../../etc/passwd&key=val%00ue&x=%27%20OR%201%3D1--',
  },
];

// ── Leak detection patterns (unchanged) ──────────────────────────────────────
const LEAK_PATTERNS = [
  {
    label: 'Stack Trace Pattern',
    regex: /(at\s+[a-zA-Z0-9_$.<>]+\s+\(.*:[0-9]+:[0-9]+\)|Traceback\s+\(most\s+recent\s+call\s+last\):|NullPointerException|ReferenceError:|TypeError:|SyntaxError:)/i,
  },
  {
    label: 'Server File Path Pattern',
    regex: /(\/var\/www\/|\/home\/[a-zA-Z0-9_-]+\/|C:\\[a-zA-Z0-9_-]+\\|\/node_modules\/|\/app\/api\/|\/src\/|\.prisma\/client)/i,
  },
  {
    label: 'Database / ORM Detail Pattern',
    regex: /(PrismaClientKnownRequestError|SQLite3::SQLException|syntax\s+error\s+at\s+or\s+near|SequelizeDatabaseError|UnhandledPromiseRejection)/i,
  },
];

function checkForLeaks({ responseBody, endpointUrl, ep, method, payloadName, requestEvidence, response, responseHeaders, durationMs }) {
  for (const pattern of LEAK_PATTERNS) {
    const match = responseBody.match(pattern.regex);
    if (match) {
      const leakedSnippet = match[0];

      return {
        checkId: 'checkErrorHandling',
        category: 'input-handling',
        title: `Verbose Error & Debug Information Disclosure: ${ep.path}`,
        description: `When sending malformed input (${payloadName}) to '${ep.path}' via ${method}, the application responded with internal debugging information (${pattern.label}: '${leakedSnippet}'). Leaking stack traces or runtime internals aids attackers in fingerprinting underlying technology and identifying logic flaws.`,
        affectedComponent: `Endpoint: ${ep.path} (${ep.description || 'API Route'})`,
        severity: 'medium',
        referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
        confidence: 'confirmed',
        evidence: JSON.stringify({
          request: {
            url: endpointUrl,
            method,
            payloadName,
            ...requestEvidence,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            durationMs,
            headers: responseHeaders,
            matchedPattern: pattern.label,
            leakedSnippet,
            bodySnippet: responseBody.length > 600 ? responseBody.slice(0, 600) + '... [truncated]' : responseBody,
          },
          timestamp: new Date().toISOString(),
        }),
        stepsToReproduce: `1. Send a ${method} request to '${endpointUrl}' with malformed input '${payloadName}'.\n2. Inspect response body.\n3. Observe disclosure matching ${pattern.label}.`,
        businessImpact: 'Internal directory paths, server framework types, and database queries are revealed to untrusted clients.',
        remediation: "Implement a centralized global error handler that returns sanitized, generic error responses (e.g. {\"error\": \"Invalid request\"}) in non-development environments.",
      };
    }
  }
  return null;
}

async function probeEndpoint(url, method, headers, body) {
  const opts = { method, headers, redirect: 'manual' };
  if (body !== undefined) opts.body = body;
  const result = await safeFetch(url, opts);
  if (!result.ok) return null;
  return { response: result.response, responseHeaders: result.headers, responseBody: result.body, durationMs: result.durationMs };
}

export const checkErrorHandling = {
  id: 'checkErrorHandling',
  category: 'input-handling',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    // ── Test candidateEndpoints using each endpoint's declared method ────
    for (const ep of candidateEndpoints) {
      const method = ep.method || 'GET';
      const endpointUrl = `${normalizedUrl}${ep.path}`;

      if (method === 'GET') {
        // GET endpoints: malformed query parameters
        for (const qp of GET_QUERY_PAYLOADS) {
          const testUrl = `${endpointUrl}${qp.queryString}`;
          const headers = {
            'User-Agent': 'Sentinel-Security-Scanner/1.0',
            'Accept': 'application/json, text/plain, */*',
          };

          const result = await probeEndpoint(testUrl, 'GET', headers);
          if (!result) continue;

          const finding = checkForLeaks({
            responseBody: result.responseBody,
            endpointUrl: testUrl,
            ep,
            method: 'GET',
            payloadName: qp.name,
            requestEvidence: {
              headers,
              queryString: qp.queryString,
            },
            response: result.response,
            responseHeaders: result.responseHeaders,
            durationMs: result.durationMs,
          });
          if (finding) {
            findings.push(finding);
            break; // One finding per endpoint is sufficient
          }
        }
      } else {
        // POST endpoints: malformed JSON bodies
        for (const payload of POST_PAYLOADS) {
          const headers = {
            'User-Agent': 'Sentinel-Security-Scanner/1.0',
            'Accept': 'application/json, text/plain, */*',
            ...payload.headers,
          };

          const result = await probeEndpoint(endpointUrl, method, headers, payload.body);
          if (!result) continue;

          const finding = checkForLeaks({
            responseBody: result.responseBody,
            endpointUrl,
            ep,
            method,
            payloadName: payload.name,
            requestEvidence: {
              headers,
              bodyPreview: payload.body.length > 200 ? payload.body.slice(0, 200) + '...' : payload.body,
            },
            response: result.response,
            responseHeaders: result.responseHeaders,
            durationMs: result.durationMs,
          });
          if (finding) {
            findings.push(finding);
            break; // One finding per endpoint is sufficient
          }
        }
      }
      await sleep(100);
    }

    // ── Explicit test: /api/oauth/token (POST) ──────────────────────────
    const oauthEp = {
      path: '/api/oauth/token',
      method: 'POST',
      description: 'OAuth 2.0 token exchange endpoint',
    };
    const oauthUrl = `${normalizedUrl}${oauthEp.path}`;

    for (const payload of POST_PAYLOADS) {
      const headers = {
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Accept': 'application/json, text/plain, */*',
        ...payload.headers,
      };

      const result = await probeEndpoint(oauthUrl, 'POST', headers, payload.body);
      if (!result) continue;

      const finding = checkForLeaks({
        responseBody: result.responseBody,
        endpointUrl: oauthUrl,
        ep: oauthEp,
        method: 'POST',
        payloadName: payload.name,
        requestEvidence: {
          headers,
          bodyPreview: payload.body.length > 200 ? payload.body.slice(0, 200) + '...' : payload.body,
        },
        response: result.response,
        responseHeaders: result.responseHeaders,
        durationMs: result.durationMs,
      });
      if (finding) {
        findings.push(finding);
        break; // One finding for OAuth endpoint is sufficient
      }
    }

    return findings;
  },
};
