import { NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/providers/registry';

export async function GET() {
  try {
    const capabilities = providerRegistry.getAllCapabilities();
    return NextResponse.json({ platforms: capabilities, totalCount: capabilities.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load capabilities';
    console.error('[capabilities GET] error:', message);
    return NextResponse.json({ platforms: [], totalCount: 0 });
  }
}
