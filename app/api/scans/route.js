import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { checks } from '@/lib/checks/index.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { targetUrl, credentials } = body;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json(
        { error: 'Valid targetUrl is required' },
        { status: 400 }
      );
    }

    // 1. Create Scan record with 'running' status
    const scan = await prisma.scan.create({
      data: {
        targetUrl,
        status: 'running',
        startedAt: new Date(),
      },
    });

    const ctx = {
      targetUrl,
      credentials: credentials || {},
    };

    // 2. Run all registered checks in sequence or parallel safely
    const allFindings = [];
    for (const check of checks) {
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
          affectedComponent: targetUrl,
          severity: 'low',
          referenceScore: 'N/A',
          confidence: 'needs-review',
          evidence: JSON.stringify({
            checkId: check.id,
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
          }),
          stepsToReproduce: `Execute check ${check.id} with context against ${targetUrl}`,
          businessImpact: 'Check execution failed prematurely.',
          remediation: 'Review scanner logs and target compatibility.',
        });
      }
    }

    // 3. Persist all findings attached to this scan
    if (allFindings.length > 0) {
      await prisma.finding.createMany({
        data: allFindings.map((f) => ({
          scanId: scan.id,
          checkId: f.checkId,
          category: f.category,
          title: f.title,
          description: f.description,
          affectedComponent: f.affectedComponent || targetUrl,
          severity: f.severity,
          referenceScore: f.referenceScore || 'N/A',
          confidence: f.confidence || 'confirmed',
          evidence: typeof f.evidence === 'string' ? f.evidence : JSON.stringify(f.evidence),
          stepsToReproduce: f.stepsToReproduce || '',
          businessImpact: f.businessImpact || '',
          remediation: f.remediation || '',
        })),
      });
    }

    // 4. Update scan status to 'done'
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
    });
  } catch (error) {
    console.error('Error running scan:', error);
    return NextResponse.json(
      { error: 'Internal server error while executing scan', details: error.message },
      { status: 500 }
    );
  }
}
