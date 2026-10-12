'use client';

import React, { useState, useId } from 'react';
import { Search, Clipboard, X, Zap, PlayCircle, Loader2, Globe } from 'lucide-react';

interface UrlInputBarProps {
  onInspect: (url: string) => Promise<void>;
  isLoading: boolean;
}

const SAMPLE_LINKS = [
  { label: 'Oceans (MP4 · 23 MB)',  url: 'https://vjs.zencdn.net/v/oceans.mp4' },
  { label: 'Big Buck Bunny',         url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { label: 'MDN Flower (CC0)',       url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
  { label: 'YouTube sample',         url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
];

function detectPlatform(url: string): string | null {
  try {
    const l = url.toLowerCase();
    if (l.includes('youtube.com') || l.includes('youtu.be')) return 'YouTube';
    if (l.includes('tiktok.com')) return 'TikTok';
    if (l.includes('vimeo.com')) return 'Vimeo';
    if (/\.(mp4|webm|mkv|m4v|mov)(\?.*)?$/.test(l)) return 'Direct MP4';
  } catch { /* ignore */ }
  return null;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({ onInspect, isLoading }) => {
  const [url, setUrl] = useState('');
  const inputId = useId();
  const detected = detectPlatform(url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) onInspect(url.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch { /* denied */ }
  };

  return (
    <div className="space-y-4 mb-10">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center gap-2 bg-surface-900 border border-white/10 rounded-2xl px-4 py-2 shadow-card focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all duration-200">
          <Search className="shrink-0 text-slate-500" size={20} />
          <input
            id={inputId}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a video URL — YouTube, Vimeo, TikTok, or direct MP4…"
            disabled={isLoading}
            className="flex-1 bg-transparent outline-none text-slate-100 text-base placeholder:text-slate-500 py-2"
          />
          {detected && (
            <span className="badge-blue hidden sm:inline-flex">
              <Globe size={11} /> {detected}
            </span>
          )}
          {url ? (
            <button type="button" onClick={() => setUrl('')} className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg transition-colors" title="Clear">
              <X size={17} />
            </button>
          ) : (
            <button type="button" onClick={handlePaste} className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg transition-colors" title="Paste from clipboard">
              <Clipboard size={17} />
            </button>
          )}
          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="btn-brand shrink-0 text-sm px-5 py-2.5"
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin" /><span>Inspecting…</span></>
            ) : (
              <><Zap size={16} /><span>Inspect</span></>
            )}
          </button>
        </div>
      </form>

      {/* Quick-test chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick test:</span>
        {SAMPLE_LINKS.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setUrl(s.url); onInspect(s.url); }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full
                       border border-white/8 bg-white/3 text-slate-400
                       hover:text-slate-100 hover:border-brand-500/50 hover:bg-brand-500/10
                       transition-all duration-150 disabled:opacity-40 cursor-pointer"
          >
            <PlayCircle size={12} className="text-brand-400" />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};
