'use client';

import React from 'react';
import { DownloadJob } from '@/lib/types';
import {
  Download, CheckCircle2, AlertCircle, Clock,
  XCircle, Loader2, Ban,
} from 'lucide-react';

interface JobMonitorProps {
  job: DownloadJob;
  onCancelJob: (id: string) => Promise<void>;
  onClearActiveJob: () => void;
}

function timeLeft(expiresAt?: number) {
  if (!expiresAt) return '';
  const d = expiresAt - Date.now();
  if (d <= 0) return 'Expired';
  return `Expires in ${Math.floor(d / 60000)}m`;
}

function StatusBadge({ status, progress }: { status: string; progress: number }) {
  switch (status) {
    case 'completed':
      return (
        <span className="badge-green">
          <CheckCircle2 size={11} /> Complete
        </span>
      );
    case 'preparing':
      return (
        <span className="badge-zinc">
          <Loader2 size={11} className="animate-spin text-emerald-400" />
          <span>Downloading {Math.round(progress)}%</span>
        </span>
      );
    case 'queued':
      return (
        <span className="badge-zinc">
          <Clock size={11} /> Queued
        </span>
      );
    case 'failed':
      return (
        <span className="badge-red">
          <AlertCircle size={11} /> Failed
        </span>
      );
    case 'cancelled':
      return (
        <span className="badge-zinc">
          <XCircle size={11} /> Cancelled
        </span>
      );
    default:
      return <span className="badge-zinc">{status}</span>;
  }
}

export const JobMonitor: React.FC<JobMonitorProps> = ({
  job,
  onCancelJob,
  onClearActiveJob,
}) => {
  const isCancellable = job.status === 'queued' || job.status === 'preparing';
  const isComplete = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div className="card-minimal mb-8 overflow-hidden animate-slide-up">
      <div className="px-5 py-3 border-b border-white/[0.07] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-zinc-300">Active Task</span>
          <span className="text-[11px] text-zinc-500 font-mono">{job.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} progress={job.progressPercent} />
          {isCancellable ? (
            <button
              onClick={() => onCancelJob(job.id)}
              className="btn-danger"
              title="Cancel download"
            >
              <Ban size={11} /> Cancel
            </button>
          ) : (
            <button
              onClick={onClearActiveJob}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-zinc-200 truncate">{job.safeTitle}</p>
          <span className="text-xs font-mono text-zinc-400 shrink-0">
            {Math.round(job.progressPercent)}%
          </span>
        </div>

        {/* Minimal Progress Bar */}
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.max(2, job.progressPercent)}%`,
              backgroundColor: isFailed ? '#ef4444' : undefined,
            }}
          />
        </div>

        {/* Error Notice */}
        {isFailed && (
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/[0.05] text-xs text-red-300">
            <span className="font-semibold">{job.errorCode}:</span>{' '}
            {job.errorMessage ?? 'Download could not be completed.'}
          </div>
        )}

        {/* Completed state */}
        {isComplete && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" />
              Verified &amp; ready on localhost {job.expiresAt && `(${timeLeft(job.expiresAt)})`}
            </span>
            <a
              href={`/api/v1/download-jobs/${job.id}/file`}
              download
              className="btn-primary text-xs"
            >
              <Download size={13} />
              <span>Save to Computer</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
