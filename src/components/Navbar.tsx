'use client';

import React from 'react';
import { Layers, History, Settings, Shield } from 'lucide-react';

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
}) => (
  <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-surface-950/80 backdrop-blur-md">
    <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">

      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm">
          M
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm tracking-tight text-zinc-100">movic</span>
          <span className="text-[11px] font-mono text-zinc-500">v1.0</span>
        </div>
      </div>

      {/* Center status indicator */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="font-medium">SSRF Shield Active</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenCapabilities}
          className="btn-secondary h-8 px-2.5 text-xs text-zinc-400 hover:text-zinc-200"
          title="Provider Connectors"
        >
          <Layers size={13} />
          <span className="hidden sm:inline">Connectors</span>
        </button>

        <button
          onClick={onOpenHistory}
          className="btn-secondary h-8 px-2.5 text-xs text-zinc-400 hover:text-zinc-200 relative"
          title="Job History"
        >
          <History size={13} />
          <span className="hidden sm:inline">History</span>
          {historyCount > 0 && (
            <span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              {historyCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className="btn-secondary h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200"
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={13} />
        </button>
      </div>

    </div>
  </header>
);
