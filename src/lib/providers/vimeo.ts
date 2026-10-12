import { ProviderAdapter, DownloadContext } from './types';
import { InspectionResult, MediaVariant, Artifact, ProviderCapability } from '../types';
import { validateSafeUrl, SecurityError } from '../security/ssrf';

export class VimeoProvider implements ProviderAdapter {
  readonly providerKey = 'vimeo';
  readonly name = 'Vimeo';
  readonly supportedHostnames = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];

  identify(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return this.supportedHostnames.some(h => host === h || host.endsWith('.' + h));
  }

  async inspect(urlString: string, options: { timeoutMs: number }): Promise<InspectionResult> {
    const parsedUrl = await validateSafeUrl(urlString);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(parsedUrl.toString())}`;
      const res = await fetch(oembedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'PersonalDownloader/1.0' },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Vimeo oEmbed returned HTTP ${res.status}`);
      }

      const data = await res.json() as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
        duration?: number;
      };

      return {
        provider: this.providerKey,
        providerName: this.name,
        isSupported: true,
        canDownload: false,
        requiresOfficialWorkflow: true,
        officialWorkflowUrl: 'https://help.vimeo.com/hc/en-us/articles/12426085581073-Downloading-videos',
        guidanceMessage:
          'Metadata verified. Vimeo downloadability depends on whether the creator enabled the "Download" option on their video settings. If enabled by the creator, use Vimeo’s official Download button on the video page.',
        metadata: {
          title: data.title || 'Vimeo Video',
          author: data.author_name || 'Vimeo Creator',
          platform: 'Vimeo',
          sourceUrl: urlString,
          thumbnailUrl: data.thumbnail_url,
          durationSeconds: data.duration,
        },
        variants: [],
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof SecurityError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Failed to query Vimeo oEmbed';
      throw new Error(`Vimeo metadata inspection failed: ${message}`);
    }
  }

  async prepareDownload(_variant: MediaVariant, _context: DownloadContext): Promise<Artifact> {
    throw new Error(
      'DOWNLOAD_NOT_PERMITTED: Vimeo videos without creator-provided direct download links must be downloaded via the official Vimeo page download button.'
    );
  }

  getCapabilities(): ProviderCapability {
    return {
      providerKey: this.providerKey,
      name: this.name,
      enabled: true,
      metadataSupported: true,
      authorizedDownloadSupported: false,
      supportedUrlPatterns: ['vimeo.com/*', 'player.vimeo.com/video/*'],
      docsReviewedAt: '2026-10-12',
      notes: 'Inspects metadata via official Vimeo oEmbed. Direct downloads require creator-enabled download permissions.',
    };
  }

  mapError(error: unknown): { code: string; message: string; retryable: boolean } {
    const msg = error instanceof Error ? error.message : 'Unknown Vimeo error';
    return { code: 'DOWNLOAD_NOT_PERMITTED', message: msg, retryable: false };
  }
}
