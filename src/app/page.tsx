'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { UrlInputBar } from '@/components/UrlInputBar';
import { InspectionCard } from '@/components/InspectionCard';
import { JobMonitor } from '@/components/JobMonitor';
import { JobHistoryModal } from '@/components/JobHistoryModal';
import { CapabilitiesModal } from '@/components/CapabilitiesModal';
import { SettingsModal } from '@/components/SettingsModal';
import {
  DownloadJob, InspectionResult, ProviderCapability, AppSettings, MediaVariant,
} from '@/lib/types';
import { ShieldCheck, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Home() {
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<{ code: string; message: string } | null>(null);

  const [activeJob, setActiveJob] = useState<DownloadJob | null>(null);
  const [isStartingJob, setIsStartingJob] = useState(false);

  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [capabilities, setCapabilities] = useState<ProviderCapability[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [capsOpen, setCapsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /* ─── Data fetching ─────────────────────────────────────── */
  const fetchJobs = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/download-jobs');
      if (r.ok) { const d = await r.json(); setJobs(d.jobs ?? []); }
    } catch { /* ignore */ }
  }, []);

  const fetchCapabilities = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/platforms/capabilities');
      if (r.ok) { const d = await r.json(); setCapabilities(d.platforms ?? []); }
    } catch { /* ignore */ }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/settings');
      if (r.ok) setSettings(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchJobs(); fetchCapabilities(); fetchSettings();
  }, [fetchJobs, fetchCapabilities, fetchSettings]);

  /* ─── Job polling ───────────────────────────────────────── */
  useEffect(() => {
    if (!activeJob) { if (pollingRef.current) clearInterval(pollingRef.current); return; }
    if (activeJob.status !== 'queued' && activeJob.status !== 'preparing') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      fetchJobs(); return;
    }
    pollingRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/v1/download-jobs/${activeJob.id}`);
        if (r.ok) {
          const updated: DownloadJob = await r.json();
          setActiveJob(updated);
          if (['completed', 'failed', 'cancelled'].includes(updated.status)) fetchJobs();
        }
      } catch { /* ignore */ }
    }, 1200);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [activeJob?.id, activeJob?.status, fetchJobs]);

  /* ─── Inspect ───────────────────────────────────────────── */
  const handleInspect = async (url: string) => {
    setIsInspecting(true);
    setInspectError(null);
    setInspectionResult(null);
    try {
      const r = await fetch('/api/v1/sources/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      if (!r.ok) setInspectError(data);
      else setInspectionResult(data);
    } catch (e) {
      setInspectError({ code: 'NETWORK_ERROR', message: e instanceof Error ? e.message : 'Network failed' });
    } finally {
      setIsInspecting(false);
    }
  };

  /* ─── Start job ─────────────────────────────────────────── */
  const handleStartJob = async (variantId: string, confirmed: boolean) => {
    if (!inspectionResult) return;
    setIsStartingJob(true);
    try {
      const r = await fetch('/api/v1/download-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: inspectionResult.metadata.sourceUrl,
          provider: inspectionResult.provider,
          safeTitle: inspectionResult.metadata.title,
          selectedVariantId: variantId,
          rightsConfirmed: confirmed,
          variants: inspectionResult.variants as MediaVariant[],
        }),
      });
      const data = await r.json();
      if (!r.ok) { alert(data.message ?? 'Failed to create job'); return; }
      setActiveJob({
        id: data.jobId, status: 'queued',
        provider: inspectionResult.provider,
        normalizedSourceFingerprint: inspectionResult.metadata.sourceUrl,
        sourceUrl: inspectionResult.metadata.sourceUrl,
        safeTitle: inspectionResult.metadata.title,
        selectedVariantId: variantId,
        progressPercent: 0, createdAt: data.createdAt, updatedAt: data.createdAt,
      });
      fetchJobs();
    } catch (e) { alert(e instanceof Error ? e.message : 'Job error'); }
    finally { setIsStartingJob(false); }
  };

  /* ─── Job actions ───────────────────────────────────────── */
  const handleCancelJob = async (id: string) => {
    await fetch(`/api/v1/download-jobs/${id}`, { method: 'DELETE' });
    setActiveJob(p => p ? { ...p, status: 'cancelled' } : null);
    fetchJobs();
  };

  const handleDeleteJob = async (id: string) => {
    await fetch(`/api/v1/download-jobs/${id}`, { method: 'DELETE' });
    if (activeJob?.id === id) setActiveJob(null);
    fetchJobs();
  };

  const handleClearAll = async () => {
    await fetch('/api/v1/download-jobs/all', { method: 'DELETE' });
    setActiveJob(null); fetchJobs();
  };

  const handleSaveSettings = async (s: Partial<AppSettings>) => {
    const r = await fetch('/api/v1/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (r.ok) { setSettings(await r.json()); setSettingsOpen(false); }
  };

  const showHero = !inspectionResult && !activeJob && !isInspecting && !inspectError;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenCapabilities={() => setCapsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        historyCount={jobs.length}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-5 pb-20 pt-10">

        {/* ── Hero heading ─────────────────────────────────── */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-500/25 bg-brand-500/10 text-brand-200 text-xs font-semibold">
            <Zap size={13} className="text-brand-400" /> Authorized Media Retrieval
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gradient leading-tight">
            Download Videos<br />
            <span className="text-gradient-brand">The Right Way</span>
          </h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Inspect, verify, confirm rights, and download — all from a secure localhost-only workspace.
          </p>
        </div>

        {/* ── URL Input ────────────────────────────────────── */}
        <UrlInputBar onInspect={handleInspect} isLoading={isInspecting} />

        {/* ── Error ────────────────────────────────────────── */}
        {inspectError && (
          <div className="mb-8 p-4 rounded-xl border border-red-500/25 bg-red-500/8 flex items-start gap-3 animate-slide-up">
            <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-300">{inspectError.code}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{inspectError.message}</p>
            </div>
          </div>
        )}

        {/* ── Job monitor ──────────────────────────────────── */}
        {activeJob && (
          <JobMonitor
            job={activeJob}
            onCancelJob={handleCancelJob}
            onClearActiveJob={() => setActiveJob(null)}
          />
        )}

        {/* ── Inspection result ────────────────────────────── */}
        {inspectionResult && (
          <InspectionCard
            result={inspectionResult}
            onStartJob={handleStartJob}
            isStartingJob={isStartingJob}
          />
        )}

        {/* ── Feature grid (empty state) ───────────────────── */}
        {showHero && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              {
                icon: <ShieldCheck size={20} className="text-brand-400" />,
                bg: 'bg-brand-500/10',
                title: 'SSRF-Safe Requests',
                desc: 'DNS resolution checks block loopback, private IPs, and cloud metadata endpoints before any request is made.',
              },
              {
                icon: <CheckCircle2 size={20} className="text-emerald-400" />,
                bg: 'bg-emerald-500/10',
                title: 'Rights-First Design',
                desc: 'Mandatory affirmative consent gate before every download. Supports creators and respects platform policies.',
              },
              {
                icon: <Zap size={20} className="text-sky-400" />,
                bg: 'bg-sky-500/10',
                title: 'Fast Background Worker',
                desc: 'SQLite-persisted job queue with SHA-256 verification, progress streaming, and automatic expiry cleanup.',
              },
            ].map((f, i) => (
              <div key={i} className="glass-dark p-5 shadow-card space-y-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.bg}`}>{f.icon}</div>
                <h3 className="font-semibold text-sm text-slate-100">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/6 py-5 bg-surface-950/60">
        <div className="max-w-4xl mx-auto px-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span>MOVIC · SRD v1.0 · Localhost Only</span>
          <div className="flex items-center gap-3">
            <span>SQLite</span><span>·</span><span>SHA-256 Verified</span><span>·</span><span>Auto Expiry</span>
          </div>
        </div>
      </footer>

      {/* ── Modals ───────────────────────────────────────────── */}
      <JobHistoryModal
        isOpen={historyOpen} onClose={() => setHistoryOpen(false)}
        jobs={jobs} onDeleteJob={handleDeleteJob} onClearAll={handleClearAll}
      />
      <CapabilitiesModal
        isOpen={capsOpen} onClose={() => setCapsOpen(false)}
        capabilities={capabilities}
      />
      <SettingsModal
        isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}
        settings={settings} onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
