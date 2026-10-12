import path from 'path';
import fs from 'fs';
import os from 'os';
import { AppSettings } from './types';

// In serverless environments (e.g., Vercel), /var/task is read-only.
// We use os.tmpdir() to avoid EROFS (Read-only file system) crashes.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BASE_DIR = isServerless ? path.join(os.tmpdir(), 'movic') : process.cwd();

export const STORAGE_DIR = isServerless
  ? path.join(os.tmpdir(), 'movic', '.storage')
  : path.join(BASE_DIR, '.storage');

export const MEDIA_DIR = path.join(STORAGE_DIR, 'media_artifacts');
export const DB_PATH = path.join(STORAGE_DIR, 'downloader.db');

// Lazy, safe initialization function without top-level module crash
export function ensureStorageDirs(): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }
  } catch (err: unknown) {
    // Non-fatal warning — serverless operations should not crash on disk prep
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[config] Storage directory setup note:', msg);
  }
}

export const DEFAULT_CONFIG: AppSettings = {
  appBindHost: process.env.APP_BIND_HOST || '127.0.0.1',
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '1', 10),
  maxOutputBytes: parseInt(process.env.MAX_OUTPUT_BYTES || '1073741824', 10), // 1 GB default
  inspectTimeoutSeconds: parseInt(process.env.INSPECT_TIMEOUT_SECONDS || '20', 10),
  jobTimeoutSeconds: parseInt(process.env.JOB_TIMEOUT_SECONDS || '900', 10), // 15 mins
  outputRetentionMinutes: parseInt(process.env.OUTPUT_RETENTION_MINUTES || '60', 10),
  historyRetentionDays: parseInt(process.env.HISTORY_RETENTION_DAYS || '30', 10),
  enabledProviders: ['direct', 'youtube', 'tiktok', 'vimeo'],
};
