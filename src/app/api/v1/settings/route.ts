import { NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/db';

export async function GET() {
  try {
    const settings = getAppSettings();
    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load settings';
    console.error('[settings GET] error:', message);
    // Return defaults on failure so the UI does not break
    return NextResponse.json({
      appBindHost: '127.0.0.1',
      maxConcurrentJobs: 1,
      maxOutputBytes: 1073741824,
      inspectTimeoutSeconds: 20,
      jobTimeoutSeconds: 900,
      outputRetentionMinutes: 60,
      historyRetentionDays: 30,
      enabledProviders: ['direct', 'youtube', 'tiktok', 'vimeo'],
    });
  }
}

import { NextRequest } from 'next/server';
import { updateAppSettings } from '@/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = updateAppSettings(body);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update settings';
    console.error('[settings PUT] error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
