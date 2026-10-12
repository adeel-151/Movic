import { NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/providers/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestId = `cap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    // Pure platform registry check - static capabilities, no DB requirement
    const capabilities = providerRegistry.getAllCapabilities();

    return NextResponse.json(
      {
        platforms: capabilities,
        totalCount: capabilities.length,
        requestId,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load capabilities';
    console.error(`[capabilities GET][${requestId}] Unexpected error:`, message);

    // Fallback static list so UI is never left in a broken state
    return NextResponse.json(
      {
        platforms: [
          {
            providerKey: 'direct',
            name: 'Direct Media (MP4/WebM)',
            enabled: true,
            metadataSupported: true,
            authorizedDownloadSupported: true,
            supportedUrlPatterns: ['*://*/*.mp4', '*://*/*.webm'],
            notes: 'Direct streaming media with SSRF-validated hostname resolution.',
          },
          {
            providerKey: 'youtube',
            name: 'YouTube',
            enabled: true,
            metadataSupported: true,
            authorizedDownloadSupported: false,
            supportedUrlPatterns: ['youtube.com/watch?v=*', 'youtu.be/*'],
            notes: 'Metadata inspection supported via official oEmbed. Complies with YouTube Terms of Service.',
          },
        ],
        totalCount: 2,
        warning: 'Fallback static capabilities returned due to internal registry issue.',
        requestId,
      },
      { status: 200 }
    );
  }
}
