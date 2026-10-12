'use client';

import React from 'react';
import { ProviderCapability } from '@/lib/types';
import { X, Layers, CheckCircle2, XCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface CapabilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  capabilities: ProviderCapability[];
}

export const CapabilitiesModal: React.FC<CapabilitiesModalProps> = ({
  isOpen,
  onClose,
  capabilities,
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
            <Layers size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Provider Capability Registry</h3>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close capabilities modal">
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
          In accordance with SRD Sections 2.3 & 16, platforms are strictly mapped by their legal and official retrieval capabilities. No circumvention or unofficial scraping is allowed.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {capabilities.map((cap) => (
            <div
              key={cap.providerKey}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                  {cap.name}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className={`badge ${cap.metadataSupported ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem' }}>
                    Metadata: {cap.metadataSupported ? 'Supported' : 'Disabled'}
                  </span>
                  <span className={`badge ${cap.authorizedDownloadSupported ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                    Download: {cap.authorizedDownloadSupported ? 'Direct' : 'Official Workflow'}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {cap.notes}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                <span>Reviewed: {cap.docsReviewedAt}</span>
                <span className="font-mono">{cap.supportedUrlPatterns.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
