'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/lib/types';
import { X, Sliders, Save, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onSaveSettings: (s: Partial<AppSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSaveSettings }) => {
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
    await onSaveSettings({ outputRetentionMinutes: retention, maxOutputBytes: maxMB * 1024 * 1024 });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Row = ({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-semibold text-slate-200 mb-1.5">{label}</label>
      {children}
      <p className="text-xs text-slate-500 mt-1.5">{hint}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
         onClick={onClose}>
      <div className="w-full sm:max-w-md flex flex-col bg-surface-900 border border-white/8 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] animate-slide-up"
           onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-brand-400" />
            <h2 className="font-bold text-slate-100">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/6 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <Row label="File Retention (minutes)"
               hint="Saved files are auto-deleted after this window.">
            <input type="number" min={5} max={1440} value={retention}
                   onChange={(e) => setRetention(+e.target.value || 60)}
                   className="input-field w-full" />
          </Row>

          <Row label="Max File Size (MB)"
               hint="Downloads exceeding this limit are rejected.">
            <input type="number" min={10} max={5120} value={maxMB}
                   onChange={(e) => setMaxMB(+e.target.value || 1024)}
                   className="input-field w-full" />
          </Row>

          {/* Read-only info */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/6 text-xs text-slate-500 space-y-1.5 font-mono">
            <div><span className="text-slate-400">Binding:</span> {settings.appBindHost}</div>
            <div><span className="text-slate-400">Concurrency:</span> {settings.maxConcurrentJobs} job(s)</div>
            <div><span className="text-slate-400">Job Timeout:</span> {settings.jobTimeoutSeconds}s</div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost text-slate-400">Cancel</button>
            <button type="submit" disabled={saving} className="btn-brand text-sm px-5 py-2.5">
              {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Settings</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
