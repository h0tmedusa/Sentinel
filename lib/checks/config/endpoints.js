/**
 * Configurable list of endpoint paths and authentication configuration
 * for target applications (specifically aligned with World Monitor).
 */

/**
 * Candidate endpoints to evaluate for unauthenticated access requirements.
 * Focuses on protected user state and internal server-to-server endpoints.
 */
export const candidateEndpoints = [
  {
    path: '/api/me/entitlement',
    method: 'GET',
    requiresAuth: true,
    description: 'Current user entitlement and tier verification',
  },
  {
    path: '/api/user/mcp-quota',
    method: 'GET',
    requiresAuth: true,
    description: 'User MCP quota and consumption metrics',
  },
  {
    path: '/api/user/mcp-revoke',
    method: 'POST',
    requiresAuth: true,
    description: 'Revocation of user MCP tokens and access grants',
  },
  {
    path: '/api/referral/me',
    method: 'GET',
    requiresAuth: true,
    description: 'Authenticated user referral statistics and code',
  },
  {
    path: '/api/notification-channels',
    method: 'GET',
    requiresAuth: true,
    description: 'User alert notification channels and webhooks',
  },
  {
    path: '/api/internal/brief-why-matters',
    method: 'POST',
    requiresAuth: true,
    description: 'Internal server-to-server synthesis endpoint for intelligence brief analysis',
  },
  {
    path: '/api/internal/mcp-grant-context',
    method: 'POST',
    requiresAuth: true,
    description: 'Internal server-to-server endpoint for resolving MCP grant context',
  },
  {
    path: '/api/internal/mcp-grant-mint',
    method: 'POST',
    requiresAuth: true,
    description: 'Internal server-to-server endpoint for minting authenticated MCP grant tokens',
  },
];

/**
 * API Key authentication configuration.
 * World Monitor accepts programmatic access via API keys.
 * A test key can be provided via the WM_TEST_API_KEY environment variable.
 */
export const apiKeyConfig = {
  headerName: 'x-api-key',
  bearerPrefix: false, // Sent directly in header: 'x-api-key: <key>' or 'Authorization: Bearer <key>'
  getValidKey: () => process.env.WM_TEST_API_KEY || null,
  getInvalidKey: () => 'wm_invalid_test_key_deadbeef',
  attachKey: (headers, key) => {
    if (!key) return headers;
    return {
      ...headers,
      'x-api-key': key,
      'Authorization': `Bearer ${key}`,
    };
  },
};

/**
 * Compatibility fallback for legacy authConfig references
 * (will be transitioned in subsequent check steps).
 */
export const authConfig = {
  loginPath: '/api/oauth/token',
  loginMethod: 'POST',
};

/**
 * ID-referencing endpoints for access scoping (IDOR) validation.
 * Target route: /api/brief/[userId]/[issueDate]
 */
export const idEndpoints = [
  {
    path: '/api/brief/[userId]/[issueDate]',
    detailPath: (userId, issueDate = new Date().toISOString().slice(0, 10)) => 
      `/api/brief/${encodeURIComponent(userId)}/${encodeURIComponent(issueDate)}`,
    description: 'User daily intelligence brief lookup by user ID and issue date',
  },
];
