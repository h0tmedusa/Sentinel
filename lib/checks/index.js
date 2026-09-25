import { checkSecurityHeaders } from './checkSecurityHeaders.js';

/**
 * Registry of all automated security checks.
 * Phase 1 starts with checkSecurityHeaders, and additional checks will be added in sequence.
 */
export const checks = [
  checkSecurityHeaders,
];
