/**
 * Check 5: checkErrorHandling (Verbose Errors & Debug Info Leakage)
 * Sends malformed input (broken JSON, oversized string, wrong type) to endpoints from endpoints.js.
 * Checks whether the response leaks:
 * - Stack traces (e.g., "at Object.<anonymous>", "Traceback", "TypeError:", "NullPointerException")
 * - File paths (e.g., "/node_modules/", "C:\", "/var/www/", "src/")
 * - Internal framework/runtime internals (e.g., "prisma", "nextjs", "express", "sqlite3")
 * 
 * Captures request payload and response snippet as evidence.
 * confidence: "confirmed"
 * severity: "medium"
 */

import { candidateEndpoints } from './config/endpoints.js';

const MALFORMED_PAYLOADS = [
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

export const checkErrorHandling = {
  id: 'checkErrorHandling',
  category: 'input-handling',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    // Select candidate endpoints to test
    const endpointsToTest = candidateEndpoints.slice(0, 3);

    for (const ep of endpointsToTest) {
      const endpointUrl = `${normalizedUrl}${ep.path}`;

      for (const payloadItem of MALFORMED_PAYLOADS) {
        const requestHeaders = {
          'User-Agent': 'Sentinel-Security-Scanner/1.0',
          'Accept': 'application/json, text/plain, */*',
          ...payloadItem.headers,
        };

        const startTime = Date.now();
        let response;
        let responseBody = '';
        let responseHeaders = {};

        try {
          response = await fetch(endpointUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: payloadItem.body,
            redirect: 'manual',
          });

          for (const [key, value] of response.headers.entries()) {
            responseHeaders[key.toLowerCase()] = value;
          }

          responseBody = await response.text();
        } catch (err) {
          // If request itself fails to connect, continue
          continue;
        }

        const durationMs = Date.now() - startTime;

        // Inspect response body for debug info leakage
        for (const pattern of LEAK_PATTERNS) {
          const match = responseBody.match(pattern.regex);
          if (match) {
            const leakedSnippet = match[0];

            findings.push({
              checkId: 'checkErrorHandling',
              category: 'input-handling',
              title: `Verbose Error & Debug Information Disclosure: ${ep.path}`,
              description: `When sending malformed input (${payloadItem.name}) to '${ep.path}', the application responded with internal debugging information (${pattern.label}: '${leakedSnippet}'). Leaking stack traces or runtime internals aids attackers in fingerprinting underlying technology and identifying logic flaws.`,
              affectedComponent: `Endpoint: ${ep.path}`,
              severity: 'medium',
              referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
              confidence: 'confirmed',
              evidence: JSON.stringify({
                request: {
                  url: endpointUrl,
                  method: 'POST',
                  payloadName: payloadItem.name,
                  headers: requestHeaders,
                  bodyPreview: payloadItem.body.length > 200 ? payloadItem.body.slice(0, 200) + '...' : payloadItem.body,
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
              stepsToReproduce: `1. Send a POST request to '${endpointUrl}' with payload '${payloadItem.name}'.\n2. Inspect response body.\n3. Observe disclosure matching ${pattern.label}.`,
              businessImpact: 'Internal directory paths, server framework types, and database queries are revealed to untrusted clients.',
              remediation: 'Implement a centralized global error handler that returns sanitized, generic error responses (e.g. {"error": "Invalid request"}) in non-development environments.',
            });
            break; // Stop at first matched pattern per payload
          }
        }
      }
    }

    return findings;
  },
};
