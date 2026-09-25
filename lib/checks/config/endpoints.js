/**
 * Configurable list of endpoint paths used by checks:
 * - checkEndpointAuthRequirements
 * - checkAccessScoping
 * - checkErrorHandling
 * - checkLoginThrottling
 */

export const candidateEndpoints = [
  {
    path: '/api/feed',
    method: 'GET',
    requiresAuth: true,
    description: 'Intelligence news and alert feed',
  },
  {
    path: '/api/alerts',
    method: 'GET',
    requiresAuth: true,
    description: 'Geopolitical alert streams',
  },
  {
    path: '/api/config',
    method: 'GET',
    requiresAuth: true,
    description: 'Dashboard configuration and system state',
  },
  {
    path: '/api/user/profile',
    method: 'GET',
    requiresAuth: true,
    description: 'User profile details',
  },
  {
    path: '/api/channels',
    method: 'GET',
    requiresAuth: true,
    description: 'Monitored channels and telemetry endpoints',
  },
];

export const authConfig = {
  loginPath: '/api/auth/login',
  loginMethod: 'POST',
};

export const idEndpoints = [
  {
    path: '/api/bookmarks',
    detailPath: (id) => `/api/bookmarks/${id}`,
    idField: 'id',
    description: 'Saved intelligence bookmarks',
  },
  {
    path: '/api/user/settings',
    detailPath: (id) => `/api/user/settings/${id}`,
    idField: 'id',
    description: 'User settings and preferences',
  },
];
