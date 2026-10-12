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
import { ShieldCheck, HardDrive, Lock, AlertCircle } from 'lucide-react';

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
      if (r.ok) {
        const d = await r.json();
        setJobs(d.jobs ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchCapabilities = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/platforms/capabilities');
      if (r.ok) {
        const d = await r.json();
        setCapabilities(d.platforms ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/settings');
      if (r.ok) setSettings(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchCapabilities();
    fetchSettings();
  }, [fetchJobs, fetchCapabilities, fetchSettings]);

  /* ─── Job polling ───────────────────────────────────────── */
  useEffect(() => {
    if (!activeJob) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
    if (activeJob.status !== 'queued' && activeJob.status !== 'preparing') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      fetchJobs();
      return;
    }
    pollingRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/v1/download-jobs/${activeJob.id}`);
        if (r.ok) {
          const updated: DownloadJob = await r.json();
          setActiveJob(updated);
          if (['completed', 'failed', 'cancelled'].includes(updated.status)) {
            fetchJobs();
          }
        }
      } catch { /* ignore */ }
    }, 1200);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
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
      if (!r.ok) {
        setInspectError(data);
      } else {
        setInspectionResult(data);
      }
    } catch (e) {
      setInspectError({
        code: 'NETWORK_ERROR',
        message: e instanceof Error ? e.message : 'Network error occurred.',
      });
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
      if (!r.ok) {
        alert(data.message ?? 'Failed to start download job');
        return;
      }
      setActiveJob({
        id: data.jobId,
        status: 'queued',
        provider: inspectionResult.provider,
        normalizedSourceFingerprint: inspectionResult.metadata.sourceUrl,
        sourceUrl: inspectionResult.metadata.sourceUrl,
        safeTitle: inspectionResult.metadata.title,
        selectedVariantId: variantId,
        progressPercent: 0,
        createdAt: data.createdAt,
        updatedAt: data.createdAt,
      });
      fetchJobs();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Job error occurred');
    } finally {
      setIsStartingJob(false);
    }
  };

  /* ─── Actions ───────────────────────────────────────────── */
  const handleCancelJob = async (id: string) => {
    await fetch(`/api/v1/download-jobs/${id}`, { method: 'DELETE' });
    setActiveJob((p) => (p ? { ...p, status: 'cancelled' } : null));
    fetchJobs();
  };

  const handleDeleteJob = async (id: string) => {
    await fetch(`/api/v1/download-jobs/${id}`, { method: 'DELETE' });
    if (activeJob?.id === id) setActiveJob(null);
    fetchJobs();
  };

  const handleClearAll = async () => {
    await fetch('/api/v1/download-jobs/all', { method: 'DELETE' });
    setActiveJob(null);
    fetchJobs();
  };

  const handleSaveSettings = async (s: Partial<AppSettings>) => {
    const r = await fetch('/api/v1/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (r.ok) {
      setSettings(await r.json());
      setSettingsOpen(false);
    }
  };

  const showFeatures = !inspectionResult && !activeJob && !isInspecting && !inspectError;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenCapabilities={() => setCapsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        historyCount={jobs.length}
      />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-16 pb-20">

        {/* Minimal Hero */}
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100">
            Media Retrieval Workspace
          </h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Inspect source streams, verify access rights, and store authorized video locally.
          </p>
        </div>

        {/* Input */}
        <UrlInputBar onInspect={handleInspect} isLoading={isInspecting} />

        {/* Inspect Error */}
        {inspectError && (
          <div className="mb-8 p-3.5 rounded-lg border border-red-500/20 bg-red-500/[0.05] flex items-start gap-2.5 animate-slide-up">
            <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-300">{inspectError.code}</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{inspectError.message}</p>
            </div>
          </div>
        )}

        {/* Active Job */}
        {activeJob && (
          <JobMonitor
            job={activeJob}
            onCancelJob={handleCancelJob}
            onClearActiveJob={() => setActiveJob(null)}
          />
        )}

        {/* Inspection Result */}
        {inspectionResult && (
          <InspectionCard
            result={inspectionResult}
            onStartJob={handleStartJob}
            isStartingJob={isStartingJob}
          />
        )}

        {/* Minimal Features (Empty state) */}
        {showFeatures && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-white/[0.06]">
            {[
              {
                icon: <ShieldCheck size={16} className="text-zinc-300" />,
                title: 'SSRF Shield',
                desc: 'DNS and IP checks block loopback and cloud metadata requests.',
              },
              {
                icon: <Lock size={16} className="text-zinc-300" />,
                title: 'Rights-First Gate',
                desc: 'Mandatory affirmative consent required before any retrieval job.',
              },
              {
                icon: <HardDrive size={16} className="text-zinc-300" />,
                title: 'Local Engine',
                desc: 'Sandboxed SQLite queue with automatic retention cleanup.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-white/[0.05] bg-surface-900/40 space-y-1.5"
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center mb-2">
                  {f.icon}
                </div>
                <h3 className="font-medium text-xs text-zinc-200">{f.title}</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-5">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-[11px] text-zinc-500">
          <span>movic · personal single-user workspace</span>
          <span>localhost:3000</span>
        </div>
      </footer>

      {/* Modals */}
      <JobHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        jobs={jobs}
        onDeleteJob={handleDeleteJob}
        onClearAll={handleClearAll}
      />
      <CapabilitiesModal
        isOpen={capsOpen}
        onClose={() => setCapsOpen(false)}
        capabilities={capabilities}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
