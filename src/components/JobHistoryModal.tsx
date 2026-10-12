'use client';

import React from 'react';
import { DownloadJob } from '@/lib/types';
import { X, Trash2, Download, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface JobHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: DownloadJob[];
  onDeleteJob: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const JobHistoryModal: React.FC<JobHistoryModalProps> = ({
  isOpen,
  onClose,
  jobs,
  onDeleteJob,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col bg-surface-900 border border-white/[0.08] rounded-2xl shadow-modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-zinc-100">Job History</h2>
            <span className="text-xs font-mono text-zinc-500">({jobs.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {jobs.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
          {jobs.length === 0 ? (
            <div className="py-14 text-center text-zinc-500">
              <p className="text-xs">No downloads recorded yet.</p>
            </div>
          ) : (
            jobs.map((job) => {
              const isReady = job.status === 'completed' && (!job.expiresAt || Date.now() < job.expiresAt);
              return (
                <div
                  key={job.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.05] bg-surface-850/40 hover:bg-surface-850 transition-colors"
                >
                  <div className="shrink-0">
                    {job.status === 'completed' && <CheckCircle2 size={14} className="text-emerald-400" />}
                    {job.status === 'failed' && <AlertCircle size={14} className="text-red-400" />}
                    {['queued', 'preparing'].includes(job.status) && <Clock size={14} className="text-amber-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">{job.safeTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                      <span className="capitalize">{job.provider}</span>
                      <span>·</span>
                      <span>{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isReady && (
                      <a
                        href={`/api/v1/download-jobs/${job.id}/file`}
                        download
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded transition-colors"
                        title="Download file"
                      >
                        <Download size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteJob(job.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
