/**
 * Check 2: checkCORSConfig
 * Fetches targetUrl with header `Origin: http://example-test.local`
 * Inspects `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` headers.
 * Flags if:
 * 1. The arbitrary Origin is reflected (Access-Control-Allow-Origin equals the tested origin)
 * 2. Wildcard origin ('*') is configured while Access-Control-Allow-Credentials is true
 * 3. Wildcard origin ('*') allows unrestricted third-party read access
 * 
 * Captures the full request and response headers as evidence.
 * confidence: "confirmed"
 * severity: "high"
 */

export const checkCORSConfig = {
  id: 'checkCORSConfig',
  category: 'api-config',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');
    const untrustedOrigin = 'http://example-test.local';

    const requestHeaders = {
      'User-Agent': 'Sentinel-Security-Scanner/1.0',
      'Origin': untrustedOrigin,
      'Accept': '*/*',
    };

    let response;
    let responseHeaders = {};
    const startTime = Date.now();

    try {
      response = await fetch(normalizedUrl, {
        method: 'GET',
        headers: requestHeaders,
        redirect: 'manual',
      });

      for (const [key, value] of response.headers.entries()) {
        responseHeaders[key.toLowerCase()] = value;
      }
    } catch (err) {
      return [
        {
          checkId: 'checkCORSConfig',
          category: 'transport-config',
          title: 'Target Host Unreachable During CORS Inspection',
          description: `Unable to connect to target URL: ${normalizedUrl} with Origin header. Error: ${err.message}`,
          affectedComponent: normalizedUrl,
          severity: 'high',
          referenceScore: 'N/A',
          confidence: 'confirmed',
          evidence: JSON.stringify({
            request: {
              url: normalizedUrl,
              method: 'GET',
              headers: requestHeaders,
            },
            error: err.message,
            timestamp: new Date().toISOString(),
          }),
          stepsToReproduce: `Execute HTTP GET with Origin '${untrustedOrigin}' against ${normalizedUrl}.`,
          businessImpact: 'Cannot verify Cross-Origin Resource Sharing policy configuration.',
          remediation: 'Ensure the target host is reachable.',
        },
      ];
    }

    const durationMs = Date.now() - startTime;
    const allowOrigin = responseHeaders['access-control-allow-origin'];
    const allowCredentials = responseHeaders['access-control-allow-credentials'];
    const allowsCreds = allowCredentials && allowCredentials.toLowerCase() === 'true';

    // Condition 1: Origin reflection (arbitrary origin accepted)
    if (allowOrigin === untrustedOrigin) {
      const isCritical = allowsCreds;
      findings.push({
        checkId: 'checkCORSConfig',
        category: 'api-config',
        title: allowsCreds
          ? 'Critical CORS Misconfiguration: Arbitrary Origin Reflected With Credentials Enabled'
          : 'Insecure CORS Policy: Arbitrary Origin Reflection Detected',
        description: allowsCreds
          ? `The server dynamically reflects the arbitrary request Origin header (${untrustedOrigin}) in Access-Control-Allow-Origin AND explicitly sets Access-Control-Allow-Credentials to true. This permits hostile domains to read private user data and perform authenticated actions cross-origin via the user's browser.`
          : `The server dynamically reflects the arbitrary request Origin header (${untrustedOrigin}) in Access-Control-Allow-Origin without an allowlist. Third-party websites may read response payloads from authenticated users if not otherwise protected.`,
        affectedComponent: `CORS Policy (${normalizedUrl})`,
        severity: isCritical ? 'critical' : 'high',
        referenceScore: isCritical
          ? 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N'
          : 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N',
        confidence: 'confirmed',
        evidence: JSON.stringify({
          request: {
            url: normalizedUrl,
            method: 'GET',
            headers: requestHeaders,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            durationMs,
            headers: responseHeaders,
            evaluatedRule: 'Origin Reflection',
            observedAllowOrigin: allowOrigin,
            observedAllowCredentials: allowCredentials,
          },
          timestamp: new Date().toISOString(),
        }),
        stepsToReproduce: `1. Send an HTTP GET request to ${normalizedUrl} with header 'Origin: ${untrustedOrigin}'.\n2. Inspect response headers 'Access-Control-Allow-Origin' and 'Access-Control-Allow-Credentials'.\n3. Observe that Access-Control-Allow-Origin is set to '${allowOrigin}'${allowsCreds ? " and Access-Control-Allow-Credentials is 'true'" : ''}.`,
        businessImpact: allowsCreds
          ? 'Severe confidentiality breach: external websites can execute authenticated fetch/XHR requests to steal user data and session-linked information.'
          : 'External websites may read sensitive dashboard data via cross-origin requests.',
        remediation: "Replace dynamic Origin reflection with a strict whitelist of trusted application domains. Never set 'Access-Control-Allow-Origin' directly to the incoming 'Origin' header without strict server-side validation.",
      });
    } else if (allowOrigin === '*' && allowsCreds) {
      // Condition 2: Wildcard origin with credentials
      findings.push({
        checkId: 'checkCORSConfig',
        category: 'api-config',
        title: 'CORS Misconfiguration: Wildcard Origin with Allow-Credentials',
        description: "The application specifies 'Access-Control-Allow-Origin: *' alongside 'Access-Control-Allow-Credentials: true'. While standard browser specifications reject wildcard credentials, misconfigured proxies or legacy agents can lead to credential exposure.",
        affectedComponent: `CORS Policy (${normalizedUrl})`,
        severity: 'high',
        referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N',
        confidence: 'confirmed',
        evidence: JSON.stringify({
          request: {
            url: normalizedUrl,
            method: 'GET',
            headers: requestHeaders,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            durationMs,
            headers: responseHeaders,
            evaluatedRule: 'Wildcard with Credentials',
            observedAllowOrigin: allowOrigin,
            observedAllowCredentials: allowCredentials,
          },
          timestamp: new Date().toISOString(),
        }),
        stepsToReproduce: `1. Request ${normalizedUrl} with Origin: ${untrustedOrigin}.\n2. Observe Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true.`,
        businessImpact: 'Unintended exposure of cross-origin state or misconfiguration propagation through reverse proxies.',
        remediation: "Specify explicit trusted domains in 'Access-Control-Allow-Origin' rather than wildcards when credentials or authentication cookies are utilized.",
      });
    }

    return findings;
  },
};
