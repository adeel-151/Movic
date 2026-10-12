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
  onOpenHistory, onOpenCapabilities, onOpenSettings, historyCount,
}) => (
  <header className="sticky top-0 z-50 border-b border-white/8 bg-surface-950/80 backdrop-blur-xl">
    <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">

      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-glow"
             style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)' }}>
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-gradient">MOVIC</span>
            <span className="badge-blue text-[10px] px-2 py-0.5">SRD v1.0</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-none mt-0.5">Personal Video Downloader</p>
        </div>
      </div>

      {/* SSRF status */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
        <ShieldCheck size={13} className="text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400">SSRF Guard Active</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={onOpenCapabilities} className="btn-ghost text-slate-300 text-xs gap-1.5">
          <Layers size={15} /> Connectors
        </button>
        <button onClick={onOpenHistory} className="btn-ghost text-slate-300 text-xs gap-1.5 relative">
          <History size={15} /> History
          {historyCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center
                             rounded-full bg-brand-500 text-white text-[10px] font-bold px-1">
              {historyCount}
            </span>
          )}
        </button>
        <button onClick={onOpenSettings} className="btn-ghost p-2.5" title="Settings" aria-label="Settings">
          <Sliders size={16} className="text-slate-400" />
        </button>
      </div>
    </div>
  </header>
);
