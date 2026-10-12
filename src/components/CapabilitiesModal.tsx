'use client';

import React from 'react';
import { ProviderCapability } from '@/lib/types';
import { X, Check, ArrowUpRight } from 'lucide-react';

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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[85vh] flex flex-col bg-surface-900 border border-white/[0.08] rounded-2xl shadow-modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div>
            <h2 className="font-semibold text-sm text-zinc-100">Platform Connectors</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Compliant source inspection capabilities</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
          {capabilities.map((cap) => (
            <div
              key={cap.providerKey}
              className="p-3.5 rounded-lg border border-white/[0.06] bg-surface-850/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-zinc-200">{cap.name}</span>
                <div className="flex items-center gap-1.5">
                  {cap.authorizedDownloadSupported ? (
                    <span className="badge-green text-[10px]">Direct Download</span>
                  ) : (
                    <span className="badge-zinc text-[10px]">Official Workflow</span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{cap.notes}</p>
              <div className="text-[10px] font-mono text-zinc-600 truncate">
                {cap.supportedUrlPatterns.join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
