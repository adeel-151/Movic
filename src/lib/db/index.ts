import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import { DB_PATH, DEFAULT_CONFIG } from '../config';
import { DownloadJob, MediaVariant, Artifact, JobStatus, ErrorCode, AppSettings } from '../types';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS download_jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      provider TEXT NOT NULL,
      normalized_source_fingerprint TEXT NOT NULL,
      source_url TEXT NOT NULL,
      safe_title TEXT NOT NULL,
      selected_variant_id TEXT NOT NULL,
      progress_percent REAL NOT NULL DEFAULT 0,
      error_code TEXT,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS media_variants (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      label TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      container TEXT NOT NULL,
      video_codec TEXT,
      audio_present INTEGER NOT NULL,
      estimated_bytes INTEGER,
      download_url TEXT
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL UNIQUE,
      internal_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      checksum TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_events (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      occurred_at INTEGER NOT NULL,
      safe_details TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// Job operations
export function createJob(job: DownloadJob): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO download_jobs (
      id, status, provider, normalized_source_fingerprint, source_url, safe_title,
      selected_variant_id, progress_percent, error_code, error_message,
      created_at, updated_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    job.id,
    job.status,
    job.provider,
    job.normalizedSourceFingerprint,
    job.sourceUrl,
    job.safeTitle,
    job.selectedVariantId,
    job.progressPercent,
    job.errorCode ?? null,
    job.errorMessage ?? null,
    job.createdAt,
    job.updatedAt,
    job.expiresAt ?? null
  );
}

export function getJob(jobId: string): DownloadJob | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM download_jobs WHERE id = ?`);
  const row = stmt.get(jobId) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: String(row.id),
    status: row.status as JobStatus,
    provider: String(row.provider),
    normalizedSourceFingerprint: String(row.normalized_source_fingerprint),
    sourceUrl: String(row.source_url),
    safeTitle: String(row.safe_title),
    selectedVariantId: String(row.selected_variant_id),
    progressPercent: Number(row.progress_percent),
    errorCode: (row.error_code as ErrorCode) || undefined,
    errorMessage: (row.error_message as string) || undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    expiresAt: row.expires_at ? Number(row.expires_at) : undefined,
  };
}

export function listJobs(limit: number = 50): DownloadJob[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM download_jobs ORDER BY created_at DESC LIMIT ?`);
  const rows = stmt.all(limit) as Record<string, unknown>[];

  return rows.map(row => ({
    id: String(row.id),
    status: row.status as JobStatus,
    provider: String(row.provider),
    normalizedSourceFingerprint: String(row.normalized_source_fingerprint),
    sourceUrl: String(row.source_url),
    safeTitle: String(row.safe_title),
    selectedVariantId: String(row.selected_variant_id),
    progressPercent: Number(row.progress_percent),
    errorCode: (row.error_code as ErrorCode) || undefined,
    errorMessage: (row.error_message as string) || undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    expiresAt: row.expires_at ? Number(row.expires_at) : undefined,
  }));
}

export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  options?: {
    progressPercent?: number;
    errorCode?: ErrorCode;
    errorMessage?: string;
    expiresAt?: number;
  }
): void {
  const db = getDb();
  const now = Date.now();
  let query = `UPDATE download_jobs SET status = ?, updated_at = ?`;
  const params: (string | number | null)[] = [status, now];

  if (options?.progressPercent !== undefined) {
    query += `, progress_percent = ?`;
    params.push(options.progressPercent);
  }
  if (options?.errorCode !== undefined) {
    query += `, error_code = ?`;
    params.push(options.errorCode);
  }
  if (options?.errorMessage !== undefined) {
    query += `, error_message = ?`;
    params.push(options.errorMessage);
  }
  if (options?.expiresAt !== undefined) {
    query += `, expires_at = ?`;
    params.push(options.expiresAt);
  }

  query += ` WHERE id = ?`;
  params.push(jobId);

  const stmt = db.prepare(query);
  stmt.run(...params);
}

export function deleteJob(jobId: string): void {
  const db = getDb();
  // Get artifact if any and remove file
  const artifact = getArtifactForJob(jobId);
  if (artifact && fs.existsSync(artifact.internalPath)) {
    try {
      fs.unlinkSync(artifact.internalPath);
    } catch {
      // ignore unlink error
    }
  }

  db.prepare(`DELETE FROM artifacts WHERE job_id = ?`).run(jobId);
  db.prepare(`DELETE FROM media_variants WHERE job_id = ?`).run(jobId);
  db.prepare(`DELETE FROM job_events WHERE job_id = ?`).run(jobId);
  db.prepare(`DELETE FROM download_jobs WHERE id = ?`).run(jobId);
}

export function clearAllJobs(): void {
  const db = getDb();
  const artifacts = db.prepare(`SELECT internal_path FROM artifacts`).all() as Record<string, unknown>[];
  for (const art of artifacts) {
    const p = String(art.internal_path);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        // ignore
      }
    }
  }

  db.exec(`
    DELETE FROM artifacts;
    DELETE FROM media_variants;
    DELETE FROM job_events;
    DELETE FROM download_jobs;
  `);
}

// Variant operations
export function saveVariants(jobId: string, variants: MediaVariant[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO media_variants (
      id, job_id, source_ref, label, width, height, container,
      video_codec, audio_present, estimated_bytes, download_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const v of variants) {
    stmt.run(
      v.id,
      jobId,
      v.sourceRef,
      v.label,
      v.width ?? null,
      v.height ?? null,
      v.container,
      v.videoCodec ?? null,
      v.audioPresent ? 1 : 0,
      v.estimatedBytes ?? null,
      v.downloadUrl ?? null
    );
  }
}

export function getVariantsForJob(jobId: string): MediaVariant[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM media_variants WHERE job_id = ?`).all(jobId) as Record<string, unknown>[];
  return rows.map(r => ({
    id: String(r.id),
    jobId: String(r.job_id),
    sourceRef: String(r.source_ref),
    label: String(r.label),
    width: r.width ? Number(r.width) : undefined,
    height: r.height ? Number(r.height) : undefined,
    container: String(r.container),
    videoCodec: (r.video_codec as string) || undefined,
    audioPresent: Boolean(r.audio_present),
    estimatedBytes: r.estimated_bytes ? Number(r.estimated_bytes) : undefined,
    downloadUrl: (r.download_url as string) || undefined,
  }));
}

// Artifact operations
export function saveArtifact(artifact: Artifact): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO artifacts (
      id, job_id, internal_path, file_name, bytes, mime_type, checksum, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    artifact.id,
    artifact.jobId,
    artifact.internalPath,
    artifact.fileName,
    artifact.bytes,
    artifact.mimeType,
    artifact.checksum,
    artifact.createdAt,
    artifact.expiresAt
  );
}

export function getArtifactForJob(jobId: string): Artifact | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM artifacts WHERE job_id = ?`).get(jobId) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: String(row.id),
    jobId: String(row.job_id),
    internalPath: String(row.internal_path),
    fileName: String(row.file_name),
    bytes: Number(row.bytes),
    mimeType: String(row.mime_type),
    checksum: String(row.checksum),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  };
}

// Cleanup expired files
export function cleanupExpiredArtifacts(): number {
  const db = getDb();
  const now = Date.now();
  const expired = db.prepare(`SELECT * FROM artifacts WHERE expires_at <= ?`).all(now) as Record<string, unknown>[];

  let cleanedCount = 0;
  for (const art of expired) {
    const p = String(art.internal_path);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        // ignore
      }
    }
    const jobId = String(art.job_id);
    db.prepare(`DELETE FROM artifacts WHERE id = ?`).run(String(art.id));
    updateJobStatus(jobId, 'expired');
    cleanedCount++;
  }
  return cleanedCount;
}

// Settings operations
export function getAppSettings(): AppSettings {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM app_settings`).all() as Record<string, unknown>[];
  const settingsObj: Record<string, string> = {};
  for (const row of rows) {
    settingsObj[String(row.key)] = String(row.value);
  }

  return {
    appBindHost: settingsObj.appBindHost || DEFAULT_CONFIG.appBindHost,
    maxConcurrentJobs: settingsObj.maxConcurrentJobs ? parseInt(settingsObj.maxConcurrentJobs, 10) : DEFAULT_CONFIG.maxConcurrentJobs,
    maxOutputBytes: settingsObj.maxOutputBytes ? parseInt(settingsObj.maxOutputBytes, 10) : DEFAULT_CONFIG.maxOutputBytes,
    inspectTimeoutSeconds: settingsObj.inspectTimeoutSeconds ? parseInt(settingsObj.inspectTimeoutSeconds, 10) : DEFAULT_CONFIG.inspectTimeoutSeconds,
    jobTimeoutSeconds: settingsObj.jobTimeoutSeconds ? parseInt(settingsObj.jobTimeoutSeconds, 10) : DEFAULT_CONFIG.jobTimeoutSeconds,
    outputRetentionMinutes: settingsObj.outputRetentionMinutes ? parseInt(settingsObj.outputRetentionMinutes, 10) : DEFAULT_CONFIG.outputRetentionMinutes,
    historyRetentionDays: settingsObj.historyRetentionDays ? parseInt(settingsObj.historyRetentionDays, 10) : DEFAULT_CONFIG.historyRetentionDays,
    enabledProviders: settingsObj.enabledProviders ? JSON.parse(settingsObj.enabledProviders) : DEFAULT_CONFIG.enabledProviders,
  };
}

export function updateAppSettings(settings: Partial<AppSettings>): AppSettings {
  const db = getDb();
  const current = getAppSettings();
  const merged = { ...current, ...settings };

  const stmt = db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`);
  stmt.run('appBindHost', merged.appBindHost);
  stmt.run('maxConcurrentJobs', String(merged.maxConcurrentJobs));
  stmt.run('maxOutputBytes', String(merged.maxOutputBytes));
  stmt.run('inspectTimeoutSeconds', String(merged.inspectTimeoutSeconds));
  stmt.run('jobTimeoutSeconds', String(merged.jobTimeoutSeconds));
  stmt.run('outputRetentionMinutes', String(merged.outputRetentionMinutes));
  stmt.run('historyRetentionDays', String(merged.historyRetentionDays));
  stmt.run('enabledProviders', JSON.stringify(merged.enabledProviders));

  return merged;
}
