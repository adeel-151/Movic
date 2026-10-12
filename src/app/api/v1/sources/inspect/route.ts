import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSafeUrl, SecurityError } from '@/lib/security/ssrf';
import { providerRegistry } from '@/lib/providers/registry';
import { getAppSettings } from '@/lib/db';
import { DEFAULT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

const inspectSchema = z.object({
  url: z.string().min(1, 'URL cannot be empty'),
});

export async function POST(req: NextRequest) {
  const requestId = `insp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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

    const parsed = inspectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'INVALID_URL', message: parsed.error.errors[0]?.message ?? 'Invalid request body', retryable: false, requestId },
        { status: 400 }
      );
    }

    const rawUrl = parsed.data.url.trim();

    // 1. SSRF and Protocol Security Validation
    let safeUrl: URL;
    try {
      safeUrl = await validateSafeUrl(rawUrl);
    } catch (err: unknown) {
      if (err instanceof SecurityError) {
        console.warn(`[inspect POST][${requestId}] SSRF blocked: ${err.code} - ${err.message}`);
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

    // 2. Provider Adapter Resolution
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

    // 3. Obtain timeout settings safely
    let timeoutMs = DEFAULT_CONFIG.inspectTimeoutSeconds * 1000;
    try {
      const settings = await getAppSettings();
      if (settings?.inspectTimeoutSeconds) {
        timeoutMs = settings.inspectTimeoutSeconds * 1000;
      }
    } catch {
      // Use fallback default timeout
    }

    // 4. Execute inspection
    try {
      const result = await adapter.inspect(safeUrl.toString(), { timeoutMs });
      return NextResponse.json({ ...result, requestId }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof SecurityError) {
        return NextResponse.json(
          { code: err.code, message: err.message, retryable: false, requestId },
          { status: 403 }
        );
      }
      const message = err instanceof Error ? err.message : 'Inspection failed';
      console.warn(`[inspect POST][${requestId}] Source inspection failure for ${safeUrl.hostname}:`, message);
      return NextResponse.json(
        { code: 'SOURCE_UNAVAILABLE', message, retryable: false, requestId },
        { status: 422 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error(`[inspect POST][${requestId}] Unhandled exception:`, message);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An unexpected internal error occurred during source inspection.', retryable: false, requestId },
      { status: 500 }
    );
  }
}
