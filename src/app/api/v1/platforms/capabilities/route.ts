import { NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/providers/registry';

export async function GET() {
  const capabilities = providerRegistry.getAllCapabilities();
  return NextResponse.json({
    platforms: capabilities,
    totalCount: capabilities.length,
  });
}
