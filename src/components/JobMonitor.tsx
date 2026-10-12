'use client';

import React from 'react';
import { DownloadJob } from '@/lib/types';
import {
  Download,
  AlertOctagon,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileCheck,
  Ban,
  Calendar,
} from 'lucide-react';

interface JobMonitorProps {
  job: DownloadJob;
  onCancelJob: (jobId: string) => Promise<void>;
  onClearActiveJob: () => void;
}

export const JobMonitor: React.FC<JobMonitorProps> = ({
  job,
  onCancelJob,
  onClearActiveJob,
}) => {
  const getStatusBadge = () => {
    switch (job.status) {
      case 'completed':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={13} /> Completed
          </span>
        );
      case 'preparing':
        return (
          <span className="badge badge-info">
            <Loader2 size={13} className="animate-spin" /> Preparing ({Math.round(job.progressPercent)}%)
          </span>
        );
      case 'queued':
        return (
          <span className="badge badge-warning">
            <Clock size={13} /> Queued
          </span>
        );
      case 'failed':
        return (
          <span className="badge badge-danger">
            <AlertOctagon size={13} /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="badge badge-danger">
            <XCircle size={13} /> Cancelled
          </span>
        );
      default:
        return <span className="badge badge-info">{job.status}</span>;
    }
  };

  const getExpiryString = (expiresAt?: number): string => {
    if (!expiresAt) return '';
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / (60 * 1000));
    return `Auto-expires in ${mins} mins`;
  };

  const isCancellable = job.status === 'queued' || job.status === 'preparing';

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      marginBottom: '32px',
      border: job.status === 'completed' ? '1px solid rgba(16, 185, 129, 0.4)' : undefined,
      boxShadow: job.status === 'completed' ? 'var(--shadow-glow-emerald)' : undefined,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileCheck size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
            Active Job Status: <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{job.id}</span>
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {getStatusBadge()}
          {isCancellable && (
            <button
              onClick={() => onCancelJob(job.id)}
              className="btn btn-danger"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <Ban size={13} /> Cancel Job
            </button>
          )}
          {!isCancellable && (
            <button
              onClick={onClearActiveJob}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: '0.98rem', fontWeight: 600, marginBottom: '14px' }}>
        {job.safeTitle}
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '16px',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.max(2, job.progressPercent)}%`,
          background: job.status === 'failed' ? 'var(--status-danger)' : 'var(--accent-gradient)',
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>

      {/* Failure Info */}
      {job.status === 'failed' && (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: '#fca5a5',
          marginBottom: '16px',
        }}>
          <strong>Error ({job.errorCode || 'FAILED'}):</strong> {job.errorMessage || 'An error occurred during retrieval.'}
        </div>
      )}

      {/* Completed State: Download CTA */}
      {job.status === 'completed' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px',
          background: 'rgba(16, 185, 129, 0.06)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}>
          <div>
            <div style={{ fontWeight: 600, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> File prepared and verified locally
            </div>
            {job.expiresAt && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} /> {getExpiryString(job.expiresAt)}
              </div>
            )}
          </div>

          <a
            href={`/api/v1/download-jobs/${job.id}/file`}
            download
            className="btn btn-primary"
            style={{ padding: '10px 22px', fontSize: '0.92rem' }}
          >
            <Download size={16} />
            <span>Download Saved File</span>
          </a>
        </div>
      )}
    </div>
  );
};
