export type JobStatus =
  | 'queued'
  | 'inspecting'
  | 'preparing'
  | 'completed'
  | 'unsupported'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'deleted';

export type ErrorCode =
  | 'INVALID_URL'
  | 'PROVIDER_UNSUPPORTED'
  | 'DOWNLOAD_NOT_PERMITTED'
  | 'VARIANT_UNAVAILABLE'
  | 'SOURCE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'FILE_TOO_LARGE'
  | 'JOB_EXPIRED'
  | 'INTERNAL_ERROR'
  | 'SSRF_BLOCKED'
  | 'TIMEOUT';

export interface DownloadJob {
  id: string;
  status: JobStatus;
  provider: string;
  normalizedSourceFingerprint: string;
  sourceUrl: string;
  safeTitle: string;
  selectedVariantId: string;
  progressPercent: number;
  errorCode?: ErrorCode;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

export interface MediaVariant {
  id: string;
  jobId?: string;
  sourceRef: string;
  label: string;
  width?: number;
  height?: number;
  container: string;
  videoCodec?: string;
  audioPresent: boolean;
  estimatedBytes?: number;
  downloadUrl?: string; // internal to adapter, never exposed directly to browser
}

export interface Artifact {
  id: string;
  jobId: string;
  internalPath: string;
  fileName: string;
  bytes: number;
  mimeType: string;
  checksum: string;
  createdAt: number;
  expiresAt: number;
}

export interface JobEvent {
  id: string;
  jobId: string;
  eventType: string;
  occurredAt: number;
  safeDetails: string;
}

export interface ProviderCapability {
  providerKey: string;
  name: string;
  enabled: boolean;
  metadataSupported: boolean;
  authorizedDownloadSupported: boolean;
  supportedUrlPatterns: string[];
  docsReviewedAt: string;
  notes: string;
}

export interface InspectMetadata {
  title: string;
  author?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  platform: string;
  sourceUrl: string;
  description?: string;
}

export interface InspectionResult {
  provider: string;
  providerName: string;
  isSupported: boolean;
  canDownload: boolean;
  requiresOfficialWorkflow?: boolean;
  officialWorkflowUrl?: string;
  guidanceMessage?: string;
  metadata: InspectMetadata;
  variants: MediaVariant[];
}

export interface AppSettings {
  appBindHost: string;
  maxConcurrentJobs: number;
  maxOutputBytes: number;
  inspectTimeoutSeconds: number;
  jobTimeoutSeconds: number;
  outputRetentionMinutes: number;
  historyRetentionDays: number;
  enabledProviders: string[];
}

export interface ApiErrorResponse {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
}
