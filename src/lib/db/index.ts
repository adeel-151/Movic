import fs from 'fs';
import { DEFAULT_CONFIG } from '../config';
import { DownloadJob, MediaVariant, Artifact, JobStatus, ErrorCode, AppSettings } from '../types';
import { getMongoDb, verifyMongoConnectivity } from './mongodb';

// In-memory fallback caches across HMR / serverless cold starts when MongoDB is absent
declare global {
  // eslint-disable-next-line no-var
  var __movic_mem_jobs: Map<string, DownloadJob> | undefined;
  // eslint-disable-next-line no-var
  var __movic_mem_variants: Map<string, MediaVariant[]> | undefined;
  // eslint-disable-next-line no-var
  var __movic_mem_artifacts: Map<string, Artifact> | undefined;
  // eslint-disable-next-line no-var
  var __movic_mem_settings: AppSettings | undefined;
}

if (!globalThis.__movic_mem_jobs) globalThis.__movic_mem_jobs = new Map();
if (!globalThis.__movic_mem_variants) globalThis.__movic_mem_variants = new Map();
if (!globalThis.__movic_mem_artifacts) globalThis.__movic_mem_artifacts = new Map();
if (!globalThis.__movic_mem_settings) globalThis.__movic_mem_settings = { ...DEFAULT_CONFIG };

const memJobs = globalThis.__movic_mem_jobs;
const memVariants = globalThis.__movic_mem_variants;
const memArtifacts = globalThis.__movic_mem_artifacts;

/* ──────────────────────────────────────────────────────────────
   Job operations
   ────────────────────────────────────────────────────────────── */

export async function createJob(job: DownloadJob): Promise<void> {
  // Always update in-memory cache
  memJobs.set(job.id, { ...job });

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('download_jobs').updateOne(
        { id: job.id },
        { $set: { ...job } },
        { upsert: true }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MongoDB] Failed to persist job ${job.id}:`, msg);
    }
  }
}

export async function getJob(jobId: string): Promise<DownloadJob | null> {
  const db = await getMongoDb();
  if (db) {
    try {
      const doc = await db.collection('download_jobs').findOne({ id: jobId });
      if (doc) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...jobData } = doc;
        return jobData as unknown as DownloadJob;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MongoDB] Failed to fetch job ${jobId}:`, msg);
    }
  }

  return memJobs.get(jobId) || null;
}

export async function listJobs(limit: number = 50): Promise<DownloadJob[]> {
  const db = await getMongoDb();
  if (db) {
    try {
      const docs = await db
        .collection('download_jobs')
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return docs.map((doc) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...jobData } = doc;
        return jobData as unknown as DownloadJob;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MongoDB] Failed to list jobs:', msg);
    }
  }

  // Memory fallback
  return Array.from(memJobs.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  options?: {
    progressPercent?: number;
    errorCode?: ErrorCode;
    errorMessage?: string;
    expiresAt?: number;
  }
): Promise<void> {
  const now = Date.now();
  const existing = memJobs.get(jobId);
  if (existing) {
    existing.status = status;
    existing.updatedAt = now;
    if (options?.progressPercent !== undefined) existing.progressPercent = options.progressPercent;
    if (options?.errorCode !== undefined) existing.errorCode = options.errorCode;
    if (options?.errorMessage !== undefined) existing.errorMessage = options.errorMessage;
    if (options?.expiresAt !== undefined) existing.expiresAt = options.expiresAt;
    memJobs.set(jobId, existing);
  }

  const db = await getMongoDb();
  if (db) {
    try {
      const updateFields: Record<string, unknown> = { status, updatedAt: now };
      if (options?.progressPercent !== undefined) updateFields.progressPercent = options.progressPercent;
      if (options?.errorCode !== undefined) updateFields.errorCode = options.errorCode;
      if (options?.errorMessage !== undefined) updateFields.errorMessage = options.errorMessage;
      if (options?.expiresAt !== undefined) updateFields.expiresAt = options.expiresAt;

      await db.collection('download_jobs').updateOne(
        { id: jobId },
        { $set: updateFields }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MongoDB] Failed to update status for job ${jobId}:`, msg);
    }
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  // Unlink artifact file if locally stored
  const artifact = await getArtifactForJob(jobId);
  if (artifact && fs.existsSync(artifact.internalPath)) {
    try {
      fs.unlinkSync(artifact.internalPath);
    } catch {
      // ignore unlink error
    }
  }

  memJobs.delete(jobId);
  memVariants.delete(jobId);
  memArtifacts.delete(jobId);

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('download_jobs').deleteOne({ id: jobId });
      await db.collection('media_variants').deleteMany({ jobId });
      await db.collection('artifacts').deleteOne({ jobId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MongoDB] Failed to delete job ${jobId}:`, msg);
    }
  }
}

export async function clearAllJobs(): Promise<void> {
  for (const artifact of memArtifacts.values()) {
    if (fs.existsSync(artifact.internalPath)) {
      try {
        fs.unlinkSync(artifact.internalPath);
      } catch {
        // ignore
      }
    }
  }

  memJobs.clear();
  memVariants.clear();
  memArtifacts.clear();

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('download_jobs').deleteMany({});
      await db.collection('media_variants').deleteMany({});
      await db.collection('artifacts').deleteMany({});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MongoDB] Failed to clear all jobs:', msg);
    }
  }
}

/* ──────────────────────────────────────────────────────────────
   Variant operations
   ────────────────────────────────────────────────────────────── */

export async function saveVariants(jobId: string, variants: MediaVariant[]): Promise<void> {
  memVariants.set(jobId, [...variants]);

  const db = await getMongoDb();
  if (db && variants.length > 0) {
    try {
      const docs = variants.map((v) => ({ ...v, jobId }));
      await db.collection('media_variants').deleteMany({ jobId });
      await db.collection('media_variants').insertMany(docs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MongoDB] Failed to save variants for job ${jobId}:`, msg);
    }
  }
}

export async function getVariantsForJob(jobId: string): Promise<MediaVariant[]> {
  const db = await getMongoDb();
  if (db) {
    try {
      const docs = await db.collection('media_variants').find({ jobId }).toArray();
      if (docs.length > 0) {
        return docs.map((doc) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _id, ...v } = doc;
          return v as unknown as MediaVariant;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MongoDB] Failed to get variants for job ${jobId}:`, msg);
    }
  }

  return memVariants.get(jobId) || [];
}

/* ──────────────────────────────────────────────────────────────
   Artifact operations
   ────────────────────────────────────────────────────────────── */

export async function saveArtifact(artifact: Artifact): Promise<void> {
  memArtifacts.set(artifact.jobId, { ...artifact });

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('artifacts').updateOne(
        { jobId: artifact.jobId },
        { $set: { ...artifact } },
        { upsert: true }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MongoDB] Failed to save artifact for job ${artifact.jobId}:`, msg);
    }
  }
}

export async function getArtifactForJob(jobId: string): Promise<Artifact | null> {
  const db = await getMongoDb();
  if (db) {
    try {
      const doc = await db.collection('artifacts').findOne({ jobId });
      if (doc) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...art } = doc;
        return art as unknown as Artifact;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MongoDB] Failed to get artifact for job ${jobId}:`, msg);
    }
  }

  return memArtifacts.get(jobId) || null;
}

export async function cleanupExpiredArtifacts(): Promise<number> {
  const now = Date.now();
  let count = 0;

  for (const [jobId, art] of memArtifacts.entries()) {
    if (art.expiresAt <= now) {
      if (fs.existsSync(art.internalPath)) {
        try {
          fs.unlinkSync(art.internalPath);
        } catch {
          // ignore
        }
      }
      memArtifacts.delete(jobId);
      updateJobStatus(jobId, 'expired');
      count++;
    }
  }

  const db = await getMongoDb();
  if (db) {
    try {
      const expiredDocs = await db.collection('artifacts').find({ expiresAt: { $lte: now } }).toArray();
      for (const doc of expiredDocs) {
        const jobId = String(doc.jobId);
        await updateJobStatus(jobId, 'expired');
      }
      const res = await db.collection('artifacts').deleteMany({ expiresAt: { $lte: now } });
      count += res.deletedCount || 0;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MongoDB] Failed cleanup of expired artifacts:', msg);
    }
  }

  return count;
}

/* ──────────────────────────────────────────────────────────────
   Settings operations
   ────────────────────────────────────────────────────────────── */

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getMongoDb();
  if (db) {
    try {
      const doc = await db.collection('app_settings').findOne({ _id: 'global_settings' as unknown as import('mongodb').ObjectId });
      if (doc) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...settingsData } = doc;
        return {
          ...DEFAULT_CONFIG,
          ...settingsData,
        } as AppSettings;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[MongoDB] Could not load settings from MongoDB, returning defaults:', msg);
    }
  }

  // Return stored in-memory or standard DEFAULT_CONFIG
  return globalThis.__movic_mem_settings || { ...DEFAULT_CONFIG };
}

export function getCachedAppSettings(): AppSettings {
  return globalThis.__movic_mem_settings || { ...DEFAULT_CONFIG };
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const merged: AppSettings = { ...current, ...settings };
  globalThis.__movic_mem_settings = merged;

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('app_settings').updateOne(
        { _id: 'global_settings' as unknown as import('mongodb').ObjectId },
        { $set: { ...merged } },
        { upsert: true }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MongoDB] Failed to update settings in MongoDB:', msg);
    }
  }

  return merged;
}

export { verifyMongoConnectivity };
