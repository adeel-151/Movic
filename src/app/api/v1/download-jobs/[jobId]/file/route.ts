import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getJob, getArtifactForJob } from '@/lib/db';
import { isPathSafe } from '@/lib/security/sanitize';
import { MEDIA_DIR } from '@/lib/config';

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
        { code: 'SOURCE_UNAVAILABLE', message: 'Job not found.', retryable: false },
        { status: 404 }
      );
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { code: 'SOURCE_UNAVAILABLE', message: `Job is currently in '${job.status}' state and not ready for download.`, retryable: false },
        { status: 400 }
      );
    }

    if (job.expiresAt && Date.now() > job.expiresAt) {
      return NextResponse.json(
        { code: 'JOB_EXPIRED', message: 'This media artifact has expired and has been cleaned up. Please re-inspect and start a new job.', retryable: false },
        { status: 410 }
      );
    }

    const artifact = await getArtifactForJob(jobId);
    if (!artifact || !fs.existsSync(artifact.internalPath)) {
      return NextResponse.json(
        { code: 'SOURCE_UNAVAILABLE', message: 'Media file artifact is missing or deleted from server storage.', retryable: false },
        { status: 404 }
      );
    }

    if (!isPathSafe(MEDIA_DIR, artifact.internalPath)) {
      return NextResponse.json(
        { code: 'SSRF_BLOCKED', message: 'Security violation: illegal file path.', retryable: false },
        { status: 403 }
      );
    }

    const stat = fs.statSync(artifact.internalPath);
    const stream = fs.createReadStream(artifact.internalPath);

    // Convert Node ReadStream to Web ReadableStream for safe streaming
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': artifact.mimeType || 'application/octet-stream',
        'Content-Length': stat.size.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(artifact.fileName)}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error serving file';
    console.error(`[download-jobs file GET][${jobId}] Error:`, message);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to stream media file.', retryable: false },
      { status: 500 }
    );
  }
}
