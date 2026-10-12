'use client';

import React from 'react';
import { DownloadJob } from '@/lib/types';
import {
  Download, AlertOctagon, Clock, CheckCircle2,
  XCircle, Loader2, FileCheck, Ban, Calendar,
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
  return `Expires in ${Math.floor(d / 60000)} min`;
}

function StatusBadge({ status, progress }: { status: string; progress: number }) {
  switch (status) {
    case 'completed': return <span className="badge-green"><CheckCircle2 size={12} /> Completed</span>;
    case 'preparing': return <span className="badge-blue"><Loader2 size={12} className="animate-spin" /> Downloading {Math.round(progress)}%</span>;
    case 'queued':    return <span className="badge-amber"><Clock size={12} /> Queued</span>;
    case 'failed':    return <span className="badge-red"><AlertOctagon size={12} /> Failed</span>;
    case 'cancelled': return <span className="badge-red"><XCircle size={12} /> Cancelled</span>;
    default:          return <span className="badge-blue">{status}</span>;
  }
}

export const JobMonitor: React.FC<JobMonitorProps> = ({ job, onCancelJob, onClearActiveJob }) => {
  const isCancellable = job.status === 'queued' || job.status === 'preparing';
  const isComplete = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div className={`glass-dark shadow-card mb-8 overflow-hidden animate-slide-up ${
      isComplete ? 'border-emerald-500/40 shadow-glow-emerald' : ''
    }`}>
      <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <FileCheck size={18} className="text-brand-400" />
          <span className="font-semibold text-slate-200 text-sm">Active Job</span>
          <code className="text-xs text-slate-500 font-mono">{job.id}</code>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} progress={job.progressPercent} />
          {isCancellable ? (
            <button onClick={() => onCancelJob(job.id)} className="btn-danger text-xs px-3 py-1.5">
              <Ban size={13} /> Cancel
            </button>
          ) : (
            <button onClick={onClearActiveJob} className="btn-ghost text-xs px-3 py-1.5 text-slate-400">
              Dismiss
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        <p className="font-semibold text-slate-100">{job.safeTitle}</p>

        {/* Progress bar */}
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.max(2, job.progressPercent)}%`,
              background: isFailed ? '#ef4444' : undefined,
            }}
          />
        </div>

        {/* Error */}
        {isFailed && (
          <div className="p-4 rounded-xl border border-red-500/25 bg-red-500/8 text-sm text-red-300">
            <span className="font-semibold">Error ({job.errorCode}):</span>{' '}
            {job.errorMessage ?? 'An error occurred during download.'}
          </div>
        )}

        {/* Completed CTA */}
        {isComplete && (
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/6">
            <div>
              <p className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={15} /> File saved &amp; verified
              </p>
              {job.expiresAt && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Calendar size={12} /> {timeLeft(job.expiresAt)}
                </p>
              )}
            </div>
            <a
              href={`/api/v1/download-jobs/${job.id}/file`}
              download
              className="btn-brand text-sm"
            >
              <Download size={15} /> Save to Computer
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
