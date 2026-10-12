'use client';

import React, { useState } from 'react';
import { InspectionResult } from '@/lib/types';
import {
  Check, ExternalLink, Download,
  User, Clock, Lock, CheckCircle2, AlertCircle,
} from 'lucide-react';

interface InspectionCardProps {
  result: InspectionResult;
  onStartJob: (variantId: string, confirmed: boolean) => Promise<void>;
  isStartingJob: boolean;
}

function fmtBytes(b?: number) {
  if (!b) return 'Stream size';
  const mb = b / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

function fmtDuration(s?: number) {
  if (!s) return null;
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

export const InspectionCard: React.FC<InspectionCardProps> = ({
  result,
  onStartJob,
  isStartingJob,
}) => {
  const [selectedId, setSelectedId] = useState(result.variants[0]?.id ?? '');
  const [confirmed, setConfirmed] = useState(false);

  const canStart = selectedId && confirmed && !isStartingJob;

  return (
    <div className="card-minimal mb-8 animate-slide-up overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-white/[0.07] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="badge-zinc">{result.providerName}</span>
          <span className="text-xs text-zinc-500">Source verified</span>
        </div>
        {result.canDownload ? (
          <span className="badge-green">
            <CheckCircle2 size={11} /> Ready to download
          </span>
        ) : (
          <span className="badge-amber">
            <AlertCircle size={11} /> Official workflow required
          </span>
        )}
      </div>

      {/* Main info */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-start">
        {result.metadata.thumbnailUrl && (
          <div className="rounded-lg overflow-hidden aspect-video bg-surface-950 border border-white/[0.08]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.metadata.thumbnailUrl}
              alt={result.metadata.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="flex flex-col gap-3 min-w-0">
          <h2 className="text-base font-semibold text-zinc-100 leading-snug line-clamp-2">
            {result.metadata.title}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            {result.metadata.author && (
              <span className="flex items-center gap-1.5">
                <User size={12} className="text-zinc-500" /> {result.metadata.author}
              </span>
            )}
            {fmtDuration(result.metadata.durationSeconds) && (
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-zinc-500" /> {fmtDuration(result.metadata.durationSeconds)}
              </span>
            )}
          </div>

          {/* Guidance note */}
          {result.guidanceMessage && (
            <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
              result.canDownload
                ? 'bg-emerald-500/[0.05] border-emerald-500/15 text-emerald-300/90'
                : 'bg-amber-500/[0.05] border-amber-500/15 text-amber-300/90'
            }`}>
              {result.guidanceMessage}
            </div>
          )}

          {result.requiresOfficialWorkflow && result.officialWorkflowUrl && (
            <a
              href={result.officialWorkflowUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-secondary self-start text-xs h-8 px-3"
            >
              <span>Official Workflow Guide</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Variant selection & Rights gate */}
      {result.canDownload && result.variants.length > 0 && (
        <div className="px-5 pb-5 border-t border-white/[0.07] pt-4 space-y-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-2.5">
              Available Qualities
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {result.variants.map((v) => {
                const isSelected = selectedId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.06] border-white/40 text-white'
                        : 'bg-surface-850/60 border-white/[0.06] hover:border-white/[0.15] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate">{v.label}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {v.container.toUpperCase()} · {fmtBytes(v.estimatedBytes)}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white border-white' : 'border-zinc-700'
                      }`}>
                        {isSelected && <Check size={10} className="text-zinc-950 font-bold" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minimal Rights confirmation */}
          <div className="p-3 rounded-lg border border-white/[0.07] bg-white/[0.02]">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded border-zinc-700 bg-surface-900 accent-zinc-100 cursor-pointer"
              />
              <div className="text-xs text-zinc-400 leading-relaxed">
                <span className="text-zinc-200 font-medium mr-1.5 inline-flex items-center gap-1">
                  <Lock size={11} className="text-zinc-400" /> Authorized personal retrieval:
                </span>
                I confirm I have permission to download and store this media for private offline use.
              </div>
            </label>
          </div>

          {/* Action button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => canStart && onStartJob(selectedId, confirmed)}
              disabled={!canStart}
              className="btn-primary"
            >
              <Download size={14} />
              <span>{isStartingJob ? 'Preparing download…' : 'Download Now'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
