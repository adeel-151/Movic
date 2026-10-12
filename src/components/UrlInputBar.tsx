'use client';

import React, { useState, useId } from 'react';
import { ArrowRight, Clipboard, X, Loader2, Link2, Play } from 'lucide-react';

interface UrlInputBarProps {
  onInspect: (url: string) => Promise<void>;
  isLoading: boolean;
}

const SAMPLE_LINKS = [
  { label: 'Oceans (23 MB)', url: 'https://vjs.zencdn.net/v/oceans.mp4', direct: true },
  { label: 'Big Buck Bunny', url: 'https://www.w3schools.com/html/mov_bbb.mp4', direct: true },
  { label: 'MDN Flower (CC0)', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', direct: true },
  { label: 'YouTube sample', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', direct: false },
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
    <div className="space-y-3 mb-10">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center gap-2 bg-surface-900 border border-white/[0.09] rounded-xl px-3.5 py-1.5 shadow-subtle focus-within:border-zinc-500 transition-colors">
          <Link2 className="shrink-0 text-zinc-500" size={17} />
          <input
            id={inputId}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL (MP4 direct link, YouTube, Vimeo, TikTok)…"
            disabled={isLoading}
            className="flex-1 bg-transparent outline-none text-zinc-100 text-sm placeholder:text-zinc-500 py-2"
          />

          {detected && (
            <span className="badge-zinc hidden sm:inline-flex text-[11px]">
              {detected}
            </span>
          )}

          {url ? (
            <button
              type="button"
              onClick={() => setUrl('')}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
              title="Clear input"
            >
              <X size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePaste}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
              title="Paste from clipboard"
            >
              <Clipboard size={15} />
            </button>
          )}

          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="btn-primary text-xs px-3.5 py-2 shrink-0 rounded-lg"
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Inspecting…</span>
              </>
            ) : (
              <>
                <span>Inspect</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick-test chips */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mr-1">Quick:</span>
        {SAMPLE_LINKS.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setUrl(s.url); onInspect(s.url); }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200
                       bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12]
                       px-2.5 py-1 rounded-md transition-colors duration-150 cursor-pointer disabled:opacity-40"
          >
            <Play size={10} className={s.direct ? 'text-emerald-400' : 'text-zinc-500'} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
