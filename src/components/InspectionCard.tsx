'use client';

import React, { useState } from 'react';
import { InspectionResult } from '@/lib/types';
import {
  CheckCircle2, AlertTriangle, ExternalLink, Download,
  ShieldAlert, Film, Music, Check, User, Clock, Lock,
} from 'lucide-react';

interface InspectionCardProps {
  result: InspectionResult;
  onStartJob: (variantId: string, confirmed: boolean) => Promise<void>;
  isStartingJob: boolean;
}

function fmtBytes(b?: number) {
  if (!b) return 'Variable size';
  const mb = b / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

function fmtDuration(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

export const InspectionCard: React.FC<InspectionCardProps> = ({ result, onStartJob, isStartingJob }) => {
  const [selectedId, setSelectedId] = useState(result.variants[0]?.id ?? '');
  const [confirmed, setConfirmed] = useState(false);

  const canStart = selectedId && confirmed && !isStartingJob;

  return (
    <div className="glass-dark shadow-card mb-8 animate-slide-up overflow-hidden">
      {/* Header band */}
      <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="badge-blue">{result.providerName}</span>
          <span className="text-sm text-slate-400">Source Inspection Complete</span>
        </div>
        {result.canDownload ? (
          <span className="badge-green"><CheckCircle2 size={11} /> Authorized Download</span>
        ) : (
          <span className="badge-amber"><AlertTriangle size={11} /> Official Workflow Required</span>
        )}
      </div>

      {/* Metadata */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        {result.metadata.thumbnailUrl && (
          <div className="rounded-xl overflow-hidden aspect-video bg-surface-900 border border-white/8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.metadata.thumbnailUrl}
              alt={result.metadata.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="flex flex-col justify-center gap-4">
          <h2 className="text-xl font-bold leading-tight text-slate-100">{result.metadata.title}</h2>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            {result.metadata.author && (
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-brand-400" /> {result.metadata.author}
              </span>
            )}
            {result.metadata.durationSeconds && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-sky-400" /> {fmtDuration(result.metadata.durationSeconds)}
              </span>
            )}
          </div>

          {/* Guidance */}
          {result.guidanceMessage && (
            <div className={`p-3.5 rounded-xl text-sm leading-relaxed border ${
              result.canDownload
                ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-200'
                : 'bg-amber-500/8 border-amber-500/20 text-amber-200'
            }`}>
              {result.guidanceMessage}
            </div>
          )}

          {result.requiresOfficialWorkflow && result.officialWorkflowUrl && (
            <a href={result.officialWorkflowUrl} target="_blank" rel="noreferrer noopener"
               className="btn-ghost self-start text-sm">
              Official Documentation <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* Variant selector + Rights gate */}
      {result.canDownload && result.variants.length > 0 && (
        <div className="px-6 pb-6 border-t border-white/6 pt-5 space-y-5">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Film size={15} className="text-brand-400" /> Select Quality
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.variants.map((v) => {
              const sel = selectedId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                    sel
                      ? 'bg-brand-500/15 border-brand-500/60 shadow-glow'
                      : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/14'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-slate-100">{v.label}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{v.container}</span>
                        <span>·</span>
                        <span>{fmtBytes(v.estimatedBytes)}</span>
                        {v.audioPresent && (
                          <span className="flex items-center gap-1"><Music size={10} /> Audio</span>
                        )}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      sel ? 'bg-brand-500 border-brand-500' : 'border-slate-600'
                    }`}>
                      {sel && <Check size={11} className="text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rights gate */}
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/6">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-500 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-red-300 mb-1">
                  <Lock size={14} /> Rights & Permission Confirmation (Required)
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  I confirm I own this content or have explicit legal rights to download and store it locally for personal use.
                  I understand this tool does not bypass DRM, paywalls, or access controls.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => canStart && onStartJob(selectedId, confirmed)}
              disabled={!canStart}
              className="btn-brand"
            >
              <Download size={17} />
              {isStartingJob ? 'Starting…' : 'Download Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
