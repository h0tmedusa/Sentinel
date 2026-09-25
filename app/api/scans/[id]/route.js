import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        findings: {
          orderBy: [
            { severity: 'asc' }, // Will sort in application logic or custom priority
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Parse evidence JSON safely for each finding before returning
    const parsedFindings = scan.findings.map((f) => {
      let parsedEvidence = f.evidence;
      try {
        parsedEvidence = JSON.parse(f.evidence);
      } catch (e) {
        // Keep raw string if parsing fails
      }
      return {
        ...f,
        evidence: parsedEvidence,
      };
    });

    return NextResponse.json({
      scan: {
        id: scan.id,
        targetUrl: scan.targetUrl,
        status: scan.status,
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
