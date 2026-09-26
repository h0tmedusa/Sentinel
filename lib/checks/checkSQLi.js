/**
 * Check: checkSQLi
 * Category: input-handling
 *
 * Targets real application endpoints defined in config/endpoints.js:
 * 1. Path-parameter injection: for idEndpoints (/api/brief/[userId]/[issueDate]),
 *    injects payloads into the userId parameter slot.
 * 2. Query-parameter injection: for candidateEndpoints with GET method,
 *    injects payloads via query parameters.
 *
 * Payloads:
 *   - "'" (Syntax error probe)
 *   - "' OR '1'='1" (Boolean OR bypass)
 *   - "1 AND SLEEP(2)--" (Time-based blind probe)
 *
 * Error detection regexes:
 *   - /you have an error in your sql syntax/i
 *   - /PrismaClientKnownRequestError/i
 *   - /sqlite_error/i
 *   - /syntax error.*near/i
 *   - /unclosed quotation mark/i
 *
 * Severity:
 *   - Error match: critical, confidence confirmed, CWE-89
 *   - Time-based delay (>1500ms on SLEEP probe): high, confidence needs-review, CWE-89
 *
 * Uses safeFetch with 5000ms timeout.
 */

import { candidateEndpoints, idEndpoints } from './config/endpoints.js';
import { safeFetch, sleep } from '@/lib/httpHelpers.js';

const SQLI_PAYLOADS = [
  { name: 'Single Quote Syntax Error Probe', value: "'", isTiming: false },
  { name: 'Boolean OR Bypass Probe', value: "' OR '1'='1", isTiming: false },
  { name: 'Time-Based Blind Probe', value: '1 AND SLEEP(2)--', isTiming: true },
];

const SQLI_ERROR_PATTERNS = [
  /you have an error in your sql syntax/i,
  /PrismaClientKnownRequestError/i,
  /sqlite_error/i,
  /syntax error.*near/i,
  /unclosed quotation mark/i,
];

export const checkSQLi = {
  id: 'checkSQLi',
  category: 'input-handling',

  async run(ctx) {
    const { targetUrl } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');
    const todayDate = new Date().toISOString().slice(0, 10);

    // ── 1. Path-parameter injection on idEndpoints ─────────────────────────
    for (const idEp of idEndpoints) {
      for (const payload of SQLI_PAYLOADS) {
        // detailPath inserts the injected payload into the userId slot
        const testPath = idEp.detailPath ? idEp.detailPath(payload.value, todayDate) : `${idEp.path}/${encodeURIComponent(payload.value)}`;
        const testUrl = `${normalizedUrl}${testPath}`;

        const result = await safeFetch(
          testUrl,
          {
            method: 'GET',
            headers: {
              'User-Agent': 'Sentinel-Security-Scanner/1.0',
              'Accept': 'application/json, text/plain, */*',
            },
            redirect: 'manual',
          },
          5000
        );

        if (!result.ok) continue;

        const body = result.body || '';
        let matchedError = null;
        for (const pattern of SQLI_ERROR_PATTERNS) {
          const m = body.match(pattern);
          if (m) {
            matchedError = m[0];
            break;
          }
        }

        if (matchedError) {
          findings.push({
            checkId: 'checkSQLi',
            category: 'input-handling',
            cweId: 'CWE-89',
            title: `SQL Injection Error Disclosure in Path Parameter: ${idEp.path}`,
            description: `Injecting payload '${payload.value}' into the path parameter of '${idEp.path}' elicited a database/ORM error signature ('${matchedError}'). This confirms user-controlled input reaches a database query interpreter without adequate parameterization or validation.`,
            affectedComponent: `Endpoint: ${idEp.path}`,
            severity: 'critical',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              endpoint: testUrl,
              injectionType: 'path-parameter',
              payload: payload.value,
              matchedPattern: matchedError,
              durationMs: result.durationMs,
              responseStatus: result.response.status,
              bodySnippet: body.length > 500 ? body.slice(0, 500) + '... [truncated]' : body,
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Send GET request to '${testUrl}'.\n2. Inspect response body for SQL or ORM error signature: '${matchedError}'.`,
            businessImpact: 'Full database compromise: an attacker could extract, modify, or delete sensitive records, or bypass authentication controls.',
            remediation: "Use parameterized queries or ORM abstractions with strict type validation. Never concatenate unvalidated user inputs directly into query strings or Prisma raw queries.",
          });
          break; // Maximum 1 finding per endpoint
        } else if (payload.isTiming && result.durationMs > 1500) {
          findings.push({
            checkId: 'checkSQLi',
            category: 'input-handling',
            cweId: 'CWE-89',
            title: `Potential Time-Based Blind SQL Injection in Path Parameter: ${idEp.path}`,
            description: `Injecting time-based blind SQL payload '${payload.value}' into the path parameter of '${idEp.path}' caused a response delay of ${result.durationMs}ms (exceeding the 1500ms threshold). This indicates the sleep instruction may have executed inside a database engine.`,
            affectedComponent: `Endpoint: ${idEp.path}`,
            severity: 'high',
            referenceScore: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N',
            confidence: 'needs-review',
            evidence: JSON.stringify({
              endpoint: testUrl,
              injectionType: 'path-parameter',
              payload: payload.value,
              durationMs: result.durationMs,
              thresholdMs: 1500,
              responseStatus: result.response.status,
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Send GET request to '${testUrl}'.\n2. Note response delay of ${result.durationMs}ms matching sleep command.`,
            businessImpact: 'Potential data exfiltration via blind SQL injection techniques.',
            remediation: "Ensure all route parameters are validated as strict alphanumeric/UUID formats before evaluating queries.",
          });
          break; // Maximum 1 finding per endpoint
        }
      }
      await sleep(100);
    }

    // ── 2. Query-parameter injection on candidateEndpoints (GET) ───────────
    const getEndpoints = candidateEndpoints.filter((ep) => (ep.method || 'GET') === 'GET');

    for (const ep of getEndpoints) {
      for (const payload of SQLI_PAYLOADS) {
        const testUrl = `${normalizedUrl}${ep.path}?id=${encodeURIComponent(payload.value)}`;

        const result = await safeFetch(
          testUrl,
          {
            method: 'GET',
            headers: {
              'User-Agent': 'Sentinel-Security-Scanner/1.0',
              'Accept': 'application/json, text/plain, */*',
            },
            redirect: 'manual',
          },
          5000
        );

        if (!result.ok) continue;

        const body = result.body || '';
        let matchedError = null;
        for (const pattern of SQLI_ERROR_PATTERNS) {
          const m = body.match(pattern);
          if (m) {
            matchedError = m[0];
            break;
          }
        }

        if (matchedError) {
          findings.push({
            checkId: 'checkSQLi',
            category: 'input-handling',
            cweId: 'CWE-89',
            title: `SQL Injection Error Disclosure in Query Parameter: ${ep.path}`,
            description: `Injecting payload '${payload.value}' into the query parameter of '${ep.path}' elicited a database/ORM error signature ('${matchedError}'). User-supplied input appears in database queries without sufficient sanitization.`,
            affectedComponent: `Endpoint: ${ep.path}`,
            severity: 'critical',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              endpoint: testUrl,
              injectionType: 'query-parameter',
              payload: payload.value,
              matchedPattern: matchedError,
              durationMs: result.durationMs,
              responseStatus: result.response.status,
              bodySnippet: body.length > 500 ? body.slice(0, 500) + '... [truncated]' : body,
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Send GET request to '${testUrl}'.\n2. Inspect response body for SQL or ORM error signature: '${matchedError}'.`,
            businessImpact: 'Arbitrary database read/write access via unsanitized query parameters.',
            remediation: "Apply strict type casting and input validation for query parameters before passing them to database layer functions.",
          });
          break; // Maximum 1 finding per endpoint
        } else if (payload.isTiming && result.durationMs > 1500) {
          findings.push({
            checkId: 'checkSQLi',
            category: 'input-handling',
            cweId: 'CWE-89',
            title: `Potential Time-Based Blind SQL Injection in Query Parameter: ${ep.path}`,
            description: `Injecting time-based blind SQL payload '${payload.value}' into query parameter of '${ep.path}' resulted in ${result.durationMs}ms delay, suggesting database-level sleep execution.`,
            affectedComponent: `Endpoint: ${ep.path}`,
            severity: 'high',
            referenceScore: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N',
            confidence: 'needs-review',
            evidence: JSON.stringify({
              endpoint: testUrl,
              injectionType: 'query-parameter',
              payload: payload.value,
              durationMs: result.durationMs,
              thresholdMs: 1500,
              responseStatus: result.response.status,
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Send GET request to '${testUrl}'.\n2. Observe response delay of ${result.durationMs}ms.`,
            businessImpact: 'Potential data exfiltration via timing side-channels in database queries.',
            remediation: "Use parameterized queries and avoid dynamic SQL construction with query string values.",
          });
          break; // Maximum 1 finding per endpoint
        }
      }
      await sleep(100);
    }

    return findings;
  },
};
