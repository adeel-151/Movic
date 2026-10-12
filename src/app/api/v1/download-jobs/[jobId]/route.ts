import { NextRequest, NextResponse } from 'next/server';
import { getJob, deleteJob, clearAllJobs } from '@/lib/db';
import { workerEngine } from '@/lib/worker/engine';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

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

  return NextResponse.json(job);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (jobId === 'all' || req.nextUrl.searchParams.get('all') === 'true') {
    clearAllJobs();
    return new NextResponse(null, { status: 204 });
  }

  const job = getJob(jobId);
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

  // If in progress or queued, cancel it first
  if (job.status === 'queued' || job.status === 'preparing' || job.status === 'inspecting') {
    workerEngine.cancel(jobId);
  }

  deleteJob(jobId);
  return new NextResponse(null, { status: 204 });
}
