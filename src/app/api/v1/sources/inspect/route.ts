import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSafeUrl, SecurityError } from '@/lib/security/ssrf';
import { providerRegistry } from '@/lib/providers/registry';
import { getAppSettings } from '@/lib/db';

const inspectSchema = z.object({
  url: z.string().min(1, 'URL cannot be empty'),
});

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { code: 'INVALID_URL', message: 'Request body must be valid JSON.', retryable: false, requestId },
        { status: 400 }
      );
    }

    const parsed = inspectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'INVALID_URL', message: parsed.error.errors[0]?.message ?? 'Invalid request body', retryable: false, requestId },
        { status: 400 }
      );
    }

    const rawUrl = parsed.data.url.trim();
    let safeUrl: URL;
    try {
      safeUrl = await validateSafeUrl(rawUrl);
    } catch (err: unknown) {
      if (err instanceof SecurityError) {
        return NextResponse.json(
          { code: err.code, message: err.message, retryable: false, requestId },
          { status: 403 }
        );
      }
      const message = err instanceof Error ? err.message : 'URL validation failed';
      return NextResponse.json(
        { code: 'INVALID_URL', message, retryable: false, requestId },
        { status: 400 }
      );
    }

    const adapter = providerRegistry.findAdapterForUrl(safeUrl);
    if (!adapter) {
      return NextResponse.json(
        {
          code: 'PROVIDER_UNSUPPORTED',
          message: `The hostname '${safeUrl.hostname}' is not supported. Supported: YouTube, TikTok, Vimeo, and direct MP4/WebM URLs.`,
          retryable: false,
          requestId,
        },
        { status: 422 }
      );
    }

    const settings = getAppSettings();
    const timeoutMs = settings.inspectTimeoutSeconds * 1000;

    try {
      const result = await adapter.inspect(safeUrl.toString(), { timeoutMs });
      return NextResponse.json(result);
    } catch (err: unknown) {
      if (err instanceof SecurityError) {
        return NextResponse.json(
          { code: err.code, message: err.message, retryable: false, requestId },
          { status: 403 }
        );
      }
      const message = err instanceof Error ? err.message : 'Inspection failed';
      return NextResponse.json(
        { code: 'SOURCE_UNAVAILABLE', message, retryable: false, requestId },
        { status: 422 }
      );
    }
  } catch (err: unknown) {
    // Top-level catch — should never reach here but protects against 500
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[inspect] Unhandled error:', message);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message, retryable: false, requestId },
      { status: 500 }
    );
  }
}
