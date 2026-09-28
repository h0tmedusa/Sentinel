import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { enrichFinding } from '@/lib/referenceData.js';
import { requireAuth } from '@/lib/requireAuth.js';

export async function GET(request, { params }) {
  const authUser = await requireAuth(request);
  if (authUser instanceof Response) return authUser;

  try {
    const { id } = await params;

    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        findings: {
          orderBy: [
            { severity: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Parse evidence JSON safely and enrich each finding with static reference data
    const parsedFindings = scan.findings.map((f) => {
      let parsedEvidence = f.evidence;
      try {
        parsedEvidence = JSON.parse(f.evidence);
      } catch (e) {
        // Keep raw string if parsing fails
      }
      return enrichFinding({
        ...f,
        evidence: parsedEvidence,
      });
    });

    return NextResponse.json({
      scan: {
        id: scan.id,
        targetUrl: scan.targetUrl,
        status: scan.status,
        authorizedConfirmed: scan.authorizedConfirmed,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
      },
      findings: parsedFindings,
    });
  } catch (error) {
    console.error('Error fetching scan:', error);
    return NextResponse.json(
      { error: 'Internal server error while retrieving scan', details: error.message },
      { status: 500 }
    );
  }
}
