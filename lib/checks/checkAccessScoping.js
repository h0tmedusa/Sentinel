/**
 * Check 4: checkAccessScoping (IDOR / Multi-tenant scoping validation)
 * Requires credentials.userA and credentials.userB.
 * 
 * Flow:
 * 1. Log in as userA via the login endpoint; obtain auth session cookie / token.
 * 2. Log in as userB via the login endpoint; obtain auth session cookie / token.
 * 3. For each ID-referencing endpoint in endpoints.js:
 *    - Request resource list/item authenticated as userA.
 *    - Extract a resource ID and identifying marker associated with userA.
 *    - Request that SAME resource ID while authenticated as userB.
 *    - If userB's response contains userA's data or returns HTTP 200 with the record,
 *      flag broken object-level authorization (IDOR).
 * 
 * Captures full dual request/response pairs as evidence.
 * confidence: "confirmed"
 * severity: "critical"
 */

import { authConfig, idEndpoints } from './config/endpoints.js';

async function performLogin(targetUrl, credentials) {
  if (!credentials || !credentials.username || !credentials.password) {
    return null;
  }

  const loginUrl = `${targetUrl}${authConfig.loginPath}`;
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Sentinel-Security-Scanner/1.0',
    'Accept': 'application/json',
  };

  const body = JSON.stringify({
    username: credentials.username,
    password: credentials.password,
    email: credentials.username, // Accommodate apps using email field
  });

  const res = await fetch(loginUrl, {
    method: authConfig.loginMethod || 'POST',
    headers,
    body,
    redirect: 'manual',
  });

  const setCookie = res.headers.get('set-cookie');
  let token = null;

  try {
    const json = await res.json();
    token = json.token || json.accessToken || json.jwt || json.authToken || null;
  } catch (e) {
    // Body was not JSON
  }

  return {
    status: res.status,
    cookie: setCookie,
    token,
    authHeaders: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(setCookie ? { 'Cookie': setCookie.split(';')[0] } : {}),
    },
  };
}

function extractIdAndRecord(data, idField = 'id') {
  if (!data) return null;

  if (Array.isArray(data) && data.length > 0) {
    const item = data[0];
    if (item && item[idField]) {
      return { id: item[idField], record: item };
    }
  }

  if (typeof data === 'object') {
    if (data[idField]) {
      return { id: data[idField], record: data };
    }
    // Check nested items / records arrays
    const candidates = data.items || data.results || data.data || data.records;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const item = candidates[0];
      if (item && item[idField]) {
        return { id: item[idField], record: item };
      }
    }
  }

  return null;
}

export const checkAccessScoping = {
  id: 'checkAccessScoping',
  category: 'access-control',

  async run(ctx) {
    const { targetUrl, credentials } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    // Skip if dual credentials are not provided
    if (!credentials || !credentials.userA || !credentials.userB || 
        !credentials.userA.username || !credentials.userB.username) {
      return findings;
    }

    let authA;
    let authB;

    try {
      authA = await performLogin(normalizedUrl, credentials.userA);
      authB = await performLogin(normalizedUrl, credentials.userB);
    } catch (loginErr) {
      return [
        {
          checkId: 'checkAccessScoping',
          category: 'session-handling',
          title: 'Authentication Attempt Failed During Scoping Audit',
          description: `Failed to authenticate test credentials against ${authConfig.loginPath}: ${loginErr.message}`,
          affectedComponent: `${authConfig.loginPath}`,
          severity: 'medium',
          referenceScore: 'N/A',
          confidence: 'confirmed',
          evidence: JSON.stringify({
            loginEndpoint: authConfig.loginPath,
            error: loginErr.message,
            timestamp: new Date().toISOString(),
          }),
          stepsToReproduce: `Submit authentication request to ${authConfig.loginPath} with user credentials.`,
          businessImpact: 'Multi-tenant authorization boundaries cannot be automatically validated without successful authentication.',
          remediation: 'Verify userA and userB credentials and login endpoint configuration.',
        },
      ];
    }

    if (!authA || !authB || (authA.status >= 400 && authB.status >= 400)) {
      return findings;
    }

    for (const ep of idEndpoints) {
      const listUrl = `${normalizedUrl}${ep.path}`;

      let userAResponse;
      let userABody;
      try {
        userAResponse = await fetch(listUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Sentinel-Security-Scanner/1.0',
            'Accept': 'application/json',
            ...authA.authHeaders,
          },
        });
        userABody = await userAResponse.json();
      } catch (err) {
        continue;
      }

      const extracted = extractIdAndRecord(userABody, ep.idField);
      if (!extracted || !extracted.id) continue;

      const recordId = extracted.id;
      const detailUrl = `${normalizedUrl}${ep.detailPath(recordId)}`;

      let userBDetailRes;
      let userBDetailBody;
      try {
        userBDetailRes = await fetch(detailUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Sentinel-Security-Scanner/1.0',
            'Accept': 'application/json',
            ...authB.authHeaders,
          },
        });
        userBDetailBody = await userBDetailRes.json();
      } catch (err) {
        continue;
      }

      // Check if userB was able to read userA's resource (HTTP 200 with matching ID or content)
      if (userBDetailRes.status === 200 && userBDetailBody) {
        const idMatches = userBDetailBody[ep.idField] == recordId ||
                          (userBDetailBody.data && userBDetailBody.data[ep.idField] == recordId);

        if (idMatches) {
          findings.push({
            checkId: 'checkAccessScoping',
            category: 'access-control',
            title: `Broken Object Level Authorization (IDOR): ${ep.path}`,
            description: `User B was able to view and retrieve User A's private record (ID: ${recordId}) by calling '${ep.detailPath(recordId)}' without authorization scoping. The endpoint fails to enforce tenant isolation.`,
            affectedComponent: `Endpoint: ${ep.detailPath(':id')} (${ep.description})`,
            severity: 'critical',
            referenceScore: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
            confidence: 'confirmed',
            evidence: JSON.stringify({
              userA: {
                username: credentials.userA.username,
                requestedUrl: listUrl,
                returnedRecordId: recordId,
              },
              userB: {
                username: credentials.userB.username,
                targetObjectUrl: detailUrl,
                status: userBDetailRes.status,
                headers: Object.fromEntries(userBDetailRes.headers.entries()),
                responseBody: userBDetailBody,
              },
              timestamp: new Date().toISOString(),
            }),
            stepsToReproduce: `1. Authenticate as User A (${credentials.userA.username}) and retrieve record ID '${recordId}' from '${listUrl}'.\n2. Authenticate as User B (${credentials.userB.username}).\n3. Issue a GET request to '${detailUrl}'.\n4. Observe that User B receives User A's record with HTTP 200 OK.`,
            businessImpact: 'Complete breakdown of horizontal multi-tenant isolation. Malicious tenants can enumerate and exfiltrate private records, bookmarks, and settings of all other users.',
            remediation: "Enforce server-side authorization checks on all resource queries ensuring that the requested resource ID belongs to the tenant identifier stored in the verified session.",
          });
        }
      }
    }

    return findings;
  },
};
