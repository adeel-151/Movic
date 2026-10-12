import { ProviderAdapter, DownloadContext } from './types';
import { InspectionResult, MediaVariant, Artifact, ProviderCapability } from '../types';
import { validateSafeUrl, SecurityError } from '../security/ssrf';

export class TikTokProvider implements ProviderAdapter {
  readonly providerKey = 'tiktok';
  readonly name = 'TikTok';
  readonly supportedHostnames = ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vt.tiktok.com'];

  identify(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return this.supportedHostnames.some(h => host === h || host.endsWith('.' + h));
  }

  async inspect(urlString: string, options: { timeoutMs: number }): Promise<InspectionResult> {
    const parsedUrl = await validateSafeUrl(urlString);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(parsedUrl.toString())}`;
      const res = await fetch(oembedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'PersonalDownloader/1.0' },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          throw new Error('This TikTok video could not be loaded. The video may be private, expired, or deleted by its author.');
        }
        throw new Error(`TikTok server returned HTTP ${res.status}`);
      }

      const data = await res.json() as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };

      return {
        provider: this.providerKey,
        providerName: this.name,
        isSupported: true,
        canDownload: false,
        requiresOfficialWorkflow: true,
        officialWorkflowUrl: 'https://support.tiktok.com/en/account-and-privacy/account-privacy-settings/video-downloads',
        guidanceMessage:
          'Metadata retrieved. Per TikTok privacy guidelines (SRD [R3]), automated downloads cannot be performed unless permitted by the creator settings and requested via the native mobile app "Save Video" feature.',
        metadata: {
          title: data.title || 'TikTok Video',
          author: data.author_name || 'TikTok Creator',
          platform: 'TikTok',
          sourceUrl: urlString,
          thumbnailUrl: data.thumbnail_url,
        },
        variants: [],
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof SecurityError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Failed to query TikTok oEmbed';
      throw new Error(`TikTok metadata inspection failed: ${message}`);
    }
  }

  async prepareDownload(_variant: MediaVariant, _context: DownloadContext): Promise<Artifact> {
    throw new Error(
      'DOWNLOAD_NOT_PERMITTED: TikTok native download must be conducted through the official application in respect of creator download permissions.'
    );
  }

  getCapabilities(): ProviderCapability {
    return {
      providerKey: this.providerKey,
      name: this.name,
      enabled: true,
      metadataSupported: true,
      authorizedDownloadSupported: false,
      supportedUrlPatterns: ['tiktok.com/@*/video/*', 'vt.tiktok.com/*'],
      docsReviewedAt: '2026-10-12',
      notes: 'Inspects metadata via official TikTok oEmbed API. Download permissions respect creator privacy settings per SRD R3/R4.',
    };
  }

  mapError(error: unknown): { code: string; message: string; retryable: boolean } {
    const msg = error instanceof Error ? error.message : 'Unknown TikTok error';
    return { code: 'DOWNLOAD_NOT_PERMITTED', message: msg, retryable: false };
  }
}
