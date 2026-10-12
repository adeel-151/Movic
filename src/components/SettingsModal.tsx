'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/lib/types';
import { X, Sliders, Save, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onSaveSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [retention, setRetention] = useState(60);
  const [maxBytesMB, setMaxBytesMB] = useState(1024);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setRetention(settings.outputRetentionMinutes);
      setMaxBytesMB(Math.round(settings.maxOutputBytes / (1024 * 1024)));
    }
  }, [settings]);

  if (!isOpen || !settings) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        outputRetentionMinutes: retention,
        maxOutputBytes: maxBytesMB * 1024 * 1024,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

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
            <Sliders size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Application Settings</h3>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close settings modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Retention */}
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px' }}>
                Output File Retention (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={retention}
                onChange={(e) => setRetention(parseInt(e.target.value, 10) || 60)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-main)',
                  fontSize: '0.92rem',
                }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Temporary media artifacts will be automatically deleted after this time window.
              </span>
            </div>

            {/* Max Output Bytes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px' }}>
                Max Allowed File Size (MB)
              </label>
              <input
                type="number"
                min={10}
                max={5120}
                value={maxBytesMB}
                onChange={(e) => setMaxBytesMB(parseInt(e.target.value, 10) || 1024)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-main)',
                  fontSize: '0.92rem',
                }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Enforces resource control to prevent memory and disk exhaustion.
              </span>
            </div>

            {/* Readonly Architecture Params */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div><strong>Network Binding:</strong> {settings.appBindHost} (Localhost default)</div>
              <div><strong>Max Concurrent Jobs:</strong> {settings.maxConcurrentJobs} (Single-user safety)</div>
              <div><strong>Worker Execution Timeout:</strong> {settings.jobTimeoutSeconds}s</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {savedSuccess ? (
                  <>
                    <Check size={16} /> Saved!
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
