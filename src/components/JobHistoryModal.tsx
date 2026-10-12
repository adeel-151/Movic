'use client';

import React from 'react';
import { DownloadJob } from '@/lib/types';
import { X, Trash2, Download, Clock, CheckCircle2, AlertOctagon, History } from 'lucide-react';

interface JobHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: DownloadJob[];
  onDeleteJob: (jobId: string) => Promise<void>;
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Job History</h3>
            <span className="badge badge-info">{jobs.length}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {jobs.length > 0 && (
              <button
                onClick={onClearAll}
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <Trash2 size={13} /> Clear All
              </button>
            )}
            <button onClick={onClose} className="btn-icon" aria-label="Close history modal">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* History List */}
        {jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.95rem' }}>No recent jobs found.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Completed downloads and inspections will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map((job) => {
              const isCompleted = job.status === 'completed';
              const isExpired = job.status === 'expired' || (job.expiresAt && Date.now() > job.expiresAt);

              return (
                <div
                  key={job.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {job.safeTitle}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                        {job.provider}
                      </span>

                      {isCompleted && !isExpired && (
                        <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                          <CheckCircle2 size={11} /> Ready
                        </span>
                      )}

                      {isExpired && (
                        <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                          <Clock size={11} /> Expired
                        </span>
                      )}

                      {job.status === 'failed' && (
                        <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>
                          <AlertOctagon size={11} /> Failed
                        </span>
                      )}

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isCompleted && !isExpired && (
                      <a
                        href={`/api/v1/download-jobs/${job.id}/file`}
                        download
                        className="btn-icon"
                        title="Download file"
                        style={{ color: 'var(--status-success)' }}
                      >
                        <Download size={17} />
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteJob(job.id)}
                      className="btn-icon"
                      title="Delete record"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
