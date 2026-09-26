/**
 * Registry of all automated Sentinel security assessment checks.
 *
 * Covers 7 essential security categories:
 *  1. Client Configuration:
 *     - checkSecurityHeaders (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
 *  2. API Configuration:
 *     - checkCORSConfig (Origin reflection, wildcard credentials, preflight consistency)
 *     - checkInfoLeakage (Server, X-Powered-By, X-AspNet-Version, X-Generator banners)
 *  3. Access Control:
 *     - checkEndpointAuthRequirements (Gated routes, invalid key rejection)
 *     - checkAccessScoping (BOLA / IDOR across user tenants on /api/brief)
 *  4. Input Handling:
 *     - checkErrorHandling (Verbose stack traces, internal paths, ORM details)
 *     - checkSQLi (Path & query SQL syntax error probes, time-based blind injection)
 *     - checkReflectedXSS (Unencoded tag reflection in API responses)
 *  5. Session Handling:
 *     - checkLoginThrottling (Rate limiting on OAuth token & API key endpoints)
 *     - checkCookieSecurity (HttpOnly, Secure, SameSite attribute enforcement)
 *  6. Data Storage & Privacy:
 *     - checkSensitiveDataExposure (Passwords, secret keys, AWS keys, unexpected JWTs)
 *
 * Modules execute sequentially in order.
 */

import { checkSecurityHeaders } from './checkSecurityHeaders.js';
import { checkCORSConfig } from './checkCORSConfig.js';
import { checkInfoLeakage } from './checkInfoLeakage.js';
import { checkEndpointAuthRequirements } from './checkEndpointAuthRequirements.js';
import { checkAccessScoping } from './checkAccessScoping.js';
import { checkErrorHandling } from './checkErrorHandling.js';
import { checkSQLi } from './checkSQLi.js';
import { checkReflectedXSS } from './checkReflectedXSS.js';
import { checkLoginThrottling } from './checkLoginThrottling.js';
import { checkCookieSecurity } from './checkCookieSecurity.js';
import { checkSensitiveDataExposure } from './checkSensitiveDataExposure.js';

export const checks = [
  checkSecurityHeaders,
  checkCORSConfig,
  checkInfoLeakage,
  checkEndpointAuthRequirements,
  checkAccessScoping,
  checkErrorHandling,
  checkSQLi,
  checkReflectedXSS,
  checkLoginThrottling,
  checkCookieSecurity,
  checkSensitiveDataExposure,
];
