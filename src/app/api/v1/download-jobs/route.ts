import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createJob, listJobs, saveVariants } from '@/lib/db';
import { workerEngine } from '@/lib/worker/engine';
import { DownloadJob, MediaVariant } from '@/lib/types';

const jobCreationSchema = z.object({
  sourceUrl: z.string().url(),
  provider: z.string().min(1),
  safeTitle: z.string().min(1),
  selectedVariantId: z.string().min(1),
  rightsConfirmed: z.boolean(),
  variants: z.array(z.object({
    id: z.string(),
    sourceRef: z.string(),
    label: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    container: z.string(),
    videoCodec: z.string().optional(),
    audioPresent: z.boolean(),
    estimatedBytes: z.number().optional(),
    downloadUrl: z.string().optional(),
  })),
});

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ code: 'INVALID_URL', message: 'Invalid JSON body', retryable: false, requestId }, { status: 400 });
    }

    const parsed = jobCreationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'INVALID_URL', message: parsed.error.errors[0]?.message ?? 'Invalid job parameters', retryable: false, requestId },
        { status: 400 }
      );
    }

    const { sourceUrl, provider, safeTitle, selectedVariantId, rightsConfirmed, variants } = parsed.data;

    if (!rightsConfirmed) {
      return NextResponse.json(
        { code: 'DOWNLOAD_NOT_PERMITTED', message: 'Rights confirmation is required before any download job can be created.', retryable: false, requestId },
        { status: 403 }
      );
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const newJob: DownloadJob = {
      id: jobId, status: 'queued', provider,
      normalizedSourceFingerprint: sourceUrl, sourceUrl, safeTitle,
      selectedVariantId, progressPercent: 0, createdAt: now, updatedAt: now,
    };

    createJob(newJob);
    saveVariants(jobId, variants as MediaVariant[]);
    workerEngine.triggerQueue();

    return NextResponse.json({ jobId, status: 'queued', createdAt: now }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create download job';
    console.error('[download-jobs POST] error:', message);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message, retryable: false, requestId }, { status: 500 });
  }
}

export async function GET() {
  try {
    const jobs = listJobs(50);
    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list jobs';
    console.error('[download-jobs GET] error:', message);
    return NextResponse.json({ jobs: [] });
  }
}
