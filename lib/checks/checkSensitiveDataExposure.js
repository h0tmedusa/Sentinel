/**
 * Check: checkSensitiveDataExposure
 * Category: data-storage
 *
 * Inspects authenticated responses from candidateEndpoints for exposed sensitive secrets:
 *   - Passwords / password hashes (plaintext or bcrypt) [CWE-256 / CWE-916]
 *   - Private keys / API secrets [CWE-312]
 *   - AWS Access Key IDs (AKIA...) [CWE-798]
 *   - Unexpected JWT / bearer tokens in non-token fields [CWE-200]
 *
 * Capped at one finding per pattern type per scan to prevent duplicate noise.
 * Skips silently if no valid API key is configured.
 */

import { candidateEndpoints, apiKeyConfig } from './config/endpoints.js';
import { safeFetch, sleep } from '@/lib/httpHelpers.js';

const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\./;
const AWS_KEY_PATTERN = /AKIA[0-9A-Z]{16}/;
const BCRYPT_PATTERN = /^\$2[aby]\$/;

function walkAndFindLeaks(obj, onMatch) {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      walkAndFindLeaks(item, onMatch);
    }
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && val.trim().length > 0) {
      // 1. Password detection
      if (/password|passwd|pwd/i.test(key)) {
        if (BCRYPT_PATTERN.test(val)) {
          onMatch('PASSWORD_HASH', { key, val, isHash: true });
        } else {
          onMatch('PASSWORD_PLAINTEXT', { key, val, isHash: false });
        }
      }

      // 2. Secret / Private key detection
      if (/secret|privateKey|apiSecret/i.test(key)) {
        onMatch('SECRET_KEY', { key, val });
      }

      // 3. AWS Access Key pattern in value
      if (AWS_KEY_PATTERN.test(val)) {
        onMatch('AWS_KEY', { key, val });
      }

      // 4. Unexpected JWT token under a key not named token/accessToken/jwt/sessionToken
      if (JWT_PATTERN.test(val) && !/token|accesstoken|jwt|sessiontoken/i.test(key)) {
        onMatch('UNEXPECTED_JWT', { key, val });
      }
    } else if (typeof val === 'object' && val !== null) {
      walkAndFindLeaks(val, onMatch);
    }
  }
}

export const checkSensitiveDataExposure = {
  id: 'checkSensitiveDataExposure',
  category: 'data-storage',

  async run(ctx) {
    const { targetUrl, credentials = {} } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    const validKey = credentials.apiKey || credentials.userBApiKey || credentials.userB?.password || apiKeyConfig.getValidKey();
    // Skip silently if no test key configured
    if (!validKey) {
      return findings;
    }

    // Set to cap at one finding per pattern type across the entire scan
    const seenPatterns = new Set();

    for (const ep of candidateEndpoints) {
      const endpointUrl = `${normalizedUrl}${ep.path}`;
      const method = ep.method || 'GET';

      let headers = {
        'User-Agent': 'Sentinel-Security-Scanner/1.0',
        'Accept': 'application/json, text/plain, */*',
      };
      headers = apiKeyConfig.attachKey(headers, validKey);

      const result = await safeFetch(endpointUrl, {
        method,
        headers,
        redirect: 'manual',
      });

      if (!result.ok) continue;

      let parsedData;
      try {
        parsedData = JSON.parse(result.body);
      } catch {
        continue;
      }

      walkAndFindLeaks(parsedData, (patternType, detail) => {
        if (seenPatterns.has(patternType)) return;
        seenPatterns.add(patternType);

        if (patternType === 'PASSWORD_PLAINTEXT' || patternType === 'PASSWORD_HASH') {
          const isHash = detail.isHash;
          findings.push({
            checkId: 'checkSensitiveDataExposure',
            category: 'data-storage',
            cweId: isHash ? 'CWE-916' : 'CWE-256',
            title: isHash
              ? 'Password Hash Value Present in API Response'
              : 'Password Value Present in API Response',
            description: `The endpoint '${ep.path}' returned an object containing sensitive password data in field '${detail.key}'. User passwords must never be exposed or returned in API responses.`,
            affectedComponent: `Field: ${detail.key} (${ep.path})`,
            severity: 'critical',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              endpoint: endpointUrl,
              fieldName: detail.key,
              patternType,
              responseStatus: result.response.status,
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Authenticate to '${endpointUrl}' with API key.\n2. Inspect response JSON for key '${detail.key}'.`,
            businessImpact: 'Mass credential exposure allowing immediate account takeover or offline dictionary/rainbow-table attacks.',
            remediation: "Ensure password fields are excluded (e.g. Prisma select/omit) from serialization before returning API payloads.",
          });
        } else if (patternType === 'SECRET_KEY') {
          findings.push({
            checkId: 'checkSensitiveDataExposure',
            category: 'data-storage',
            cweId: 'CWE-312',
            title: 'Secret/Private Key Exposed in API Response',
            description: `The endpoint '${ep.path}' disclosed a cryptographic secret or private key in response field '${detail.key}'. Private keys must remain strictly server-side and never be returned to clients.`,
            affectedComponent: `Field: ${detail.key} (${ep.path})`,
            severity: 'critical',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              endpoint: endpointUrl,
              fieldName: detail.key,
              patternType,
              responseStatus: result.response.status,
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Send authenticated ${method} request to '${endpointUrl}'.\n2. Note response field '${detail.key}' containing secret key material.`,
            businessImpact: 'Compromise of backend service credentials, signing keys, or third-party API tokens.',
            remediation: "Never return server secrets or private keys over client-facing APIs. Store secrets in environment variables or KMS.",
          });
        } else if (patternType === 'AWS_KEY') {
          findings.push({
            checkId: 'checkSensitiveDataExposure',
            category: 'data-storage',
            cweId: 'CWE-798',
            title: 'AWS Access Key Exposed in Response Body',
            description: `The response from '${ep.path}' contains an AWS Access Key ID (AKIA...) in field '${detail.key}'. Hardcoded or leaked cloud credentials enable unauthorized infrastructure access.`,
            affectedComponent: `Field: ${detail.key} (${ep.path})`,
            severity: 'critical',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              endpoint: endpointUrl,
              fieldName: detail.key,
              patternType,
              responseStatus: result.response.status,
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Request '${endpointUrl}'.\n2. Observe AWS Access Key string pattern matching 'AKIA[0-9A-Z]{16}' in field '${detail.key}'.`,
            businessImpact: 'Unauthorized cloud infrastructure access, resource hijacking, data exfiltration, or denial of service in AWS tenant.',
            remediation: 'Immediately rotate the exposed AWS credential in IAM and ensure cloud keys are injected only via IAM roles or instance profiles.',
          });
        } else if (patternType === 'UNEXPECTED_JWT') {
          findings.push({
            checkId: 'checkSensitiveDataExposure',
            category: 'data-storage',
            cweId: 'CWE-200',
            title: 'Unexpected Token/JWT Value in Response Field',
            description: `The response from '${ep.path}' contains a JSON Web Token (JWT) under an unexpected field name ('${detail.key}'). Tokens placed in non-standard fields may bypass client storage hygiene policies or indicate leaked upstream authentication tokens.`,
            affectedComponent: `Field: ${detail.key} (${ep.path})`,
            severity: 'medium',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N',
            confidence: 'needs-review',
            evidence: JSON.stringify({
              endpoint: endpointUrl,
              fieldName: detail.key,
              patternType,
              responseStatus: result.response.status,
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Request '${endpointUrl}'.\n2. Observe JWT format string in response field '${detail.key}'.`,
            businessImpact: 'Upstream tokens or inter-service credentials may be inadvertently exposed to client applications.',
            remediation: 'Audit the data mapping for this endpoint and omit extraneous session or JWT attributes.',
          });
        }
      });

      await sleep(100);
    }

    return findings;
  },
};
