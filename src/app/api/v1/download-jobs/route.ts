import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createJob, listJobs, saveVariants } from '@/lib/db';
import { workerEngine } from '@/lib/worker/engine';
import { DownloadJob, MediaVariant } from '@/lib/types';

export const dynamic = 'force-dynamic';

const jobCreationSchema = z.object({
  sourceUrl: z.string().url('A valid URL is required'),
  provider: z.string().min(1, 'Provider identifier is required'),
  safeTitle: z.string().min(1, 'Title cannot be empty'),
  selectedVariantId: z.string().min(1, 'Variant selection is required'),
  rightsConfirmed: z.boolean(),
  variants: z.array(
    z.object({
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
    })
  ).min(1, 'At least one variant must be provided'),
});

export async function POST(req: NextRequest) {
  const requestId = `job_post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { code: 'INVALID_REQUEST_BODY', message: 'Request body must be valid JSON.', retryable: false, requestId },
        { status: 400 }
      );
    }

    const parsed = jobCreationSchema.safeParse(body);
    if (!parsed.success) {
      const errorMessage = parsed.error.errors[0]?.message ?? 'Invalid job parameters';
      return NextResponse.json(
        { code: 'INVALID_REQUEST_DATA', message: errorMessage, retryable: false, requestId },
        { status: 400 }
      );
    }

    const { sourceUrl, provider, safeTitle, selectedVariantId, rightsConfirmed, variants } = parsed.data;

    // Strict affirmative consent check
    if (!rightsConfirmed) {
      return NextResponse.json(
        {
          code: 'DOWNLOAD_NOT_PERMITTED',
          message: 'Affirmative rights confirmation is required before any media download job can be initiated.',
          retryable: false,
          requestId,
        },
        { status: 403 }
      );
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const newJob: DownloadJob = {
      id: jobId,
      status: 'queued',
      provider,
      normalizedSourceFingerprint: sourceUrl,
      sourceUrl,
      safeTitle,
      selectedVariantId,
      progressPercent: 0,
      createdAt: now,
      updatedAt: now,
    };

    await createJob(newJob);
    await saveVariants(jobId, variants as MediaVariant[]);

    // Trigger local worker processing if in persistent node environment
    try {
      workerEngine.triggerQueue();
    } catch (e: unknown) {
      console.warn(`[download-jobs POST][${requestId}] Worker queue trigger note:`, e instanceof Error ? e.message : String(e));
    }

    return NextResponse.json(
      { jobId, status: 'queued', createdAt: now, requestId },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create download job';
    console.error(`[download-jobs POST][${requestId}] Error:`, message);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create download job.', retryable: false, requestId },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const requestId = `job_get_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const searchParams = req.nextUrl?.searchParams;
    const limitParam = searchParams?.get('limit');
    let limit = 50;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 100);
      }
    }

    const jobs = await listJobs(limit);
    return NextResponse.json({ jobs, totalCount: jobs.length, requestId }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list jobs';
    console.error(`[download-jobs GET][${requestId}] Error:`, message);
    // Return empty jobs array safely so client does not break with 500
    return NextResponse.json({ jobs: [], totalCount: 0, warning: 'Jobs could not be loaded from database', requestId }, { status: 200 });
  }
}
