import { ProviderAdapter, DownloadContext } from './types';
import { InspectionResult, MediaVariant, Artifact, ProviderCapability } from '../types';
import { validateSafeUrl, SecurityError } from '../security/ssrf';

export class YouTubeProvider implements ProviderAdapter {
  readonly providerKey = 'youtube';
  readonly name = 'YouTube';
  readonly supportedHostnames = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];

  identify(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return this.supportedHostnames.some(h => host === h || host.endsWith('.' + h));
  }

  async inspect(urlString: string, options: { timeoutMs: number }): Promise<InspectionResult> {
    const parsedUrl = await validateSafeUrl(urlString);

    // Extract video ID safely
    let videoId: string | null = null;
    if (parsedUrl.hostname.includes('youtu.be')) {
      videoId = parsedUrl.pathname.replace(/^\//, '').split('/')[0];
    } else if (parsedUrl.pathname.startsWith('/shorts/')) {
      videoId = parsedUrl.pathname.replace('/shorts/', '').split('/')[0];
    } else {
      videoId = parsedUrl.searchParams.get('v');
    }

    if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
      throw new Error('Invalid YouTube video link or missing video identifier.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const res = await fetch(oembedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'PersonalDownloader/1.0' },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('The YouTube video is private, removed, or not found.');
        }
        throw new Error(`YouTube metadata returned HTTP ${res.status}`);
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
        canDownload: false, // Per SRD Section 2.3 & 10.1: YouTube public links lack authorized media download endpoints
        requiresOfficialWorkflow: true,
        officialWorkflowUrl: 'https://support.google.com/youtube/answer/56100',
        guidanceMessage:
          'Metadata successfully verified. In accordance with YouTube terms and SRD Section 2.3, public YouTube URLs do not provide an authorized automated media download route. If this is your own video, download the master copy via YouTube Studio (Content > Video Details > Download).',
        metadata: {
          title: data.title || `YouTube Video (${videoId})`,
          author: data.author_name || 'YouTube Creator',
          platform: 'YouTube',
          sourceUrl: urlString,
          thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        },
        variants: [], // Per FR-006 & FR-023: No fabricated variants when no authorized download route exists
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof SecurityError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Failed to query YouTube oEmbed';
      throw new Error(`YouTube metadata inspection failed: ${message}`);
    }
  }

  async prepareDownload(_variant: MediaVariant, _context: DownloadContext): Promise<Artifact> {
    throw new Error(
      'DOWNLOAD_NOT_PERMITTED: Direct media retrieval is disabled for YouTube in accordance with SRD compliance boundaries. Please use the official YouTube Studio export mechanism.'
    );
  }

  getCapabilities(): ProviderCapability {
    return {
      providerKey: this.providerKey,
      name: this.name,
      enabled: true,
      metadataSupported: true,
      authorizedDownloadSupported: false, // Explicitly documented limitation
      supportedUrlPatterns: ['youtube.com/watch?v=*', 'youtu.be/*', 'youtube.com/shorts/*'],
      docsReviewedAt: '2026-10-12',
      notes: 'Complies with YouTube Data API policies and SRD R1/R2. Inspects official metadata via oEmbed; points content creators to YouTube Studio for authorized downloads.',
    };
  }

  mapError(error: unknown): { code: string; message: string; retryable: boolean } {
    const msg = error instanceof Error ? error.message : 'Unknown YouTube error';
    if (msg.includes('DOWNLOAD_NOT_PERMITTED')) {
      return { code: 'DOWNLOAD_NOT_PERMITTED', message: msg, retryable: false };
    }
    return { code: 'SOURCE_UNAVAILABLE', message: msg, retryable: true };
  }
}
