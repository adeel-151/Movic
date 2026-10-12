import { ProviderAdapter } from './types';
import { DirectMediaProvider } from './direct';
import { YouTubeProvider } from './youtube';
import { TikTokProvider } from './tiktok';
import { VimeoProvider } from './vimeo';
import { ProviderCapability } from '../types';
import { getCachedAppSettings } from '../db';

class ProviderRegistry {
  private adapters: Map<string, ProviderAdapter> = new Map();

  constructor() {
    this.register(new YouTubeProvider());
    this.register(new TikTokProvider());
    this.register(new VimeoProvider());
    this.register(new DirectMediaProvider()); // direct media matches specific file patterns
  }

  public register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.providerKey, adapter);
  }

  public getAdapter(key: string): ProviderAdapter | undefined {
    return this.adapters.get(key);
  }

  public findAdapterForUrl(url: URL, customEnabledProviders?: string[]): ProviderAdapter | null {
    const settings = getCachedAppSettings();
    const enabledProviders = customEnabledProviders || settings.enabledProviders || [];
    const enabledSet = new Set(enabledProviders);

    // First check domain-specific adapters
    for (const adapter of this.adapters.values()) {
      if (adapter.providerKey !== 'direct' && enabledSet.has(adapter.providerKey) && adapter.identify(url)) {
        return adapter;
      }
    }

    // Fall back to direct media adapter if enabled
    const direct = this.adapters.get('direct');
    if (direct && enabledSet.has('direct') && direct.identify(url)) {
      return direct;
    }

    return null;
  }

  public getAllCapabilities(customEnabledProviders?: string[]): ProviderCapability[] {
    const settings = getCachedAppSettings();
    const enabledProviders = customEnabledProviders || settings.enabledProviders || [];
    const enabledSet = new Set(enabledProviders);

    const result: ProviderCapability[] = [];
    for (const adapter of this.adapters.values()) {
      const cap = adapter.getCapabilities();
      cap.enabled = enabledSet.has(adapter.providerKey);
      result.push(cap);
    }
    return result;
  }
}

export const providerRegistry = new ProviderRegistry();
