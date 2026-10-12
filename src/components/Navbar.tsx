'use client';

import React from 'react';
import { ShieldCheck, History, Sliders, Layers, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenHistory: () => void;
  onOpenCapabilities: () => void;
  onOpenSettings: () => void;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHistory,
  onOpenCapabilities,
  onOpenSettings,
  historyCount,
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '16px 0',
    }}>
      <div className="app-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                MOVIC
              </span>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                SRD v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Personal Social Video Downloader
            </p>
          </div>
        </div>

        {/* Security / Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-success)',
            boxShadow: '0 0 8px var(--status-success)',
          }} />
          <ShieldCheck size={14} color="var(--status-success)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--status-success)' }}>
            SSRF Guard Active · Localhost Only
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenCapabilities}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            title="View Provider Capabilities"
          >
            <Layers size={16} />
            <span>Connectors</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', position: 'relative' }}
            title="Download History"
          >
            <History size={16} />
            <span>History</span>
            {historyCount > 0 && (
              <span style={{
                background: 'var(--accent-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-full)',
                padding: '1px 7px',
                fontSize: '0.7rem',
                fontWeight: 700,
                marginLeft: '4px',
              }}>
                {historyCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="btn btn-icon"
            title="System Settings"
            aria-label="Settings"
          >
            <Sliders size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
