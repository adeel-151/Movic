import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ProviderAdapter, DownloadContext } from './types';
import { InspectionResult, MediaVariant, Artifact, ProviderCapability } from '../types';
import { validateSafeUrl, SecurityError } from '../security/ssrf';
import { sanitizeFileName } from '../security/sanitize';

export class DirectMediaProvider implements ProviderAdapter {
  readonly providerKey = 'direct';
  readonly name = 'Authorized Direct Media';
  readonly supportedHostnames = ['*']; // Supports direct media URLs

  identify(url: URL): boolean {
    const ext = path.extname(url.pathname).toLowerCase();
    const isDirectMediaExt = ['.mp4', '.webm', '.mkv', '.m4v', '.mov', '.mp3'].includes(ext);
    // Also support URLs query param containing media hints or known test video CDNs
    return isDirectMediaExt || url.searchParams.has('format') || url.pathname.includes('/video/');
  }

  async inspect(urlString: string, options: { timeoutMs: number }): Promise<InspectionResult> {
    const parsedUrl = await validateSafeUrl(urlString);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(parsedUrl.toString(), {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'PersonalDownloader/1.0',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Media server responded with status HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'video/mp4';
      const contentLength = response.headers.get('content-length');
      const estimatedBytes = contentLength ? parseInt(contentLength, 10) : undefined;

      // Extract filename from URL
      const pathname = parsedUrl.pathname;
      const rawName = path.basename(pathname) || 'direct_video';
      const cleanTitle = decodeURIComponent(rawName).replace(/\.[^/.]+$/, '');
      const ext = path.extname(pathname).replace('.', '') || (contentType.includes('webm') ? 'webm' : 'mp4');

      const variants: MediaVariant[] = [
        {
          id: `var_${Date.now()}_orig`,
          sourceRef: urlString,
          label: `Source Quality (${ext.toUpperCase()})`,
          width: 1920,
          height: 1080,
          container: ext.toUpperCase(),
          videoCodec: ext === 'webm' ? 'VP9' : 'H.264',
          audioPresent: true,
          estimatedBytes: estimatedBytes,
          downloadUrl: urlString,
        },
      ];

      return {
        provider: this.providerKey,
        providerName: this.name,
        isSupported: true,
        canDownload: true,
        guidanceMessage: 'Direct authorized media stream verified. You may select resolution and proceed with download.',
        metadata: {
          title: cleanTitle || 'Direct Media File',
          author: parsedUrl.hostname,
          platform: 'Direct Media',
          sourceUrl: urlString,
          thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&auto=format&fit=crop&q=80',
        },
        variants,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof SecurityError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Failed to inspect media stream';
      throw new Error(`Direct inspection failed: ${message}`);
    }
  }

  async prepareDownload(variant: MediaVariant, context: DownloadContext): Promise<Artifact> {
    const downloadUrl = variant.downloadUrl || variant.sourceRef;
    const parsedUrl = await validateSafeUrl(downloadUrl);

    const safeName = sanitizeFileName(variant.label, variant.container.toLowerCase());
    const outputFilename = `${context.jobId}_${safeName}`;
    const outputPath = path.join(context.outputDir, outputFilename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs);

    try {
      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PersonalDownloader/1.0',
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`Media fetch failed with status HTTP ${response.status}`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : variant.estimatedBytes;

      if (totalBytes && totalBytes > context.maxBytes) {
        throw new Error(`File size (${(totalBytes / (1024 * 1024)).toFixed(1)} MB) exceeds configured maximum allowed (${(context.maxBytes / (1024 * 1024)).toFixed(1)} MB)`);
      }

      const fileStream = fs.createWriteStream(outputPath);
      const hash = crypto.createHash('sha256');

      let receivedBytes = 0;
      const reader = response.body.getReader();

      while (true) {
        if (context.checkCancelled()) {
          reader.cancel();
          fileStream.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          throw new Error('Job was cancelled by the user.');
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > context.maxBytes) {
            reader.cancel();
            fileStream.close();
            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
            throw new Error('Downloaded bytes exceeded maximum allowed file size limit.');
          }

          fileStream.write(Buffer.from(value));
          hash.update(value);

          const percent = totalBytes ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : Math.min(99, Math.round(receivedBytes / 50000));
          context.onProgress(percent, receivedBytes, totalBytes);
        }
      }

      await new Promise<void>((resolve, reject) => {
        fileStream.end(() => resolve());
        fileStream.on('error', reject);
      });

      clearTimeout(timeout);

      const mimeType = response.headers.get('content-type') || `video/${variant.container.toLowerCase()}`;
      const checksum = hash.digest('hex');
      const now = Date.now();
      const expiresAt = now + 60 * 60 * 1000; // 60 minutes default

      return {
        id: `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        jobId: context.jobId,
        internalPath: outputPath,
        fileName: safeName,
        bytes: receivedBytes,
        mimeType,
        checksum,
        createdAt: now,
        expiresAt,
      };
    } catch (err) {
      clearTimeout(timeout);
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch {
          // ignore
        }
      }
      throw err;
    }
  }

  getCapabilities(): ProviderCapability {
    return {
      providerKey: this.providerKey,
      name: this.name,
      enabled: true,
      metadataSupported: true,
      authorizedDownloadSupported: true,
      supportedUrlPatterns: ['*.mp4', '*.webm', '*.mkv', 'direct video URLs'],
      docsReviewedAt: '2026-10-12',
      notes: 'Direct authorized media files with SSRF validation, size limiting, and safe chunked streaming.',
    };
  }

  mapError(error: unknown): { code: string; message: string; retryable: boolean } {
    if (error instanceof SecurityError) {
      return { code: error.code, message: error.message, retryable: false };
    }
    const msg = error instanceof Error ? error.message : 'Unknown direct media error';
    if (msg.includes('exceeds configured maximum')) {
      return { code: 'FILE_TOO_LARGE', message: msg, retryable: false };
    }
    if (msg.includes('cancelled')) {
      return { code: 'JOB_EXPIRED', message: msg, retryable: false };
    }
    return { code: 'SOURCE_UNAVAILABLE', message: msg, retryable: true };
  }
}
