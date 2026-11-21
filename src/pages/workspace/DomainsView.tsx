import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  apiGenerateOwnershipToken,
  apiValidateDomainSyntax,
  apiVerifyDomainOwnership,
} from '../../services/apiClient';
import {
  addMonitoredDomain,
  deleteMonitoredDomain,
  updateDomainSettings,
  updateDomainVerification,
} from '../../services/firestoreService';
import { MonitoredDomainDoc } from '../../types/astasecure';

interface DomainsViewProps {
  onRunScan: (domain: MonitoredDomainDoc) => Promise<void>;
  scanningDomainId: string | null;
  onViewLatestScan: (scanId: string) => void;
}

export const DomainsView: React.FC<DomainsViewProps> = ({
  onRunScan,
  scanningDomainId,
  onViewLatestScan,
}) => {
  const { t } = useLanguage();
  const { user, activeOrg, activeRole, domains, plans } = useAuth();
  const [newDomain, setNewDomain] = useState(() => localStorage.getItem('astasecure_prefill_domain') || '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resolverFeedback, setResolverFeedback] = useState<
    Record<
      string,
      {
        status: string;
        message: string;
        resolvers: { resolver: string; found: boolean; technicalError?: string }[];
      }
    >
  >({});

  const [selectorInputs, setSelectorInputs] = useState<Record<string, string>>({});
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, 'manual' | 'weekly' | 'daily'>>({});

  useEffect(() => {
    localStorage.removeItem('astasecure_prefill_domain');
  }, []);

  useEffect(() => {
    const sel: Record<string, string> = {};
    const sch: Record<string, 'manual' | 'weekly' | 'daily'> = {};
    for (const d of domains) {
      sel[d.id] = (d.dkimSelectors || []).join(', ');
      sch[d.id] = d.scheduleFrequency || 'manual';
    }
    setSelectorInputs(sel);
    setScheduleInputs(sch);
  }, [domains]);

  const canModify = activeRole === 'owner' || activeRole === 'admin';
  const currentPlan = plans.find((p) => p.id === activeOrg?.plan);
  const domainLimit = activeOrg?.domainLimit || currentPlan?.domainLimit || 1;

  const handleCopy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeOrg || !canModify) return;
    setError(null);

    if (domains.length >= domainLimit) {
      setError(`Plan limit reached (${domains.length}/${domainLimit} domains). Upgrade your plan to add more domains.`);
      return;
    }

    setBusy(true);
    try {
      const check = await apiValidateDomainSyntax(newDomain);
      if (!check.valid || !check.normalized) {
        setError(check.errorMessage || 'Invalid domain syntax.');
        return;
      }

      if (domains.some((d) => d.domain === check.normalized)) {
        setError(`${check.normalized} is already registered in this organization.`);
        return;
      }

      const tokenPayload = await apiGenerateOwnershipToken(check.normalized);
      await addMonitoredDomain({
        orgId: activeOrg.id,
        domain: check.normalized,
        createdBy: user.uid,
        actorEmail: user.email || '',
        verificationToken: tokenPayload.token,
        tokenExpiresAt: tokenPayload.expiresAtIso,
        memberUids: activeOrg.memberUids,
      });
      setNewDomain('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add domain.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOwnership = async (dom: MonitoredDomainDoc) => {
    if (!user || !activeOrg || !canModify) return;
    setVerifyingId(dom.id);
    setError(null);
    try {
      const outcome = await apiVerifyDomainOwnership({
        orgId: activeOrg.id,
        domain: dom.domain,
        token: dom.verificationToken,
        expiresAtIso: dom.tokenExpiresAt,
      });

      setResolverFeedback((prev) => ({
        ...prev,
        [dom.id]: {
          status: outcome.status,
          message: outcome.message,
          resolvers: outcome.resolvers,
        },
      }));

      await updateDomainVerification({
        orgId: activeOrg.id,
        domainId: dom.id,
        domain: dom.domain,
        actorId: user.uid,
        actorEmail: user.email || '',
        memberUids: activeOrg.memberUids,
        verificationStatus: outcome.status,
        verifiedAt: outcome.verifiedAtIso,
        ownershipProof: outcome.ownershipProof,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRegenerateToken = async (dom: MonitoredDomainDoc) => {
    if (!user || !activeOrg || !canModify) return;
    const tokenPayload = await apiGenerateOwnershipToken(dom.domain);
    await updateDomainVerification({
      orgId: activeOrg.id,
      domainId: dom.id,
      domain: dom.domain,
      actorId: user.uid,
      actorEmail: user.email || '',
      memberUids: activeOrg.memberUids,
      verificationStatus: 'pending',
      verificationToken: tokenPayload.token,
      tokenExpiresAt: tokenPayload.expiresAtIso,
    });
  };

  const handleSaveSettings = async (dom: MonitoredDomainDoc) => {
    if (!activeOrg || !canModify) return;
    const raw = selectorInputs[dom.id] || '';
    const parsedSelectors = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 15);
    await updateDomainSettings({
      orgId: activeOrg.id,
      domainId: dom.id,
      dkimSelectors: parsedSelectors,
      scheduleFrequency: scheduleInputs[dom.id] || 'manual',
    });
  };

  const handleDelete = async (dom: MonitoredDomainDoc) => {
    if (!user || !activeOrg || !canModify) return;
    await deleteMonitoredDomain({
      orgId: activeOrg.id,
      domainId: dom.id,
      domain: dom.domain,
      actorId: user.uid,
      actorEmail: user.email || '',
      memberUids: activeOrg.memberUids,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{t.domains.title}</h1>
          <p className="text-xs text-slate-400 mt-1">{t.domains.subtitle}</p>
        </div>
        <div className="text-xs font-mono text-slate-300 tabular-nums">
          Quota: {domains.length} / {domainLimit} domains
        </div>
      </div>

      {canModify && (
        <form onSubmit={handleAddDomain} className="bg-[#0D1628] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder={t.domains.addPlaceholder}
              className="flex-1 px-4 py-2.5 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
            />
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {t.domains.addButton}
            </button>
          </div>
          {error && (
            <p className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}
        </form>
      )}

      <div className="space-y-4">
        {domains.map((dom) => {
          const isVerified = dom.verificationStatus === 'verified';
          const feedback = resolverFeedback[dom.id];
          return (
            <div key={dom.id} className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-[#00C8E8]" />
                  <div>
                    <h2 className="text-base font-bold text-white">{dom.domain}</h2>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className={isVerified ? 'text-emerald-400 font-medium' : 'text-amber-300 font-medium'}>
                        {isVerified ? t.statuses.verified : t.statuses.pending}
                      </span>
                      {typeof dom.lastScore === 'number' && (
                        <>
                          <span>·</span>
                          <span className="font-mono tabular-nums text-white">Score: {dom.lastScore}/100</span>
                        </>
                      )}
                      {dom.detectedProvider && (
                        <>
                          <span>·</span>
                          <span>Provider: {dom.detectedProvider}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {dom.lastScanId && (
                    <button
                      type="button"
                      onClick={() => onViewLatestScan(dom.lastScanId!)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      View Scan Evidence
                    </button>
                  )}
                  {isVerified && canModify && (
                    <button
                      type="button"
                      disabled={scanningDomainId === dom.id}
                      onClick={() => onRunScan(dom)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-xs rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {scanningDomainId === dom.id ? t.dashboard.scanning : t.domains.runScan}
                    </button>
                  )}
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => handleDelete(dom)}
                      aria-label={`Delete ${dom.domain}`}
                      className="p-2 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Ownership Verification Panel */}
              <div className="bg-[#060B14] border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">{t.domains.tokenLabel}</span>
                  <span className="text-xs font-mono text-slate-400">
                    Expires: {new Date(dom.tokenExpiresAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-[#0D1628] border border-slate-800 rounded flex items-center justify-between gap-2">
                    <div>
                      <div className="text-slate-400">Host / Name</div>
                      <div className="font-mono text-white">@ or _astasecure</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${dom.id}-host`, '_astasecure')}
                      className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {copiedId === `${dom.id}-host` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-2.5 bg-[#0D1628] border border-slate-800 rounded flex items-center justify-between gap-2 overflow-hidden">
                    <div className="min-w-0">
                      <div className="text-slate-400">TXT Value</div>
                      <div className="font-mono text-[#22D3EE] truncate">{dom.verificationToken}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${dom.id}-val`, dom.verificationToken)}
                      className="p-1.5 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                    >
                      {copiedId === `${dom.id}-val` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {canModify && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={verifyingId === dom.id}
                      onClick={() => handleVerifyOwnership(dom)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00C8E8]" />
                      {verifyingId === dom.id ? t.domains.verifying : t.domains.verifyButton}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerateToken(dom)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Rotate Token
                    </button>
                  </div>
                )}

                {feedback && (
                  <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                    <p className={feedback.status === 'verified' ? 'text-emerald-400' : 'text-amber-300'}>
                      {feedback.message}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {feedback.resolvers.map((r) => (
                        <div key={r.resolver} className="p-2 bg-[#0D1628] border border-slate-800 rounded flex items-center justify-between">
                          <span className="text-slate-300">{r.resolver}</span>
                          <span className={r.found ? 'text-emerald-400 font-medium' : r.technicalError ? 'text-amber-300' : 'text-slate-400'}>
                            {r.found ? 'Found' : r.technicalError ? 'Technical Error' : 'Not Visible Yet'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* DKIM Selectors & Schedule Configuration */}
              {canModify && (
                <div className="grid sm:grid-cols-12 gap-3 items-end pt-1">
                  <div className="sm:col-span-6">
                    <label className="block text-xs text-slate-400 mb-1">{t.domains.dkimLabel}</label>
                    <input
                      type="text"
                      placeholder="e.g. selector1, google, ovh"
                      value={selectorInputs[dom.id] || ''}
                      onChange={(e) => setSelectorInputs((prev) => ({ ...prev, [dom.id]: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#00C8E8]"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs text-slate-400 mb-1">{t.domains.scheduleLabel}</label>
                    <select
                      value={scheduleInputs[dom.id] || 'manual'}
                      onChange={(e) =>
                        setScheduleInputs((prev) => ({
                          ...prev,
                          [dom.id]: e.target.value as 'manual' | 'weekly' | 'daily',
                        }))
                      }
                      className="w-full px-3 py-1.5 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00C8E8]"
                    >
                      <option value="manual">Manual only</option>
                      <option value="weekly" disabled={activeOrg?.plan === 'free'}>
                        Weekly (Essential+)
                      </option>
                      <option value="daily" disabled={activeOrg?.plan === 'free' || activeOrg?.plan === 'essential'}>
                        Daily (Pro+)
                      </option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSettings(dom)}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                    >
                      {t.domains.saveSelectors}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
