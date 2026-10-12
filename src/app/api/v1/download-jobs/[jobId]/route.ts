import { NextRequest, NextResponse } from 'next/server';
import { getJob, deleteJob, clearAllJobs } from '@/lib/db';
import { workerEngine } from '@/lib/worker/engine';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  try {
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          code: 'SOURCE_UNAVAILABLE',
          message: `Job '${jobId}' not found.`,
          retryable: false,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(job, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve job';
    console.error(`[download-jobs GET jobId][${jobId}] Error:`, message);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to retrieve job details.', retryable: false },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  try {
    if (jobId === 'all' || req.nextUrl?.searchParams?.get('all') === 'true') {
      await clearAllJobs();
      return new NextResponse(null, { status: 204 });
    }

    const job = await getJob(jobId);
    if (!job) {
      return NextResponse.json(
        {
          code: 'SOURCE_UNAVAILABLE',
          message: `Job '${jobId}' not found.`,
          retryable: false,
        },
        { status: 404 }
      );
    }

    // Cancel in-flight task if running
    if (job.status === 'queued' || job.status === 'preparing' || job.status === 'inspecting') {
      try {
        workerEngine.cancel(jobId);
      } catch (e: unknown) {
        console.warn(`[download-jobs DELETE][${jobId}] Worker cancel warning:`, e instanceof Error ? e.message : String(e));
      }
    }

    await deleteJob(jobId);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete job';
    console.error(`[download-jobs DELETE][${jobId}] Error:`, message);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to delete job record.', retryable: false },
      { status: 500 }
    );
  }
}
