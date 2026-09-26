import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { enrichFinding } from '@/lib/referenceData.js';

const TOOL_NAME = 'Sentinel Security Assessment';
const TOOL_VERSION = '1.0.0';

const CEF_SEVERITY = {
  critical: 10,
  high: 8,
  medium: 5,
  low: 2,
};

const SYSLOG_PRIORITY = {
  critical: 131,
  high: 132,
  medium: 134,
  low: 136,
};

function escapeCEF(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scanId');
    const format = (searchParams.get('format') || 'json').toLowerCase();
    const isDownload = searchParams.get('download') === 'true' || searchParams.has('download');

    if (!scanId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: scanId' },
        { status: 400 }
      );
    }

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        findings: {
          orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!scan) {
      return NextResponse.json(
        { error: `Scan not found with id: ${scanId}` },
        { status: 404 }
      );
    }

    const durationSeconds = scan.finishedAt && scan.startedAt
      ? Math.round((new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000)
      : 0;

    const rawFindings = scan.findings || [];
    const criticalCount = rawFindings.filter((f) => f.severity === 'critical').length;
    const highCount = rawFindings.filter((f) => f.severity === 'high').length;
    const mediumCount = rawFindings.filter((f) => f.severity === 'medium').length;
    const lowCount = rawFindings.filter((f) => f.severity === 'low').length;

    const riskScore = Math.min(
      100,
      criticalCount * 25 + highCount * 15 + mediumCount * 5 + lowCount * 2
    );

    // ── CEF Format ───────────────────────────────────────────────────────────
    if (format === 'cef') {
      const lines = rawFindings.map((f) => {
        const enriched = enrichFinding(f);
        const deviceEventClassId = escapeCEF(enriched.cweId || enriched.checkId);
        const name = escapeCEF((enriched.title || '').slice(0, 48));
        const severityScore = CEF_SEVERITY[enriched.severity?.toLowerCase()] || 1;
        const requestPath = escapeCEF(enriched.affectedComponent || scan.targetUrl);
        const msg = escapeCEF(enriched.title || '');
        const category = escapeCEF(enriched.category || 'general');

        return `CEF:0|Sentinel|SecurityScanner|${TOOL_VERSION}|${deviceEventClassId}|${name}|${severityScore}|src=scanner-host request=${requestPath} msg=${msg} cs1=${category} cs1Label=Category`;
      });

      const cefContent = lines.join('\n');
      return new NextResponse(cefContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="sentinel-siem-${scan.id}.cef"`,
        },
      });
    }

    // ── Syslog (RFC 5424) Format ─────────────────────────────────────────────
    if (format === 'syslog') {
      const pid = process.pid || 1;
      const lines = rawFindings.map((f) => {
        const enriched = enrichFinding(f);
        const priority = SYSLOG_PRIORITY[enriched.severity?.toLowerCase()] || 134;
        const timestamp = enriched.createdAt
          ? new Date(enriched.createdAt).toISOString()
          : new Date().toISOString();
        const findingId = enriched.id;
        const severity = enriched.severity || 'low';
        const cwe = enriched.cweId || 'N/A';
        const title = (enriched.title || '').replace(/[\r\n]+/g, ' ');
        const component = (enriched.affectedComponent || scan.targetUrl).replace(/[\r\n]+/g, ' ');

        return `<${priority}>1 ${timestamp} sentinel-scanner SecurityAssessment ${pid} ${findingId} [sentinel severity="${severity}" cwe="${cwe}"] ${title} on ${component}`;
      });

      const syslogContent = lines.join('\n');
      return new NextResponse(syslogContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="sentinel-syslog-${scan.id}.log"`,
        },
      });
    }

    // ── JSON Report Format ───────────────────────────────────────────────────
    const enrichedVulnerabilities = rawFindings.map((f) => {
      let parsedEvidence = f.evidence;
      try {
        parsedEvidence = JSON.parse(f.evidence);
      } catch {
        // retain string if parse fails
      }
      return enrichFinding({
        ...f,
        evidence: parsedEvidence,
      });
    });

    const reportData = {
      assessment: {
        tool: TOOL_NAME,
        version: TOOL_VERSION,
        exportedAt: new Date().toISOString(),
        scanId: scan.id,
        targetUrl: scan.targetUrl,
        status: scan.status,
        authorizedConfirmed: scan.authorizedConfirmed,
        timestamps: {
          startedAt: scan.startedAt,
          finishedAt: scan.finishedAt,
          durationSeconds,
        },
      },
      summaryMetrics: {
        total: rawFindings.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        riskScore,
      },
      vulnerabilities: enrichedVulnerabilities,
    };

    if (isDownload || (format === 'json' && searchParams.has('download'))) {
      return new NextResponse(JSON.stringify(reportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="sentinel-report-${scan.id}.json"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json(
      { error: 'Internal server error while exporting scan data', details: error.message },
      { status: 500 }
    );
  }
}
