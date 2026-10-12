'use client';

import React from 'react';
import { DownloadJob } from '@/lib/types';
import { X, Trash2, Download, Clock, CheckCircle2, AlertOctagon, History } from 'lucide-react';

interface JobHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: DownloadJob[];
  onDeleteJob: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const JobHistoryModal: React.FC<JobHistoryModalProps> = ({
  isOpen, onClose, jobs, onDeleteJob, onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
         onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[85vh] flex flex-col bg-surface-900 border border-white/8 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] animate-slide-up"
           onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <History size={18} className="text-brand-400" />
            <h2 className="font-bold text-slate-100">Job History</h2>
            <span className="badge-blue text-[10px]">{jobs.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {jobs.length > 0 && (
              <button onClick={onClearAll} className="btn-danger text-xs px-3 py-1.5">
                <Trash2 size={12} /> Clear All
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/6 transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {jobs.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-sm">No jobs yet.</p>
              <p className="text-xs mt-1">Completed downloads will appear here.</p>
            </div>
          ) : jobs.map((job) => {
            const isReady = job.status === 'completed' && (!job.expiresAt || Date.now() < job.expiresAt);
            return (
              <div key={job.id}
                   className="flex items-center gap-3 p-3.5 rounded-xl border border-white/6 bg-white/3 hover:bg-white/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{job.safeTitle}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="badge-purple text-[10px]">{job.provider}</span>
                    {isReady && <span className="badge-green text-[10px]"><CheckCircle2 size={9} /> Ready</span>}
                    {job.status === 'expired' && <span className="badge-amber text-[10px]"><Clock size={9} /> Expired</span>}
                    {job.status === 'failed' && <span className="badge-red text-[10px]"><AlertOctagon size={9} /> Failed</span>}
                    <span className="text-[11px] text-slate-600">{new Date(job.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isReady && (
                    <a href={`/api/v1/download-jobs/${job.id}/file`} download
                       className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Download">
                      <Download size={16} />
                    </a>
                  )}
                  <button onClick={() => onDeleteJob(job.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
