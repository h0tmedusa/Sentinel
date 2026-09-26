/**
 * Check: checkInfoLeakage
 * Category: api-config
 *
 * Inspects response headers on the root URL for presence of verbose server software
 * and technology stack banners:
 *   - Server
 *   - X-Powered-By
 *   - X-AspNet-Version
 *   - X-Generator
 *
 * Flagging these banners helps reduce fingerprinting surface area.
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor.
 */

import { safeFetch } from '@/lib/httpHelpers.js';

const BANNER_HEADERS = [
  {
    headerKey: 'x-powered-by',
    displayName: 'X-Powered-By',
    severity: 'low',
    referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    remediation: "Remove the 'X-Powered-By' header in framework configuration (e.g., in Next.js next.config.js set poweredByHeader: false, or in Express app.disable('x-powered-by')).",
  },
  {
    headerKey: 'server',
    displayName: 'Server',
    severity: 'low',
    referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    remediation: "Configure the web server or reverse proxy to suppress or generalize the 'Server' header banner.",
  },
  {
    headerKey: 'x-aspnet-version',
    displayName: 'X-AspNet-Version',
    severity: 'low',
    referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    remediation: "Disable the 'X-AspNet-Version' header in web.config (<httpRuntime enableVersionHeader=\"false\" />).",
  },
  {
    headerKey: 'x-generator',
    displayName: 'X-Generator',
    severity: 'low',
    referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    remediation: "Disable or strip the 'X-Generator' header in your CMS or static site generator configuration.",
  },
];

export const checkInfoLeakage = {
  id: 'checkInfoLeakage',
  category: 'api-config',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    const result = await safeFetch(normalizedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Accept': '*/*',
      },
      redirect: 'manual',
    });

    if (!result.ok) {
      return findings;
    }

    const headers = result.headers;

    for (const banner of BANNER_HEADERS) {
      const headerVal = headers[banner.headerKey];
      if (headerVal && headerVal.trim().length > 0) {
        findings.push({
          checkId: 'checkInfoLeakage',
          category: 'api-config',
          cweId: 'CWE-200',
          title: `Server Technology Banner Disclosure: ${banner.displayName}`,
          description: `The application returned the '${banner.displayName}' response header with value '${headerVal}'. Exposing backend software names and versions simplifies reconnaissance for automated scanners and targeted exploit toolkits.`,
          affectedComponent: `HTTP Response Header: ${banner.displayName} (${normalizedUrl})`,
          severity: banner.severity,
          referenceScore: banner.referenceScore,
          confidence: 'confirmed',
          evidence: JSON.stringify({
            targetUrl: normalizedUrl,
            headerName: banner.displayName,
            headerValue: headerVal,
            responseStatus: result.response.status,
            allHeaders: headers,
            timestamp: new Date().toISOString(),
          }),
          stepsToReproduce: `1. Send GET request to '${normalizedUrl}'.\n2. Inspect response headers for '${banner.displayName}'.\n3. Observe exposed value: '${headerVal}'.`,
          businessImpact: 'Aids malicious actors in identifying specific unpatched vulnerabilities and known CVEs associated with the exposed technology version.',
          remediation: banner.remediation,
        });
      }
    }

    return findings;
  },
};
