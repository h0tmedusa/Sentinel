import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { checks } from '@/lib/checks/index.js';
import { parseAndNormalizeUrl } from '@/lib/urlParser.js';
import { redactEvidence } from '@/lib/redact.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { targetUrl, credentials, confirmAuthorized, checkIds } = body;

    // 1. Explicit authorization confirmation gate
    if (confirmAuthorized !== true) {
      return NextResponse.json(
        { error: 'You must confirm you are authorized to test this target before a scan can run.' },
        { status: 400 }
      );
    }

    // 2. SSRF protection and URL normalization
    let parsedUrl;
    try {
      parsedUrl = parseAndNormalizeUrl(targetUrl);
    } catch (err) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }

    const { normalizedUrl } = parsedUrl;

    // 3. Resolve active checks based on optional checkIds filter
    let activeChecks = checks;
    if (Array.isArray(checkIds) && checkIds.length > 0) {
      const selectedSet = new Set(checkIds);
      activeChecks = checks.filter((c) => selectedSet.has(c.id));
    }
    const checksRun = activeChecks.map((c) => c.id);

    // 4. Create Scan record with 'running' status and authorizedConfirmed audit trail
    const scan = await prisma.scan.create({
      data: {
        targetUrl: normalizedUrl,
        status: 'running',
        authorizedConfirmed: true,
        startedAt: new Date(),
      },
    });

    const ctx = {
      targetUrl: normalizedUrl,
      credentials: credentials || {},
    };

    // 5. Run active registered checks in sequence safely
    const allFindings = [];
    for (const check of activeChecks) {
      try {
        const results = await check.run(ctx);
        if (Array.isArray(results)) {
          allFindings.push(...results);
        }
      } catch (err) {
        console.error(`Check ${check.id} failed:`, err);
        // Persist check failure finding
        allFindings.push({
          checkId: check.id,
          category: check.category || 'api-config',
          title: `Execution error in check: ${check.id}`,
          description: `An unhandled exception occurred during execution: ${err.message}`,
          affectedComponent: normalizedUrl,
          severity: 'low',
          referenceScore: 'N/A',
          cweId: null,
          confidence: 'needs-review',
          evidence: JSON.stringify({
            checkId: check.id,
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
          }),
          stepsToReproduce: `Execute check ${check.id} with context against ${normalizedUrl}`,
          businessImpact: 'Check execution failed prematurely.',
          remediation: 'Review scanner logs and target compatibility.',
        });
      }
    }

    // 6. Persist all findings attached to this scan (with sensitive values redacted)
    if (allFindings.length > 0) {
      const sanitizedFindings = allFindings.map((f) => {
        let sanitizedEvidence = f.evidence;
        try {
          const parsed = typeof f.evidence === 'string' ? JSON.parse(f.evidence) : f.evidence;
          const redacted = redactEvidence(parsed);
          sanitizedEvidence = JSON.stringify(redacted);
        } catch {
          sanitizedEvidence = typeof f.evidence === 'string' ? f.evidence : JSON.stringify(f.evidence);
        }

        return {
          scanId: scan.id,
          checkId: f.checkId,
          category: f.category,
          title: f.title,
          description: f.description,
          affectedComponent: f.affectedComponent || normalizedUrl,
          severity: f.severity,
          referenceScore: f.referenceScore || 'N/A',
          cweId: f.cweId || null,
          confidence: f.confidence || 'confirmed',
          evidence: sanitizedEvidence,
          stepsToReproduce: f.stepsToReproduce || '',
          businessImpact: f.businessImpact || '',
          remediation: f.remediation || '',
        };
      });

      await prisma.finding.createMany({
        data: sanitizedFindings,
      });
    }

    // 7. Update scan status to 'done'
    const updatedScan = await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: 'done',
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      scanId: updatedScan.id,
      status: updatedScan.status,
      findingsCount: allFindings.length,
      checksRun,
    });
  } catch (error) {
    console.error('Error running scan:', error);
    return NextResponse.json(
      { error: 'Internal server error while executing scan', details: error.message },
      { status: 500 }
    );
  }
}
