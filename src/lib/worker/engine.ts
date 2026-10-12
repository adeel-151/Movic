import { MEDIA_DIR, ensureStorageDirs } from '../config';
import {
  getJob,
  getVariantsForJob,
  updateJobStatus,
  saveArtifact,
  cleanupExpiredArtifacts,
  getAppSettings,
  listJobs,
} from '../db';
import { providerRegistry } from '../providers/registry';
import { DownloadJob, ErrorCode, AppSettings } from '../types';

declare global {
  // eslint-disable-next-line no-var
  var __movic_worker: JobWorkerEngine | undefined;
}

class JobWorkerEngine {
  private activeJobs: Set<string> = new Set();
  private cancelledJobs: Set<string> = new Set();
  private isProcessing = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.recoverStaleJobs();
    this.startRetentionTimer();
  }

  private async recoverStaleJobs(): Promise<void> {
    try {
      const recentJobs = await listJobs(100);
      for (const job of recentJobs) {
        if (job.status === 'preparing' || job.status === 'inspecting') {
          await updateJobStatus(job.id, 'failed', {
            errorCode: 'INTERNAL_ERROR',
            errorMessage: 'Job interrupted due to application restart.',
          });
        }
      }
      await cleanupExpiredArtifacts();
    } catch {
      // ignore on startup before db/network initialized
    }
  }

  private startRetentionTimer(): void {
    // Only run interval timer in long-lived Node processes, skip if in serverless lambda
    if (process.env.VERCEL) return;

    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(async () => {
        try {
          await cleanupExpiredArtifacts();
        } catch {
          // ignore
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
    }
  }

  public async cancel(jobId: string): Promise<boolean> {
    this.cancelledJobs.add(jobId);
    const job = await getJob(jobId);
    if (job && (job.status === 'queued' || job.status === 'preparing' || job.status === 'inspecting')) {
      await updateJobStatus(jobId, 'cancelled', {
        errorMessage: 'Job was cancelled by the user.',
      });
      return true;
    }
    return false;
  }

  public isCancelled(jobId: string): boolean {
    return this.cancelledJobs.has(jobId);
  }

  public async triggerQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      const settings = await getAppSettings();
      const maxConcurrent = settings.maxConcurrentJobs || 1;

      while (this.activeJobs.size < maxConcurrent) {
        // Find next queued job
        const allJobs = await listJobs(50);
        const nextJob = allJobs.reverse().find((j) => j.status === 'queued');

        if (!nextJob) break;

        this.processJobAsync(nextJob, settings);
      }
    } catch (e: unknown) {
      console.warn('[worker] Queue trigger note:', e instanceof Error ? e.message : String(e));
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJobAsync(job: DownloadJob, settings: AppSettings): Promise<void> {
    this.activeJobs.add(job.id);
    await updateJobStatus(job.id, 'preparing', { progressPercent: 0 });

    try {
      if (this.isCancelled(job.id)) {
        await updateJobStatus(job.id, 'cancelled', { errorMessage: 'Cancelled prior to download start.' });
        return;
      }

      const variants = await getVariantsForJob(job.id);
      const selectedVariant = variants.find((v) => v.id === job.selectedVariantId) || variants[0];

      if (!selectedVariant) {
        await updateJobStatus(job.id, 'failed', {
          errorCode: 'VARIANT_UNAVAILABLE',
          errorMessage: 'Selected media variant was not found or is no longer available.',
        });
        return;
      }

      const adapter = providerRegistry.getAdapter(job.provider);
      if (!adapter) {
        await updateJobStatus(job.id, 'failed', {
          errorCode: 'PROVIDER_UNSUPPORTED',
          errorMessage: `Provider '${job.provider}' is not available or disabled.`,
        });
        return;
      }

      // Ensure storage directory exists before downloading
      ensureStorageDirs();

      const timeoutMs = (settings.jobTimeoutSeconds || 900) * 1000;
      const maxBytes = settings.maxOutputBytes || 1073741824;

      const artifact = await adapter.prepareDownload(selectedVariant, {
        jobId: job.id,
        outputDir: MEDIA_DIR,
        maxBytes,
        timeoutMs,
        onProgress: async (percent) => {
          await updateJobStatus(job.id, 'preparing', { progressPercent: percent });
        },
        checkCancelled: () => this.isCancelled(job.id),
      });

      // Calculate expiry timestamp based on configured retention
      const retentionMs = (settings.outputRetentionMinutes || 60) * 60 * 1000;
      const expiresAt = Date.now() + retentionMs;
      artifact.expiresAt = expiresAt;

      await saveArtifact(artifact);

      await updateJobStatus(job.id, 'completed', {
        progressPercent: 100,
        expiresAt,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown worker processing error';
      const isCancellation = this.isCancelled(job.id) || errorMsg.includes('cancelled');

      if (isCancellation) {
        await updateJobStatus(job.id, 'cancelled', { errorMessage: 'Job was cancelled.' });
      } else {
        const adapter = providerRegistry.getAdapter(job.provider);
        const mapped = adapter ? adapter.mapError(err) : { code: 'INTERNAL_ERROR', message: errorMsg, retryable: false };

        await updateJobStatus(job.id, 'failed', {
          errorCode: mapped.code as ErrorCode,
          errorMessage: mapped.message,
        });
      }
    } finally {
      this.activeJobs.delete(job.id);
      this.cancelledJobs.delete(job.id);
      // Process next in queue
      this.triggerQueue();
    }
  }
}

function getWorkerEngine(): JobWorkerEngine {
  if (!globalThis.__movic_worker) {
    globalThis.__movic_worker = new JobWorkerEngine();
  }
  return globalThis.__movic_worker;
}

export const workerEngine = getWorkerEngine();
