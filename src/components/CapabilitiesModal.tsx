'use client';

import React from 'react';
import { ProviderCapability } from '@/lib/types';
import { X, Layers, CheckCircle2, XCircle } from 'lucide-react';

interface CapabilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  capabilities: ProviderCapability[];
}

export const CapabilitiesModal: React.FC<CapabilitiesModalProps> = ({ isOpen, onClose, capabilities }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
         onClick={onClose}>
      <div className="w-full sm:max-w-xl max-h-[85vh] flex flex-col bg-surface-900 border border-white/8 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] animate-slide-up"
           onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <Layers size={18} className="text-brand-400" />
            <h2 className="font-bold text-slate-100">Provider Connectors</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/6 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Platforms are mapped by their legal retrieval capabilities per SRD Sections 2.3 & 16. No scraping or circumvention.
          </p>

          {capabilities.map((cap) => (
            <div key={cap.providerKey}
                 className="p-4 rounded-xl border border-white/8 bg-white/3">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <span className="font-semibold text-slate-100 text-sm">{cap.name}</span>
                <div className="flex items-center gap-2">
                  {cap.metadataSupported
                    ? <span className="badge-green text-[10px]"><CheckCircle2 size={9} /> Metadata</span>
                    : <span className="badge-red text-[10px]"><XCircle size={9} /> Metadata</span>}
                  {cap.authorizedDownloadSupported
                    ? <span className="badge-green text-[10px]"><CheckCircle2 size={9} /> Direct DL</span>
                    : <span className="badge-amber text-[10px]">Official Workflow</span>}
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{cap.notes}</p>
              <p className="text-[11px] text-slate-600 mt-1.5 font-mono">{cap.supportedUrlPatterns.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
