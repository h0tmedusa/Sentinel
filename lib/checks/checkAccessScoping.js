/**
 * Check 4: checkAccessScoping (IDOR / Multi-tenant scoping validation)
 * 
 * Target: /api/brief/[userId]/[issueDate]
 * 
 * Verifies whether an authenticated account (Account B, using a valid API key)
 * can access private daily briefs belonging to another user (User A).
 * 
 * Flow:
 * 1. Reads credentials from ctx.credentials:
 *    - userAId: known userId of account A (fallback: process.env.WM_TEST_USER_A_ID)
 *    - userBApiKey: valid API key of account B (fallback: process.env.WM_TEST_USER_B_API_KEY or process.env.WM_TEST_API_KEY)
 * 2. Issues Request 1: Target brief URL using Account B's API key.
 * 3. Issues Request 2 (Control): Same target brief URL with NO API key attached.
 * 4. Checks response for specific content matching User A (issueDate, userId, brief body/hash).
 * 5. If Account B retrieves User A's data:
 *    - If unauthenticated control request ALSO returns 200 with the brief, downgrade severity to 'medium'
 *      and note public accessibility.
 *    - If unauthenticated control is blocked (401/403/404) but Account B succeeds, report 'critical' IDOR.
 * 
 * Captures full request/response pairs for both authenticated and control requests as evidence.
 */

import { apiKeyConfig, idEndpoints } from './config/endpoints.js';

function isValidBriefContent(body, expectedUserId, expectedIssueDate) {
  if (!body) return false;

  let data = body;
  if (typeof body === 'string') {
    try {
      data = JSON.parse(body);
    } catch (e) {
      // If HTML or text, ensure it's not a generic error page
      return false;
    }
  }

  // If response is an error object echoing params, ignore
  if (data.error || data.message || data.statusCode >= 400) {
    return false;
  }

  // Must contain substantial brief properties or user match
  const hasBriefPayload = 
    data.brief !== undefined ||
    data.sections !== undefined ||
    data.articles !== undefined ||
    data.hash !== undefined ||
    data.summary !== undefined ||
    data.stories !== undefined;

  const matchesUser = 
    data.userId === expectedUserId ||
    data.user === expectedUserId ||
    (data.brief && data.brief.userId === expectedUserId);

  const matchesDate = 
    data.issueDate === expectedIssueDate ||
    data.date === expectedIssueDate ||
    (data.brief && data.brief.issueDate === expectedIssueDate);

  // Require actual brief content plus at least user or date association
  if (hasBriefPayload && (matchesUser || matchesDate)) {
    return true;
  }

  // Also match if explicit userId and issueDate fields exist with data
  if (matchesUser && matchesDate && Object.keys(data).length > 2) {
    return true;
  }

  return false;
}

export const checkAccessScoping = {
  id: 'checkAccessScoping',
  category: 'access-control',

  async run(ctx) {
    const { targetUrl, credentials = {} } = ctx;
    const findings = [];
    const normalizedUrl = targetUrl.replace(/\/+$/, '');

    // Source userAId and userBApiKey from ctx.credentials or environment variables
    const userAId = credentials.userAId || 
                    (credentials.userA && credentials.userA.username) || 
                    process.env.WM_TEST_USER_A_ID;

    const userBApiKey = credentials.userBApiKey || 
                        credentials.apiKey || 
                        process.env.WM_TEST_USER_B_API_KEY || 
                        process.env.WM_TEST_API_KEY;

    // Skip if credentials for account scoping test are not supplied
    if (!userAId || !userBApiKey) {
      return findings;
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const targetEndpointDef = idEndpoints[0];
    const targetPath = targetEndpointDef.detailPath(userAId, todayDate);
    const fullTargetUrl = `${normalizedUrl}${targetPath}`;

    // Request 1: Access User A's brief using Account B's API key
    let accountBHeaders = {
      'User-Agent': 'Sentinel-Security-Scanner/1.0',
      'Accept': 'application/json',
    };
    accountBHeaders = apiKeyConfig.attachKey(accountBHeaders, userBApiKey);

    let accountBRes;
    let accountBBody = null;
    let accountBHeadersObserved = {};
    const startTimeB = Date.now();

    try {
      accountBRes = await fetch(fullTargetUrl, {
        method: 'GET',
        headers: accountBHeaders,
        redirect: 'manual',
      });

      for (const [key, value] of accountBRes.headers.entries()) {
        accountBHeadersObserved[key.toLowerCase()] = value;
      }

      const textB = await accountBRes.text();
      try {
        accountBBody = JSON.parse(textB);
      } catch (e) {
        accountBBody = textB;
      }
    } catch (err) {
      // Target connection failed
      return findings;
    }
    const durationB = Date.now() - startTimeB;

    // Request 2 (Control): Same target URL with NO API key / credentials attached
    let controlHeaders = {
      'User-Agent': 'Sentinel-Security-Scanner/1.0',
      'Accept': 'application/json',
    };

    let controlRes;
    let controlBody = null;
    let controlHeadersObserved = {};
    const startTimeControl = Date.now();

    try {
      controlRes = await fetch(fullTargetUrl, {
        method: 'GET',
        headers: controlHeaders,
        redirect: 'manual',
      });

      for (const [key, value] of controlRes.headers.entries()) {
        controlHeadersObserved[key.toLowerCase()] = value;
      }

      const textControl = await controlRes.text();
      try {
        controlBody = JSON.parse(textControl);
      } catch (e) {
        controlBody = textControl;
      }
    } catch (err) {
      // Control request failed to connect
    }
    const durationControl = Date.now() - startTimeControl;

    // Evaluate finding criteria
    const bSuccess = accountBRes && accountBRes.status === 200;
    const bHasContent = isValidBriefContent(accountBBody, userAId, todayDate);

    if (bSuccess && bHasContent) {
      const controlSuccess = controlRes && controlRes.status === 200;
      const controlHasContent = isValidBriefContent(controlBody, userAId, todayDate);
      const isPubliclyAccessible = controlSuccess && controlHasContent;

      const severity = isPubliclyAccessible ? 'medium' : 'critical';
      const referenceScore = isPubliclyAccessible 
        ? 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N' 
        : 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N';

      const title = isPubliclyAccessible
        ? `Unprotected Public Access to User Intelligence Brief: ${targetPath}`
        : `Broken Object Level Authorization (IDOR): ${targetPath}`;

      const description = isPubliclyAccessible
        ? `Account B requested User A's private daily intelligence brief (${targetPath}) and received HTTP 200 OK with valid brief content. However, the unauthenticated control request ALSO received HTTP 200 with the brief payload. This indicates the endpoint lacks authentication gating entirely rather than being an authorization-scoping failure specific to Account B.`
        : `Account B successfully retrieved User A's private daily intelligence brief (${targetPath}) using its own API key. The unauthenticated control request was rejected or withheld (HTTP ${controlRes ? controlRes.status : 'N/A'}), confirming an authorization scoping bypass (IDOR) across tenant boundaries.`;

      findings.push({
        checkId: 'checkAccessScoping',
        category: 'access-control',
        title,
        description,
        affectedComponent: `Endpoint: ${targetEndpointDef.path}`,
        severity,
        referenceScore,
        confidence: 'confirmed',
        evidence: JSON.stringify({
          targetUserAId: userAId,
          issueDate: todayDate,
          testedEndpoint: fullTargetUrl,
          accountBRequest: {
            method: 'GET',
            headers: accountBHeaders,
            status: accountBRes.status,
            statusText: accountBRes.statusText,
            durationMs: durationB,
            responseHeaders: accountBHeadersObserved,
            bodySnippet: typeof accountBBody === 'object' ? accountBBody : (accountBBody || '').slice(0, 500),
          },
          unauthenticatedControlRequest: {
            method: 'GET',
            headers: controlHeaders,
            status: controlRes ? controlRes.status : null,
            statusText: controlRes ? controlRes.statusText : null,
            durationMs: durationControl,
            responseHeaders: controlHeadersObserved,
            bodySnippet: typeof controlBody === 'object' ? controlBody : (controlBody || '').slice(0, 500),
          },
          isPubliclyAccessible,
          timestamp: new Date().toISOString(),
        }),
        stepsToReproduce: `1. Generate or identify User A's account ID ('${userAId}').\n2. Issue a GET request to '${fullTargetUrl}' attaching Account B's API key in '${apiKeyConfig.headerName}'.\n3. Observe HTTP 200 OK returning User A's brief.\n4. Send a control GET request to '${fullTargetUrl}' without any API key (Status: ${controlRes ? controlRes.status : 'N/A'}).`,
        businessImpact: isPubliclyAccessible
          ? 'Intelligence briefs containing curated watchlist events and user focus areas are exposed publicly without authentication.'
          : 'Complete breakdown of horizontal multi-tenant isolation. Account B can enumerate and exfiltrate private intelligence briefs of any other user.',
        remediation: "Verify that the authenticated caller's identity (derived from session token or API key owner) matches the target userId path parameter before returning brief records. Deny access (HTTP 403 Forbidden) if tenant identity differs.",
      });
    }

    return findings;
  },
};
