/**
 * Check 2: checkCORSConfig
 *
 * Tests CORS policy on API routes (not the page root) since Next.js page
 * navigation does not set CORS headers — the API routes are what matters.
 *
 * For each candidateEndpoint (up to first 3 to avoid excessive noise):
 *
 *   Simple Request (GET + Origin header):
 *     Send GET with Origin: http://example-test.local
 *     Flag if Access-Control-Allow-Origin reflects the arbitrary origin,
 *     or if wildcard is combined with Access-Control-Allow-Credentials: true.
 *
 *   Preflight Request (OPTIONS):
 *     Send OPTIONS with:
 *       Origin: http://example-test.local
 *       Access-Control-Request-Method: POST
 *       Access-Control-Request-Headers: <apiKeyConfig.headerName>
 *     Inspect Access-Control-Allow-Origin, Access-Control-Allow-Methods,
 *     Access-Control-Allow-Headers on the preflight response.
 *     Apply the same reflection/wildcard+credentials detection.
 *     If the preflight response differs from the simple response, surface
 *     an additional "CORS Policy Inconsistency" finding.
 *
 * Both request types produce separate findings if triggered.
 * confidence: "confirmed"
 */

import { candidateEndpoints, apiKeyConfig } from './config/endpoints.js';
import { safeFetch } from '@/lib/httpHelpers.js';

const UNTRUSTED_ORIGIN = 'http://example-test.local';
const MAX_ENDPOINTS_TO_TEST = 3;

function evaluateCORSHeaders(allowOrigin, allowCredentials) {
  const allowsCreds = allowCredentials && allowCredentials.toLowerCase() === 'true';
  const reflectsOrigin = allowOrigin === UNTRUSTED_ORIGIN;
  const isWildcard = allowOrigin === '*';

  return { allowsCreds, reflectsOrigin, isWildcard };
}

function buildSimpleFinding({ endpointUrl, ep, reqHeaders, res, resHeaders, durationMs }) {
  const allowOrigin = resHeaders['access-control-allow-origin'];
  const allowCredentials = resHeaders['access-control-allow-credentials'];
  const { allowsCreds, reflectsOrigin, isWildcard } = evaluateCORSHeaders(allowOrigin, allowCredentials);

  if (reflectsOrigin) {
    const isCritical = allowsCreds;
    return {
      checkId: 'checkCORSConfig',
      category: 'api-config',
      title: allowsCreds
        ? `Critical CORS Misconfiguration: Arbitrary Origin Reflected With Credentials Enabled (${ep.path})`
        : `Insecure CORS Policy: Arbitrary Origin Reflection Detected (${ep.path})`,
      description: allowsCreds
        ? `On the API endpoint '${ep.path}', the server dynamically reflects the arbitrary request Origin header (${UNTRUSTED_ORIGIN}) in Access-Control-Allow-Origin AND sets Access-Control-Allow-Credentials to true. This permits hostile domains to perform authenticated cross-origin requests and read private user data.`
        : `On the API endpoint '${ep.path}', the server reflects the arbitrary request Origin header (${UNTRUSTED_ORIGIN}) in Access-Control-Allow-Origin without an allowlist. Third-party websites may read response payloads from authenticated users.`,
      affectedComponent: `CORS Policy — Endpoint: ${ep.path}`,
      severity: isCritical ? 'critical' : 'high',
      referenceScore: isCritical
        ? 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N'
        : 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N',
      confidence: 'confirmed',
      evidence: JSON.stringify({
        requestType: 'simple-GET',
        request: { url: endpointUrl, method: 'GET', headers: reqHeaders },
        response: {
          status: res.status,
          statusText: res.statusText,
          durationMs,
          headers: resHeaders,
          evaluatedRule: 'Origin Reflection',
          observedAllowOrigin: allowOrigin,
          observedAllowCredentials: allowCredentials,
        },
        timestamp: new Date().toISOString(),
      }),
      stepsToReproduce: `1. Send GET to '${endpointUrl}' with header 'Origin: ${UNTRUSTED_ORIGIN}'.\n2. Inspect 'Access-Control-Allow-Origin' → '${allowOrigin}'${allowsCreds ? " and 'Access-Control-Allow-Credentials' → 'true'" : ''}.`,
      businessImpact: allowsCreds
        ? 'External websites can make authenticated API requests on behalf of logged-in users, exposing entitlements, MCP quotas, and referral data.'
        : 'External sites can read cross-origin API responses in authenticated user sessions.',
      remediation: "Replace dynamic Origin reflection with a strict server-side allowlist. Never echo the incoming Origin header value directly into Access-Control-Allow-Origin.",
    };
  }

  if (isWildcard && allowsCreds) {
    return {
      checkId: 'checkCORSConfig',
      category: 'api-config',
      title: `CORS Misconfiguration: Wildcard Origin With Allow-Credentials (${ep.path})`,
      description: `The API endpoint '${ep.path}' specifies 'Access-Control-Allow-Origin: *' alongside 'Access-Control-Allow-Credentials: true'. Standard browsers reject this combination but misconfigured proxies or legacy clients may honour it, leading to credential exposure.`,
      affectedComponent: `CORS Policy — Endpoint: ${ep.path}`,
      severity: 'high',
      referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N',
      confidence: 'confirmed',
      evidence: JSON.stringify({
        requestType: 'simple-GET',
        request: { url: endpointUrl, method: 'GET', headers: reqHeaders },
        response: {
          status: res.status,
          statusText: res.statusText,
          durationMs,
          headers: resHeaders,
          evaluatedRule: 'Wildcard with Credentials',
          observedAllowOrigin: allowOrigin,
          observedAllowCredentials: allowCredentials,
        },
        timestamp: new Date().toISOString(),
      }),
      stepsToReproduce: `1. Send GET to '${endpointUrl}' with 'Origin: ${UNTRUSTED_ORIGIN}'.\n2. Observe 'Access-Control-Allow-Origin: *' with 'Access-Control-Allow-Credentials: true'.`,
      businessImpact: 'Credential-scoped cross-origin requests may be executed by reverse proxy misconfiguration.',
      remediation: "Specify explicit trusted origin domains instead of wildcard when credentials are in use.",
    };
  }

  return null;
}

function buildPreflightFinding({ endpointUrl, ep, reqHeaders, res, resHeaders, durationMs }) {
  const allowOrigin = resHeaders['access-control-allow-origin'];
  const allowCredentials = resHeaders['access-control-allow-credentials'];
  const allowMethods = resHeaders['access-control-allow-methods'] || '';
  const allowHeaders = resHeaders['access-control-allow-headers'] || '';
  const { allowsCreds, reflectsOrigin, isWildcard } = evaluateCORSHeaders(allowOrigin, allowCredentials);

  if (reflectsOrigin || (isWildcard && allowsCreds)) {
    const isCritical = reflectsOrigin && allowsCreds;
    return {
      checkId: 'checkCORSConfig',
      category: 'api-config',
      title: `Insecure Preflight CORS Response: Arbitrary Origin Accepted (${ep.path})`,
      description: reflectsOrigin
        ? `The OPTIONS preflight request to '${ep.path}' (with Access-Control-Request-Method: POST and Access-Control-Request-Headers: ${apiKeyConfig.headerName}) reflected the untrusted Origin '${UNTRUSTED_ORIGIN}' in Access-Control-Allow-Origin${allowsCreds ? ' with credentials enabled' : ''}.`
        : `The OPTIONS preflight to '${ep.path}' returned wildcard Access-Control-Allow-Origin with Access-Control-Allow-Credentials: true.`,
      affectedComponent: `CORS Preflight Policy — Endpoint: ${ep.path}`,
      severity: isCritical ? 'critical' : 'high',
      referenceScore: isCritical
        ? 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N'
        : 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N',
      confidence: 'confirmed',
      evidence: JSON.stringify({
        requestType: 'preflight-OPTIONS',
        request: { url: endpointUrl, method: 'OPTIONS', headers: reqHeaders },
        response: {
          status: res.status,
          statusText: res.statusText,
          durationMs,
          headers: resHeaders,
          evaluatedRule: reflectsOrigin ? 'Preflight Origin Reflection' : 'Preflight Wildcard with Credentials',
          observedAllowOrigin: allowOrigin,
          observedAllowCredentials: allowCredentials,
          observedAllowMethods: allowMethods,
          observedAllowHeaders: allowHeaders,
        },
        timestamp: new Date().toISOString(),
      }),
      stepsToReproduce: `1. Send OPTIONS to '${endpointUrl}' with headers:\n   Origin: ${UNTRUSTED_ORIGIN}\n   Access-Control-Request-Method: POST\n   Access-Control-Request-Headers: ${apiKeyConfig.headerName}\n2. Observe Access-Control-Allow-Origin: '${allowOrigin}'${allowsCreds ? " with Access-Control-Allow-Credentials: true" : ''}.`,
      businessImpact: 'Browser preflight approval permits cross-origin POST and custom-header requests from hostile sites, widening the attack surface beyond simple GET reads.',
      remediation: "Apply the same strict origin allowlist to OPTIONS preflight responses as to all other responses. Validate Access-Control-Request-Method and Access-Control-Request-Headers against a fixed allowlist.",
    };
  }

  return null;
}

function buildInconsistencyFinding({ endpointUrl, ep, simpleResHeaders, preflightResHeaders }) {
  const simpleAllowOrigin = simpleResHeaders['access-control-allow-origin'];
  const preflightAllowOrigin = preflightResHeaders['access-control-allow-origin'];

  // Report only if the origin policy actually differs between simple and preflight
  if (simpleAllowOrigin === preflightAllowOrigin) return null;
  // Only worth flagging if at least one of them reflects the untrusted origin
  if (simpleAllowOrigin !== UNTRUSTED_ORIGIN && preflightAllowOrigin !== UNTRUSTED_ORIGIN) return null;

  return {
    checkId: 'checkCORSConfig',
    category: 'api-config',
    title: `CORS Policy Inconsistency Between Simple and Preflight Responses (${ep.path})`,
    description: `The CORS policy for '${ep.path}' differs between the GET simple request and the OPTIONS preflight request. Simple request Access-Control-Allow-Origin: '${simpleAllowOrigin || '(absent)'}'; Preflight Access-Control-Allow-Origin: '${preflightAllowOrigin || '(absent)'}'. Inconsistent CORS policies are often the result of middleware handling only one request type and may be exploited depending on browser and proxy behaviour.`,
    affectedComponent: `CORS Policy Consistency — Endpoint: ${ep.path}`,
    severity: 'medium',
    referenceScore: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N',
    confidence: 'confirmed',
    evidence: JSON.stringify({
      requestType: 'simple-vs-preflight-comparison',
      endpoint: endpointUrl,
      simpleGET: {
        observedAllowOrigin: simpleAllowOrigin || null,
        observedAllowCredentials: simpleResHeaders['access-control-allow-credentials'] || null,
      },
      preflightOPTIONS: {
        observedAllowOrigin: preflightAllowOrigin || null,
        observedAllowCredentials: preflightResHeaders['access-control-allow-credentials'] || null,
        observedAllowMethods: preflightResHeaders['access-control-allow-methods'] || null,
        observedAllowHeaders: preflightResHeaders['access-control-allow-headers'] || null,
      },
      timestamp: new Date().toISOString(),
    }),
    stepsToReproduce: `1. Send GET to '${endpointUrl}' with 'Origin: ${UNTRUSTED_ORIGIN}' → observe ACAO: '${simpleAllowOrigin || '(absent)'}'.\n2. Send OPTIONS to '${endpointUrl}' with 'Origin: ${UNTRUSTED_ORIGIN}' + preflight headers → observe ACAO: '${preflightAllowOrigin || '(absent)'}'.`,
    businessImpact: 'Inconsistent CORS headers create ambiguity that may be leveraged via browser pre-caching of preflight results or by proxy stripping/adding headers.',
    remediation: "Centralise CORS middleware so that identical origin validation logic is applied uniformly to both simple requests and preflight OPTIONS requests.",
  };
}

export const checkCORSConfig = {
  id: 'checkCORSConfig',
  category: 'api-config',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    // Test a subset of candidateEndpoints (first MAX_ENDPOINTS_TO_TEST)
    const endpointsToTest = candidateEndpoints.slice(0, MAX_ENDPOINTS_TO_TEST);

    for (const ep of endpointsToTest) {
      const endpointUrl = `${normalizedUrl}${ep.path}`;

      // ── Simple Request: GET with Origin header ────────────────────────────
      const simpleReqHeaders = {
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Origin': UNTRUSTED_ORIGIN,
        'Accept': 'application/json, */*',
      };

      const simpleResult = await safeFetch(endpointUrl, { method: 'GET', headers: simpleReqHeaders, redirect: 'manual' });
      if (!simpleResult.ok) continue;
      const simpleResHeaders = simpleResult.headers;
      const simpleDuration = simpleResult.durationMs;

      // Evaluate simple-request CORS finding
      const simpleFinding = buildSimpleFinding({
        endpointUrl,
        ep,
        reqHeaders: simpleReqHeaders,
        res: simpleResult.response,
        resHeaders: simpleResHeaders,
        durationMs: simpleDuration,
      });
      if (simpleFinding) findings.push(simpleFinding);

      // ── Preflight Request: OPTIONS ────────────────────────────────────────
      const preflightReqHeaders = {
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Origin': UNTRUSTED_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': apiKeyConfig.headerName,
      };

      const preflightResult = await safeFetch(endpointUrl, { method: 'OPTIONS', headers: preflightReqHeaders, redirect: 'manual' });
      if (!preflightResult.ok) continue;
      const preflightResHeaders = preflightResult.headers;
      const preflightDuration = preflightResult.durationMs;

      // Evaluate preflight-specific CORS finding
      const preflightFinding = buildPreflightFinding({
        endpointUrl,
        ep,
        reqHeaders: preflightReqHeaders,
        res: preflightResult.response,
        resHeaders: preflightResHeaders,
        durationMs: preflightDuration,
      });
      if (preflightFinding) findings.push(preflightFinding);

      // Evaluate inconsistency between simple and preflight
      const inconsistencyFinding = buildInconsistencyFinding({
        endpointUrl,
        ep,
        simpleResHeaders,
        preflightResHeaders,
      });
      if (inconsistencyFinding) findings.push(inconsistencyFinding);
    }

    return findings;
  },
};
