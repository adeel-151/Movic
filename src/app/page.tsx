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
  DownloadJob,
  InspectionResult,
  ProviderCapability,
  AppSettings,
  ApiErrorResponse,
} from '@/lib/types';
import { ShieldCheck, AlertCircle, ArrowUpRight, Zap, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<ApiErrorResponse | null>(null);

  const [activeJob, setActiveJob] = useState<DownloadJob | null>(null);
  const [isStartingJob, setIsStartingJob] = useState(false);

  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [capabilities, setCapabilities] = useState<ProviderCapability[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCapabilitiesOpen, setIsCapabilitiesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial data
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/download-jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchCapabilities = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/platforms/capabilities');
      if (res.ok) {
        const data = await res.json();
        setCapabilities(data.platforms || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchCapabilities();
    fetchSettings();
  }, [fetchJobs, fetchCapabilities, fetchSettings]);

  // Polling for active job status
  useEffect(() => {
    if (!activeJob) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const isRunning = activeJob.status === 'queued' || activeJob.status === 'preparing';
    if (!isRunning) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      fetchJobs();
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/download-jobs/${activeJob.id}`);
        if (res.ok) {
          const updated: DownloadJob = await res.json();
          setActiveJob(updated);
          if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
            fetchJobs();
          }
        }
      } catch {
        // ignore polling error
      }
    }, 1200);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeJob?.id, activeJob?.status, fetchJobs]);

  // Handle URL Inspection
  const handleInspect = async (url: string) => {
    setIsInspecting(true);
    setInspectError(null);
    setInspectionResult(null);

    try {
      const res = await fetch('/api/v1/sources/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInspectError(data);
      } else {
        setInspectionResult(data);
      }
    } catch (err: unknown) {
      setInspectError({
        code: 'SOURCE_UNAVAILABLE',
        message: err instanceof Error ? err.message : 'Network request failed',
        retryable: true,
        requestId: 'err_client',
      });
    } finally {
      setIsInspecting(false);
    }
  };

  // Handle Starting Download Job
  const handleStartJob = async (selectedVariantId: string, rightsConfirmed: boolean) => {
    if (!inspectionResult) return;
    setIsStartingJob(true);

    try {
      const res = await fetch('/api/v1/download-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: inspectionResult.metadata.sourceUrl,
          provider: inspectionResult.provider,
          safeTitle: inspectionResult.metadata.title,
          selectedVariantId,
          rightsConfirmed,
          variants: inspectionResult.variants,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Failed to start download job');
      } else {
        const newJob: DownloadJob = {
          id: data.jobId,
          status: 'queued',
          provider: inspectionResult.provider,
          normalizedSourceFingerprint: inspectionResult.metadata.sourceUrl,
          sourceUrl: inspectionResult.metadata.sourceUrl,
          safeTitle: inspectionResult.metadata.title,
          selectedVariantId,
          progressPercent: 0,
          createdAt: data.createdAt,
          updatedAt: data.createdAt,
        };
        setActiveJob(newJob);
        fetchJobs();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error launching download job');
    } finally {
      setIsStartingJob(false);
    }
  };

  // Handle Cancellation
  const handleCancelJob = async (jobId: string) => {
    try {
      await fetch(`/api/v1/download-jobs/${jobId}`, { method: 'DELETE' });
      setActiveJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
      fetchJobs();
    } catch {
      // ignore
    }
  };

  // Handle Deletion
  const handleDeleteJob = async (jobId: string) => {
    try {
      await fetch(`/api/v1/download-jobs/${jobId}`, { method: 'DELETE' });
      if (activeJob?.id === jobId) setActiveJob(null);
      fetchJobs();
    } catch {
      // ignore
    }
  };

  // Handle Clear All
  const handleClearAll = async () => {
    try {
      await fetch('/api/v1/download-jobs/all', { method: 'DELETE' });
      setActiveJob(null);
      fetchJobs();
    } catch {
      // ignore
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setIsSettingsOpen(false);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenCapabilities={() => setIsCapabilitiesOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        historyCount={jobs.length}
      />

      <main className="app-container" style={{ flex: 1, paddingBottom: '60px' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginTop: '48px', maxWidth: '780px', marginInline: 'auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            color: '#a5b4fc',
            marginBottom: '16px',
          }}>
            <Zap size={14} color="var(--accent-primary)" />
            <span>Authorized Media Retrieval & Resolution Selection</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: '16px',
          }}>
            Personal Social Video Downloader
          </h1>

          <p style={{
            fontSize: '1.05rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}>
            Inspect source media capabilities, select authentic available video variants, confirm ownership rights, and download verified files directly to your machine.
          </p>
        </div>

        {/* URL Input Bar */}
        <UrlInputBar onInspect={handleInspect} isLoading={isInspecting} />

        {/* Error Alert */}
        {inspectError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}>
            <AlertCircle size={20} color="var(--status-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.92rem' }}>
                Inspection Blocked: {inspectError.code}
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                {inspectError.message}
              </p>
              {inspectError.code === 'SSRF_BLOCKED' && (
                <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '6px' }}>
                  Target hostname or IP is rejected by SSRF security defenses (loopback/private IP prohibited).
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Job Monitor */}
        {activeJob && (
          <JobMonitor
            job={activeJob}
            onCancelJob={handleCancelJob}
            onClearActiveJob={() => setActiveJob(null)}
          />
        )}

        {/* Inspected Media Details */}
        {inspectionResult && (
          <InspectionCard
            result={inspectionResult}
            onStartJob={handleStartJob}
            isStartingJob={isStartingJob}
          />
        )}

        {/* Feature Highlights Grid */}
        {!inspectionResult && !activeJob && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginTop: '20px',
          }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}>
                <ShieldCheck size={20} color="var(--accent-primary)" />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                Strict SSRF Defenses
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Destination DNS resolution and IP verification prevent server-side request forgery, blocking internal addresses, localhost, and cloud metadata APIs.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}>
                <CheckCircle2 size={20} color="var(--status-success)" />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                Rights & Compliance First
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Respects creator download settings and platform policies. Public links without an authorized download path clearly guide users to official creator export tools.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}>
                <Zap size={20} color="var(--status-info)" />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                Isolated Background Worker
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                SQLite persistence, concurrency limits, real-time download streaming, automatic SHA-256 verification, and automatic temporary file expiration.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(9, 13, 22, 0.95)',
        padding: '24px 0',
      }}>
        <div className="app-container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '0.82rem',
          color: 'var(--text-dim)',
        }}>
          <div>
            Personal Social Video Downloader · Software Requirements Document Baseline v1.0
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Localhost Only</span>
            <span>·</span>
            <span>SQLite Embedded</span>
            <span>·</span>
            <span>Safe File Naming</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <JobHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        jobs={jobs}
        onDeleteJob={handleDeleteJob}
        onClearAll={handleClearAll}
      />

      <CapabilitiesModal
        isOpen={isCapabilitiesOpen}
        onClose={() => setIsCapabilitiesOpen(false)}
        capabilities={capabilities}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
