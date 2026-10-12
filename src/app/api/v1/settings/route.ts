import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings, updateAppSettings } from '@/lib/db';
import { DEFAULT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestId = `settings_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ ...settings, requestId }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load settings';
    console.error(`[settings GET][${requestId}] DB query error, using defaults:`, message);

    // Return DEFAULT_CONFIG so the frontend never crashes on missing/failed DB
    return NextResponse.json({ ...DEFAULT_CONFIG, requestId, warning: 'Defaults used due to DB unavailability' }, { status: 200 });
  }
}

export async function PUT(req: NextRequest) {
  const requestId = `settings_put_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { code: 'INVALID_REQUEST_DATA', message: 'Expected an object of settings.', retryable: false, requestId },
        { status: 400 }
      );
    }

    const updated = await updateAppSettings(body as Record<string, unknown>);
    return NextResponse.json({ ...updated, requestId }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update settings';
    console.error(`[settings PUT][${requestId}] Error:`, message);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update settings.', retryable: false, requestId },
      { status: 500 }
    );
  }
}
