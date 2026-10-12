import { MediaVariant, InspectionResult, ProviderCapability, Artifact } from '../types';

export interface DownloadContext {
  jobId: string;
  outputDir: string;
  maxBytes: number;
  timeoutMs: number;
  onProgress: (percent: number, downloadedBytes: number, totalBytes?: number) => void;
  checkCancelled: () => boolean;
}

export interface ProviderAdapter {
  readonly providerKey: string;
  readonly name: string;
  readonly supportedHostnames: string[];
  
  identify(url: URL): boolean;
  inspect(url: string, options: { timeoutMs: number }): Promise<InspectionResult>;
  prepareDownload(variant: MediaVariant, context: DownloadContext): Promise<Artifact>;
  getCapabilities(): ProviderCapability;
  mapError(error: unknown): { code: string; message: string; retryable: boolean };
}
