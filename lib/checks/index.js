import { checkSecurityHeaders } from './checkSecurityHeaders.js';
import { checkCORSConfig } from './checkCORSConfig.js';
import { checkEndpointAuthRequirements } from './checkEndpointAuthRequirements.js';

/**
 * Registry of all automated security checks.
 * Modules are executed in order by the orchestrator.
 */
export const checks = [
  checkSecurityHeaders,
  checkCORSConfig,
  checkEndpointAuthRequirements,
];
