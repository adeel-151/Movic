'use client';

import React, { useState, useId } from 'react';
import { Search, Clipboard, X, ArrowRight, Loader2, PlayCircle, Globe } from 'lucide-react';

interface UrlInputBarProps {
  onInspect: (url: string) => Promise<void>;
  isLoading: boolean;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({ onInspect, isLoading }) => {
  const [url, setUrl] = useState('');
  const inputId = useId();

  const detectProvider = (input: string): string | null => {
    try {
      const lower = input.toLowerCase();
      if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
      if (lower.includes('tiktok.com')) return 'TikTok';
      if (lower.includes('vimeo.com')) return 'Vimeo';
      if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mkv')) return 'Direct Media';
      return null;
    } catch {
      return null;
    }
  };

  const detected = detectProvider(url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onInspect(url.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // clipboard permission denied or not supported
    }
  };

  const handleClear = () => {
    setUrl('');
  };

  const sampleLinks = [
    {
      label: 'Zencoder Oceans (Direct MP4 - 23MB)',
      url: 'https://vjs.zencdn.net/v/oceans.mp4',
    },
    {
      label: 'Big Buck Bunny (Direct MP4)',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    },
    {
      label: 'MDN Flower (Direct CC0 MP4)',
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    },
    {
      label: 'YouTube (Sample Video)',
      url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    },
  ];

  return (
    <div style={{ marginTop: '36px', marginBottom: '32px' }}>
      <form onSubmit={handleSubmit}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 10px 8px 18px',
          boxShadow: 'var(--shadow-card)',
          transition: 'all 0.2s ease',
        }}>
          <Search size={20} color="var(--text-muted)" style={{ flexShrink: 0, marginRight: '12px' }} />

          <input
            id={inputId}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL (e.g. YouTube, TikTok, Vimeo, or Direct MP4)..."
            required
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '1.02rem',
              fontFamily: 'inherit',
            }}
          />

          {detected && (
            <span className="badge badge-info" style={{ marginRight: '8px', fontSize: '0.72rem' }}>
              <Globe size={11} /> {detected}
            </span>
          )}

          {url ? (
            <button
              type="button"
              onClick={handleClear}
              className="btn-icon"
              title="Clear input"
              style={{ marginRight: '6px' }}
            >
              <X size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePaste}
              className="btn-icon"
              title="Paste from clipboard"
              style={{ marginRight: '6px' }}
            >
              <Clipboard size={18} />
            </button>
          )}

          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="btn btn-primary"
            style={{ padding: '12px 24px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Inspecting...</span>
              </>
            ) : (
              <>
                <span>Inspect Video</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Test Chips */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '16px',
      }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Quick Tests:
        </span>
        {sampleLinks.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setUrl(item.url);
              onInspect(item.url);
            }}
            disabled={isLoading}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              padding: '5px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
          >
            <PlayCircle size={13} color="var(--accent-primary)" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
