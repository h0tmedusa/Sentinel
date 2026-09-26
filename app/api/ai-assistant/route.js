import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { REFERENCE_TABLE, enrichFinding } from '@/lib/referenceData.js';

function formatFindingItem(f, index) {
  const parts = [
    `${index + 1}. [${(f.severity || 'UNKNOWN').toUpperCase()}] ${f.title}`,
    `   Component: ${f.affectedComponent || 'N/A'}`,
  ];
  if (f.cweId) parts.push(`   CWE: ${f.cweId}`);
  if (f.owaspCategory) parts.push(`   OWASP: ${f.owaspCategory}`);
  if (f.remediation) parts.push(`   Remediation: ${f.remediation}`);
  return parts.join('\n');
}

function answerFromScanContext(q, scanContext) {
  const { scan, findings, counts, riskScore } = scanContext;

  // 1. Critical findings
  if (q.includes('critical')) {
    const criticals = findings.filter((f) => (f.severity || '').toLowerCase() === 'critical');
    if (criticals.length === 0) {
      return `Scan ${scan.id} for ${scan.targetUrl} has 0 critical findings.\n\nSummary: High: ${counts.high}, Medium: ${counts.medium}, Low: ${counts.low} (Risk Score: ${riskScore}/100).`;
    }
    return `Found ${criticals.length} critical severity issue(s) on ${scan.targetUrl}:\n\n` +
      criticals.map((f, i) => formatFindingItem(f, i)).join('\n\n');
  }

  // 2. High severity findings
  if (q.includes('high')) {
    const highs = findings.filter((f) => (f.severity || '').toLowerCase() === 'high');
    if (highs.length === 0) {
      return `Scan ${scan.id} for ${scan.targetUrl} has 0 high severity findings.\n\nSummary: Critical: ${counts.critical}, Medium: ${counts.medium}, Low: ${counts.low}.`;
    }
    return `Found ${highs.length} high severity issue(s) on ${scan.targetUrl}:\n\n` +
      highs.map((f, i) => formatFindingItem(f, i)).join('\n\n');
  }

  // 3. Medium / Low severity findings
  if (q.includes('medium')) {
    const mediums = findings.filter((f) => (f.severity || '').toLowerCase() === 'medium');
    return `Found ${mediums.length} medium severity issue(s) on ${scan.targetUrl}:\n\n` +
      mediums.map((f, i) => formatFindingItem(f, i)).join('\n\n');
  }

  if (q.includes('low')) {
    const lows = findings.filter((f) => (f.severity || '').toLowerCase() === 'low');
    return `Found ${lows.length} low severity issue(s) on ${scan.targetUrl}:\n\n` +
      lows.map((f, i) => formatFindingItem(f, i)).join('\n\n');
  }

  // 4. Summary / Overview / Score
  if (q.includes('summary') || q.includes('overview') || q.includes('score') || q.includes('risk') || q.includes('report') || q.includes('finding')) {
    let resp = `Scan Assessment Summary for ${scan.targetUrl}:\n`;
    resp += `• Status: ${scan.status.toUpperCase()}\n`;
    resp += `• Overall Risk Score: ${riskScore} / 100\n`;
    resp += `• Total Findings: ${findings.length}\n`;
    resp += `  - Critical: ${counts.critical}\n`;
    resp += `  - High: ${counts.high}\n`;
    resp += `  - Medium: ${counts.medium}\n`;
    resp += `  - Low: ${counts.low}\n\n`;

    if (findings.length > 0) {
      resp += `Top prioritized findings:\n` +
        findings.slice(0, 5).map((f, i) => `${i + 1}. [${(f.severity || '').toUpperCase()}] ${f.title} (${f.affectedComponent || 'General'})`).join('\n');
    } else {
      resp += `No vulnerabilities were identified during this assessment.`;
    }
    return resp;
  }

  // 5. Remediation / Fixes
  if (q.includes('remediat') || q.includes('fix') || q.includes('patch') || q.includes('resolve')) {
    if (findings.length === 0) {
      return `No open findings require remediation for scan ${scan.id} (${scan.targetUrl}).`;
    }
    return `Recommended remediation actions for ${scan.targetUrl} (prioritized by severity):\n\n` +
      findings
        .filter((f) => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 5)
        .map((f, i) => `${i + 1}. ${f.title} (${(f.severity || '').toUpperCase()}):\n   Action: ${f.remediation || 'Apply standard framework defenses.'}`)
        .join('\n\n');
  }

  // 6. Specific topic match in current findings
  const matchedFindings = findings.filter((f) => {
    const text = `${f.title} ${f.description} ${f.category} ${f.checkId} ${f.cweId || ''}`.toLowerCase();
    return q.split(/\s+/).some((w) => w.length > 3 && text.includes(w));
  });

  if (matchedFindings.length > 0) {
    return `Findings relevant to "${q}" on ${scan.targetUrl}:\n\n` +
      matchedFindings.slice(0, 4).map((f, i) => formatFindingItem(f, i)).join('\n\n');
  }

  // Fallback with scanContext
  return `Target ${scan.targetUrl} was assessed with ${findings.length} total findings (Risk Score: ${riskScore}/100, Critical: ${counts.critical}, High: ${counts.high}, Medium: ${counts.medium}, Low: ${counts.low}). You can ask for "critical findings", "remediation steps", "summary", or specific security topics like CORS, SQLi, or XSS.`;
}

function answerGeneralConcept(q) {
  if (q.includes('cors')) {
    const ref = REFERENCE_TABLE.checkCORSConfig;
    return `Cross-Origin Resource Sharing (CORS):\n` +
      `CORS controls which external web origins are permitted to make browser-based requests to your API. Misconfigurations (such as reflecting arbitrary Origin headers with Access-Control-Allow-Credentials: true) allow malicious third-party websites to exfiltrate private user data.\n\n` +
      `• OWASP: ${ref.owaspCategory}\n` +
      `• MITRE: ${ref.mitreTechnique}\n` +
      `• Remediation: Specify explicit trusted origin domains in server middleware rather than wildcards or dynamic origin reflection.`;
  }

  if (q.includes('sqli') || q.includes('sql injection') || q.includes('cwe-89')) {
    const ref = REFERENCE_TABLE.checkSQLi;
    return `SQL Injection (CWE-89):\n` +
      `Occurs when user-supplied input is concatenated directly into SQL queries rather than parameterized. Attackers can execute arbitrary SQL commands to extract, alter, or destroy database records.\n\n` +
      `• OWASP: ${ref.owaspCategory}\n` +
      `• MITRE: ${ref.mitreTechnique}\n` +
      `• NIST: ${ref.nistMapping}\n` +
      `• Remediation: Use parameterized queries, prepared statements, or ORM parameter binding (e.g. Prisma findUnique/findMany with typed arguments). Never use raw string interpolation in queries.`;
  }

  if (q.includes('xss') || q.includes('cross-site scripting') || q.includes('cwe-79')) {
    const ref = REFERENCE_TABLE.checkReflectedXSS;
    return `Cross-Site Scripting (XSS) (CWE-79):\n` +
      `Reflected XSS occurs when an application receives untrusted data in an HTTP request and echoes it into the immediate response without adequate validation or output encoding. An attacker can craft malicious URLs executing scripts in the victim's session.\n\n` +
      `• OWASP: ${ref.owaspCategory}\n` +
      `• MITRE: ${ref.mitreTechnique}\n` +
      `• Remediation: Contextually HTML-encode user inputs before rendering into response templates, or serve JSON APIs with Content-Type: application/json.`;
  }

  if (q.includes('idor') || q.includes('bola') || q.includes('broken object level')) {
    const ref = REFERENCE_TABLE.checkAccessScoping;
    return `Broken Object Level Authorization (BOLA / IDOR) (CWE-639 / API1:2023):\n` +
      `Occurs when an API endpoint accepts an object or tenant identifier in request parameters (e.g. /api/brief/:userId/:date) and returns records without validating whether the authenticated user owns or is authorized to view that object.\n\n` +
      `• OWASP: ${ref.owaspCategory}\n` +
      `• MITRE: ${ref.mitreTechnique}\n` +
      `• Remediation: Validate that the session or API key tenant matches the requested resource identifier on every database query.`;
  }

  if (q.includes('cookie') || q.includes('httponly') || q.includes('samesite')) {
    const ref = REFERENCE_TABLE.checkCookieSecurity;
    return `Cookie Security Attributes:\n` +
      `• HttpOnly (CWE-1004): Forbids client-side script access via document.cookie, mitigating session theft via XSS.\n` +
      `• Secure (CWE-614): Directs user agents to transmit the cookie only over HTTPS channels.\n` +
      `• SameSite (CWE-1275): Restricts cross-site cookie transmission to defend against Cross-Site Request Forgery (CSRF).\n\n` +
      `• OWASP: ${ref.owaspCategory}\n` +
      `• Recommendation: Set 'HttpOnly; Secure; SameSite=Lax' on all session and authentication tokens.`;
  }

  return `Sentinel Security Assistant:\n` +
    `I can answer questions regarding your assessment findings (e.g. "what are the critical findings", "summarize risk score", "show remediation steps") or general security topics like CORS, SQL Injection, Reflected XSS, BOLA/IDOR, and Cookie Security.\n\n` +
    `Provide a valid scanId in your request body to ground answers directly in your latest scan results.`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { query, scanId } = body || {};

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'Field "query" is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    const lowerQuery = trimmedQuery.toLowerCase();

    let scanContext = null;

    if (scanId && typeof scanId === 'string') {
      const scan = await prisma.scan.findUnique({
        where: { id: scanId },
        include: {
          findings: {
            orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });

      if (scan) {
        const enrichedFindings = (scan.findings || []).map((f) => enrichFinding(f));
        const criticalCount = enrichedFindings.filter((f) => f.severity === 'critical').length;
        const highCount = enrichedFindings.filter((f) => f.severity === 'high').length;
        const mediumCount = enrichedFindings.filter((f) => f.severity === 'medium').length;
        const lowCount = enrichedFindings.filter((f) => f.severity === 'low').length;

        const riskScore = Math.min(
          100,
          criticalCount * 25 + highCount * 15 + mediumCount * 5 + lowCount * 2
        );

        scanContext = {
          scan,
          findings: enrichedFindings,
          counts: {
            critical: criticalCount,
            high: highCount,
            medium: mediumCount,
            low: lowCount,
          },
          riskScore,
        };
      }
    }

    let responseText;
    if (scanContext) {
      responseText = answerFromScanContext(lowerQuery, scanContext);
    } else {
      responseText = answerGeneralConcept(lowerQuery);
    }

    return NextResponse.json({
      success: true,
      query: trimmedQuery,
      response: responseText,
      contextLoaded: Boolean(scanContext),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in AI Assistant handler:', error);
    return NextResponse.json(
      { error: 'Internal server error processing AI assistant query', details: error.message },
      { status: 500 }
    );
  }
}
