'use client';

import React, { useState } from 'react';
import { InspectionResult, MediaVariant } from '@/lib/types';
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Download,
  ShieldAlert,
  Film,
  Music,
  Check,
  User,
  Clock,
} from 'lucide-react';

interface InspectionCardProps {
  result: InspectionResult;
  onStartJob: (selectedVariantId: string, rightsConfirmed: boolean) => Promise<void>;
  isStartingJob: boolean;
}

export const InspectionCard: React.FC<InspectionCardProps> = ({
  result,
  onStartJob,
  isStartingJob,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    result.variants.length > 0 ? result.variants[0].id : ''
  );
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return 'Dynamic stream';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleStart = () => {
    if (selectedVariantId && rightsConfirmed && !isStartingJob) {
      onStartJob(selectedVariantId, rightsConfirmed);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
      {/* Top Banner / Platform */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-info">{result.providerName}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Source Inspection Complete
          </span>
        </div>

        {result.canDownload ? (
          <span className="badge badge-success">
            <CheckCircle2 size={13} /> Authorized Retrieval Ready
          </span>
        ) : (
          <span className="badge badge-warning">
            <AlertTriangle size={13} /> Official Platform Workflow Required
          </span>
        )}
      </div>

      {/* Main Metadata Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: result.metadata.thumbnailUrl ? '280px 1fr' : '1fr',
        gap: '24px',
        marginBottom: '24px',
      }}>
        {result.metadata.thumbnailUrl && (
          <div style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            aspectRatio: '16/9',
            backgroundColor: '#1e293b',
            position: 'relative',
            border: '1px solid var(--border-subtle)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.metadata.thumbnailUrl}
              alt={result.metadata.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.3 }}>
            {result.metadata.title}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {result.metadata.author && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} color="var(--accent-primary)" />
                {result.metadata.author}
              </span>
            )}
            {result.metadata.durationSeconds && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color="var(--status-info)" />
                {formatDuration(result.metadata.durationSeconds)}
              </span>
            )}
          </div>

          {result.guidanceMessage && (
            <div style={{
              marginTop: '16px',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: result.canDownload ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${result.canDownload ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
              fontSize: '0.85rem',
              lineHeight: 1.5,
              color: result.canDownload ? '#a7f3d0' : '#fde68a',
            }}>
              {result.guidanceMessage}
            </div>
          )}

          {result.requiresOfficialWorkflow && result.officialWorkflowUrl && (
            <div style={{ marginTop: '12px' }}>
              <a
                href={result.officialWorkflowUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '8px 14px' }}
              >
                <span>Open Official Platform Documentation</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Available Variants Selection (if download is supported) */}
      {result.canDownload && result.variants.length > 0 && (
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={18} color="var(--accent-primary)" /> Select Media Variant
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {result.variants.map((v) => {
              const isSelected = selectedVariantId === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id)}
                  style={{
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '4px' }}>
                      {v.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                      <span>{v.container}</span>
                      <span>·</span>
                      <span>{formatBytes(v.estimatedBytes)}</span>
                      {v.audioPresent && (
                        <>
                          <span>·</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Music size={11} /> Audio
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--text-dim)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? 'var(--accent-primary)' : 'transparent',
                  }}>
                    {isSelected && <Check size={12} color="#fff" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mandatory Rights Confirmation Gate (FR-008, AC-06) */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
                style={{
                  marginTop: '3px',
                  width: '18px',
                  height: '18px',
                  accentColor: 'var(--accent-primary)',
                  cursor: 'pointer',
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.88rem', color: '#fca5a5' }}>
                  <ShieldAlert size={16} /> Legal Rights & Permission Acknowledgement (Required)
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                  I confirm that I own this content or have explicit legal rights and permission to download and store this media file locally for personal use. I understand that this system does not circumvent access controls, paywalls, or platform terms.
                </p>
              </div>
            </label>
          </div>

          {/* Action Trigger */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleStart}
              disabled={!selectedVariantId || !rightsConfirmed || isStartingJob}
              className="btn btn-primary"
              style={{ padding: '14px 28px', fontSize: '0.98rem' }}
            >
              <Download size={18} />
              <span>{isStartingJob ? 'Creating Job...' : 'Start Download Job'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
