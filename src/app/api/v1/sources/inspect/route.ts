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
    const body = await req.json();
    const parsed = inspectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'INVALID_URL',
          message: parsed.error.errors[0]?.message || 'Invalid request body',
          retryable: false,
          requestId,
        },
        { status: 400 }
      );
    }

    const rawUrl = parsed.data.url.trim();
    const safeUrl = await validateSafeUrl(rawUrl);

    const adapter = providerRegistry.findAdapterForUrl(safeUrl);
    if (!adapter) {
      return NextResponse.json(
        {
          code: 'PROVIDER_UNSUPPORTED',
          message: `The hostname '${safeUrl.hostname}' is not supported or the provider is currently disabled.`,
          retryable: false,
          requestId,
        },
        { status: 422 }
      );
    }

    const settings = getAppSettings();
    const timeoutMs = settings.inspectTimeoutSeconds * 1000;

    const result = await adapter.inspect(safeUrl.toString(), { timeoutMs });
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof SecurityError) {
      return NextResponse.json(
        {
          code: err.code,
          message: err.message,
          retryable: false,
          requestId,
        },
        { status: 403 }
      );
    }

    const message = err instanceof Error ? err.message : 'Internal inspection error';
    return NextResponse.json(
      {
        code: 'SOURCE_UNAVAILABLE',
        message,
        retryable: true,
        requestId,
      },
      { status: 502 }
    );
  }
}
