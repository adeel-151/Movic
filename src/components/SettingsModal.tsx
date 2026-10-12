'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/lib/types';
import { X, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onSaveSettings: (s: Partial<AppSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [retention, setRetention] = useState(60);
  const [maxMB, setMaxMB] = useState(1024);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setRetention(settings.outputRetentionMinutes);
      setMaxMB(Math.round(settings.maxOutputBytes / (1024 * 1024)));
    }
  }, [settings]);

  if (!isOpen || !settings) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSaveSettings({
      outputRetentionMinutes: retention,
      maxOutputBytes: maxMB * 1024 * 1024,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm flex flex-col bg-surface-900 border border-white/[0.08] rounded-2xl shadow-modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h2 className="font-semibold text-sm text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              File Retention (Minutes)
            </label>
            <input
              type="number"
              min={5}
              max={1440}
              value={retention}
              onChange={(e) => setRetention(parseInt(e.target.value) || 60)}
              className="input-minimal w-full"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Time downloaded files stay on disk before automatic cleanup.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Max Download Size (MB)
            </label>
            <input
              type="number"
              min={10}
              max={10240}
              value={maxMB}
              onChange={(e) => setMaxMB(parseInt(e.target.value) || 1024)}
              className="input-minimal w-full"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Maximum file size allowed per download job.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs"
            >
              {saved ? (
                <>
                  <Check size={12} className="text-emerald-500" />
                  <span>Saved</span>
                </>
              ) : (
                <span>{saving ? 'Saving…' : 'Save changes'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
