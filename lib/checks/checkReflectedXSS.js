/**
 * Check: checkReflectedXSS
 * Category: input-handling
 *
 * Appends an XSS marker probe to GET endpoints:
 *   ?q=<script>sentinel_xss_test_marker</script>
 *
 * Verifies if the unencoded marker `<script>sentinel_xss_test_marker</script>`
 * is reflected directly in the response body.
 *
 * Proper behavior (output encoding with &lt;script&gt;) is NOT flagged.
 * CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting').
 */

import { candidateEndpoints } from './config/endpoints.js';
import { safeFetch, sleep } from '@/lib/httpHelpers.js';

const XSS_MARKER = '<script>sentinel_xss_test_marker</script>';

export const checkReflectedXSS = {
  id: 'checkReflectedXSS',
  category: 'input-handling',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    const getEndpoints = candidateEndpoints.filter((ep) => (ep.method || 'GET') === 'GET');

    for (const ep of getEndpoints) {
      const testUrl = `${normalizedUrl}${ep.path}?q=${encodeURIComponent(XSS_MARKER)}`;

      const result = await safeFetch(testUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Sentinel-Security-Scanner/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
        },
        redirect: 'manual',
      });

      if (!result.ok) continue;

      const body = result.body || '';

      // Check for literal unencoded reflection
      if (body.includes(XSS_MARKER)) {
        findings.push({
          checkId: 'checkReflectedXSS',
          category: 'input-handling',
          cweId: 'CWE-79',
          title: `Reflected Cross-Site Scripting (XSS): ${ep.path}`,
          description: `The endpoint '${ep.path}' directly reflects the query parameter payload '${XSS_MARKER}' in the response body without HTML entity encoding (e.g. &lt;script&gt;). If rendered in a browser context, malicious script supplied by an attacker via a crafted link could execute within the victim's session.`,
          affectedComponent: `Endpoint: ${ep.path}`,
          severity: 'high',
          referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
          confidence: 'confirmed',
          evidence: JSON.stringify({
            endpoint: testUrl,
            injectedPayload: XSS_MARKER,
            matchedSubstring: XSS_MARKER,
            responseStatus: result.response.status,
            bodySnippet: body.length > 500 ? body.slice(0, 500) + '... [truncated]' : body,
            timestamp: new Date().toISOString(),
          }),
          stepsToReproduce: `1. Send GET request to '${testUrl}'.\n2. Inspect response body.\n3. Note presence of unescaped literal tag: '${XSS_MARKER}'.`,
          businessImpact: 'Execution of arbitrary JavaScript in the victim’s browser, enabling session theft, keystroke logging, and unauthorized interface actions.',
          remediation: 'Contextually HTML-entity-encode all untrusted user inputs before rendering into response bodies, or serve API responses with strict Content-Type: application/json.',
        });
      }

      await sleep(100);
    }

    return findings;
  },
};
