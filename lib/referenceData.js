/**
 * Static Reference-Table Enrichment Module
 *
 * Provides generic, authoritative cybersecurity framework mappings for each vulnerability class
 * audited by Sentinel check modules. Contains strictly vendor-agnostic, factual standard mappings
 * (OWASP, MITRE ATT&CK, NIST SP 800-53, ISO 27001) and generic remediation patch snippets.
 *
 * Rules:
 *  - Generic framework mappings ONLY.
 *  - NO target-specific claims or invented CVE identifiers.
 *  - Applied exclusively at read time via enrichFinding(finding).
 */

export const REFERENCE_TABLE = {
  checkSecurityHeaders: {
    owaspCategory: 'A05:2021 - Security Misconfiguration',
    mitreTactic: 'Defense Evasion',
    mitreTechnique: 'T1190 - Exploit Public-Facing Application',
    nistMapping: 'NIST SP 800-53 SC-8 / SI-10',
    iso27001: 'A.8.26 (Application Security Requirements)',
    patchSnippet: {
      nginx: "add_header Content-Security-Policy \"default-src 'self'\" always;\nadd_header X-Frame-Options \"SAMEORIGIN\" always;\nadd_header X-Content-Type-Options \"nosniff\" always;",
      express: "import helmet from 'helmet';\napp.use(helmet());",
    },
  },
  checkCORSConfig: {
    owaspCategory: 'A01:2021 - Broken Access Control',
    mitreTactic: 'Initial Access',
    mitreTechnique: 'T1190 - Exploit Public-Facing Application',
    nistMapping: 'NIST SP 800-53 AC-3 / AC-4',
    iso27001: 'A.8.20 (Network Security)',
    patchSnippet: {
      express: "import cors from 'cors';\napp.use(cors({ origin: ['https://app.example.com'], credentials: true }));",
      nginx: "if ($http_origin ~* ^https://app\\.example\\.com$) {\n  add_header 'Access-Control-Allow-Origin' \"$http_origin\" always;\n  add_header 'Access-Control-Allow-Credentials' 'true' always;\n}",
    },
  },
  checkInfoLeakage: {
    owaspCategory: 'A05:2021 - Security Misconfiguration',
    mitreTactic: 'Reconnaissance',
    mitreTechnique: 'T1592 - Gather Victim Host Information',
    nistMapping: 'NIST SP 800-53 SI-11 (Error Handling)',
    iso27001: 'A.8.26 (Application Security Requirements)',
    patchSnippet: {
      nginx: "server_tokens off;",
      nextjs: "// next.config.js\nmodule.exports = { poweredByHeader: false };",
      express: "app.disable('x-powered-by');",
    },
  },
  checkEndpointAuthRequirements: {
    owaspCategory: 'API2:2023 - Broken Authentication / A07:2021 - Identification and Authentication Failures',
    mitreTactic: 'Initial Access',
    mitreTechnique: 'T1078 - Valid Accounts',
    nistMapping: 'NIST SP 800-53 IA-2 / AC-3',
    iso27001: 'A.8.5 (Secure Authentication)',
    patchSnippet: {
      express: "function requireApiKey(req, res, next) {\n  const key = req.headers['x-api-key'];\n  if (!key || !validateApiKey(key)) return res.status(401).json({ error: 'Unauthorized' });\n  next();\n}",
      nextjs: "// middleware.js\nexport function middleware(req) {\n  if (!req.headers.get('x-api-key')) {\n    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });\n  }\n}",
    },
  },
  checkAccessScoping: {
    owaspCategory: 'API1:2023 - Broken Object Level Authorization (BOLA)',
    mitreTactic: 'Privilege Escalation',
    mitreTechnique: 'T1548 - Abuse Elevation Control Mechanism',
    nistMapping: 'NIST SP 800-53 AC-3 / AC-6',
    iso27001: 'A.8.3 (Information Access Restriction)',
    patchSnippet: {
      prisma: "const record = await prisma.brief.findFirst({\n  where: { id: briefId, userId: authenticatedUser.id }\n});\nif (!record) return res.status(403).json({ error: 'Access denied' });",
      express: "if (req.params.userId !== req.user.id) {\n  return res.status(403).json({ error: 'Tenant boundary violation' });\n}",
    },
  },
  checkErrorHandling: {
    owaspCategory: 'A05:2021 - Security Misconfiguration',
    mitreTactic: 'Collection / Reconnaissance',
    mitreTechnique: 'T1592 - Gather Victim Host Information',
    nistMapping: 'NIST SP 800-53 SI-11 (Error Handling)',
    iso27001: 'A.8.26 (Application Security Requirements)',
    patchSnippet: {
      express: "app.use((err, req, res, next) => {\n  console.error(err);\n  res.status(500).json({ error: 'Internal Server Error' });\n});",
      nextjs: "// app/error.js\n'use client';\nexport default function Error() {\n  return <h2>An unexpected error occurred.</h2>;\n}",
    },
  },
  checkSQLi: {
    owaspCategory: 'A03:2021 - Injection',
    mitreTactic: 'Execution / Initial Access',
    mitreTechnique: 'T1190 - Exploit Public-Facing Application',
    nistMapping: 'NIST SP 800-53 SI-10 (Information Input Validation)',
    iso27001: 'A.8.28 (Secure Coding)',
    patchSnippet: {
      prisma: "// Always use ORM parameterization instead of raw query string concatenation\nawait prisma.brief.findMany({\n  where: { userId: String(userId) }\n});",
      sql: "// Prepared statement\nconst [rows] = await db.execute('SELECT * FROM briefs WHERE user_id = ?', [userId]);",
    },
  },
  checkReflectedXSS: {
    owaspCategory: 'A03:2021 - Injection',
    mitreTactic: 'Execution',
    mitreTechnique: 'T1059.007 - Command and Scripting Interpreter: JavaScript',
    nistMapping: 'NIST SP 800-53 SI-10 (Information Input Validation)',
    iso27001: 'A.8.28 (Secure Coding)',
    patchSnippet: {
      react: "// React auto-escapes string content in JSX by default. Avoid dangerouslySetInnerHTML:\n<div>{userInput}</div>",
      express: "import he from 'he';\nconst safeOutput = he.encode(req.query.q || '');",
    },
  },
  checkLoginThrottling: {
    owaspCategory: 'A07:2021 - Identification and Authentication Failures',
    mitreTactic: 'Credential Access',
    mitreTechnique: 'T1110 - Brute Force',
    nistMapping: 'NIST SP 800-53 AC-7 (Unsuccessful Logon Attempts)',
    iso27001: 'A.8.5 (Secure Authentication)',
    patchSnippet: {
      express: "import rateLimit from 'express-rate-limit';\nconst authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });\napp.use('/api/oauth/token', authLimiter);",
      nginx: "limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;\nlocation /api/oauth/token {\n  limit_req zone=auth_limit burst=3 nodelay;\n}",
    },
  },
  checkCookieSecurity: {
    owaspCategory: 'A05:2021 - Security Misconfiguration',
    mitreTactic: 'Credential Access',
    mitreTechnique: 'T1539 - Steal Web Session Cookie',
    nistMapping: 'NIST SP 800-53 SC-8 / SC-13',
    iso27001: 'A.8.24 (Use of Cryptography)',
    patchSnippet: {
      express: "res.cookie('token', sessionValue, { httpOnly: true, secure: true, sameSite: 'lax' });",
      nextjs: "cookies().set('token', sessionValue, { httpOnly: true, secure: true, sameSite: 'lax' });",
    },
  },
  checkSensitiveDataExposure: {
    owaspCategory: 'A02:2021 - Cryptographic Failures',
    mitreTactic: 'Credential Access / Collection',
    mitreTechnique: 'T1552 - Unsecured Credentials',
    nistMapping: 'NIST SP 800-53 SC-28 (Protection of Information at Rest)',
    iso27001: 'A.8.11 (Data Masking)',
    patchSnippet: {
      prisma: "// Exclude sensitive fields from serialization\nconst user = await prisma.user.findUnique({\n  where: { id },\n  select: { id: true, email: true, name: true }\n});",
      javascript: "function sanitizeUser(user) {\n  const { password, secretKey, ...safeUser } = user;\n  return safeUser;\n}",
    },
  },
};

/**
 * Enriches a raw Finding object at read-time with static framework mappings.
 * Does not mutate input.
 *
 * @param {object} finding
 * @returns {object} enriched finding
 */
export function enrichFinding(finding) {
  if (!finding) return finding;
  const ref = REFERENCE_TABLE[finding.checkId] || {};
  return {
    ...finding,
    owaspCategory: ref.owaspCategory || null,
    mitreTactic: ref.mitreTactic || null,
    mitreTechnique: ref.mitreTechnique || null,
    nistMapping: ref.nistMapping || null,
    iso27001: ref.iso27001 || null,
    patchSnippet: ref.patchSnippet || null,
  };
}
