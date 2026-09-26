import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export async function GET() {
  try {
    const scans = await prisma.scan.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: {
        findings: true,
      },
    });

    const formattedScans = scans.map((scan) => {
      const findings = scan.findings || [];
      const criticalCount = findings.filter((f) => f.severity === 'critical').length;
      const highCount = findings.filter((f) => f.severity === 'high').length;
      const mediumCount = findings.filter((f) => f.severity === 'medium').length;
      const lowCount = findings.filter((f) => f.severity === 'low').length;

      const riskScore = Math.min(
        100,
        criticalCount * 25 + highCount * 15 + mediumCount * 5 + lowCount * 2
      );

      const durationSeconds = scan.finishedAt && scan.startedAt
        ? Math.round((new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000)
        : 0;

      return {
        id: scan.id,
        targetUrl: scan.targetUrl,
        status: scan.status,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        durationSeconds,
        totalFindings: findings.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        riskScore,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        scans: formattedScans,
      },
    });
  } catch (error) {
    console.error('Error fetching scan history:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error while fetching scan history' },
      },
      { status: 500 }
    );
  }
}
