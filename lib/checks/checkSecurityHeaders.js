/**
 * Check 1: checkSecurityHeaders
 * Fetches targetUrl and inspects for essential defense-in-depth response headers:
 * - Content-Security-Policy (CSP)
 * - Strict-Transport-Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * 
 * Produces one Finding per missing or insecure header with captured HTTP evidence.
 */

const REQUIRED_HEADERS = [
  {
    name: 'Content-Security-Policy',
    headerKey: 'content-security-policy',
    severity: 'medium',
    referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N',
    title: 'Missing Content-Security-Policy (CSP) Header',
    description: 'The HTTP Content-Security-Policy response header is not enforced on the application root. A strong CSP restricts the sources from which scripts, styles, frames, and images can be loaded, mitigating Cross-Site Scripting (XSS) and data injection vectors.',
    businessImpact: 'Increased exposure to client-side injection and script execution vulnerabilities in the dashboard view.',
    remediation: "Configure the web server or reverse proxy to include a 'Content-Security-Policy' header defining restricted default-src, script-src, style-src, and frame-ancestors directives.",
  },
  {
    name: 'Strict-Transport-Security',
    headerKey: 'strict-transport-security',
    severity: 'medium',
    referenceScore: 'CVSS:3.1/AV:A/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N',
    title: 'Missing Strict-Transport-Security (HSTS) Header',
    description: 'The HTTP Strict-Transport-Security (HSTS) response header is missing. HSTS informs compliant user agents that the site must only be accessed over HTTPS, preventing SSL stripping and protocol downgrade attacks.',
    businessImpact: 'Unencrypted transmissions could be intercepted or manipulated over hostile local networks.',
    remediation: "Deploy HTTP Strict-Transport-Security with a robust max-age (e.g. 'max-age=31536000; includeSubDomains; preload') once HTTPS is provisioned.",
  },
  {
    name: 'X-Frame-Options',
    headerKey: 'x-frame-options',
    severity: 'low',
    referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N',
    title: 'Missing X-Frame-Options Header',
    description: "The HTTP X-Frame-Options response header is not present. This header protects against UI clickjacking attacks by forbidding the page from being rendered inside an <iframe/>, <frame/>, or <object/> tag on third-party sites.",
    businessImpact: 'The dashboard interface could be embedded maliciously inside transparent frames to deceive authenticated users into executing unintentional actions.',
    remediation: "Set 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN', or use CSP 'frame-ancestors' directive.",
  },
  {
    name: 'X-Content-Type-Options',
    headerKey: 'x-content-type-options',
    severity: 'low',
    referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N',
    title: 'Missing X-Content-Type-Options Header',
    description: "The HTTP X-Content-Type-Options response header is not set to 'nosniff'. Without this header, older or misconfigured browsers may perform MIME-type sniffing, treating non-executable MIME types as executable script or HTML.",
    businessImpact: 'Permits unintended execution of user-supplied assets as active script under certain conditions.',
    remediation: "Set 'X-Content-Type-Options: nosniff' across all HTTP responses.",
  },
];

export const checkSecurityHeaders = {
  id: 'checkSecurityHeaders',
  category: 'client-config',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    let response;
    let responseHeaders = {};
    let requestHeaders = {
      'User-Agent': 'Sentinel-Security-Scanner/1.0',
      'Accept': '*/*',
    };

    const startTime = Date.now();

    try {
      response = await fetch(normalizedUrl, {
        method: 'GET',
        headers: requestHeaders,
        redirect: 'manual',
      });

      // Extract headers into a plain key-value object
      for (const [key, value] of response.headers.entries()) {
        responseHeaders[key.toLowerCase()] = value;
      }
    } catch (err) {
      // Record connection failure evidence if target is unreachable
      return [
        {
          checkId: 'checkSecurityHeaders',
          category: 'transport-config',
          title: 'Target Host Unreachable During Security Headers Audit',
          description: `Unable to establish connection to target URL: ${normalizedUrl}. Error: ${err.message}`,
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
          stepsToReproduce: `Execute HTTP GET against ${normalizedUrl}. Observe connection error: ${err.message}.`,
          businessImpact: 'The target application cannot be monitored or audited by automated QA pipelines.',
          remediation: 'Ensure the local instance is running and accessible on the specified port.',
        },
      ];
    }

    const durationMs = Date.now() - startTime;
    const status = response.status;
    const statusText = response.statusText;

    for (const item of REQUIRED_HEADERS) {
      const headerValue = responseHeaders[item.headerKey];

      // Missing header check
      if (!headerValue) {
        findings.push({
          checkId: 'checkSecurityHeaders',
          category: 'client-config',
          title: item.title,
          description: item.description,
          affectedComponent: `HTTP Response Headers (${normalizedUrl})`,
          severity: item.severity,
          referenceScore: item.referenceScore,
          confidence: 'confirmed',
          evidence: JSON.stringify({
            request: {
              url: normalizedUrl,
              method: 'GET',
              headers: requestHeaders,
            },
            response: {
              status,
              statusText,
              durationMs,
              headers: responseHeaders,
              missingHeader: item.name,
            },
            timestamp: new Date().toISOString(),
          }),
          stepsToReproduce: `1. Send a standard GET request to ${normalizedUrl}.\n2. Inspect the HTTP response headers.\n3. Note that '${item.name}' is absent from the response headers.`,
          businessImpact: item.businessImpact,
          remediation: item.remediation,
        });
      }
    }

    return findings;
  },
};
