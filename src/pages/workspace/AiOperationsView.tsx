import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  Mail,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  AgentExecutionApiResponse,
  apiDownloadPdfReport,
  apiEvaluateInboundEmail,
  apiExecuteAgentJob,
  apiGetAgentStatus,
  apiRetryAgentJob,
} from '../../services/apiClient';
import { createServiceRequestRecord, persistAgentJobExecution } from '../../services/firestoreService';
import {
  AgentJobDoc,
  AgentJobStatus,
  AppLanguage,
  InboundEmailEvaluationResult,
  ServicePackageId,
} from '../../types/astasecure';

interface AiOperationsViewProps {
  onOpenDomains: () => void;
  onOpenScanDetail: (scanId: string) => void;
}

const SERVICE_PACKAGE_OPTIONS: { id: ServicePackageId; label: string; desc: string }[] = [
  {
    id: 'domain_assessment',
    label: 'Domain Security Assessment',
    desc: 'Full passive 8+1 DNS/TLS check, scoring, executive narrative & signed PDF.',
  },
  {
    id: 'email_security_review',
    label: 'Business Email Security Review',
    desc: 'Deep SPF/DKIM/DMARC/MX alignment triage with hosting-specific rollout steps.',
  },
  {
    id: 'dns_monitoring',
    label: 'DNS Security Monitoring Briefing',
    desc: 'Zone health, NS redundancy, SOA, DNSSEC & CAA compliance briefing.',
  },
  {
    id: 'remediation_advisory',
    label: 'Guided Remediation Advisory',
    desc: 'Prioritized copy-ready DNS fixes tailored to your detected registrar.',
  },
];

function StatusBadge({ status }: { status: AgentJobStatus }) {
  const styles: Record<AgentJobStatus, string> = {
    completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    degraded_retryable: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    waiting_for_customer: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    running: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    queued: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
    failed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  };
  const labels: Record<AgentJobStatus, string> = {
    completed: 'Completed',
    degraded_retryable: 'Degraded (Retryable)',
    waiting_for_customer: 'Waiting for Customer',
    running: 'Running',
    queued: 'Queued',
    failed: 'Blocked / Failed',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export const AiOperationsView: React.FC<AiOperationsViewProps> = ({
  onOpenDomains,
  onOpenScanDetail,
}) => {
  const { lang, t } = useLanguage();
  const { user, activeOrg, activeRole, domains, scans, agentJobs } = useAuth();

  const canWrite = activeRole === 'owner' || activeRole === 'admin';
  const verifiedDomains = domains.filter((d) => d.verificationStatus === 'verified');

  const [agentStatus, setAgentStatus] = useState<{
    ai: { provider: string; model: string; configured: boolean };
    channels: { emailConfigured: boolean; whatsappConfigured: boolean; contactRecipientEmail: string | null };
  } | null>(null);

  // Service Request form (empty user text fields by default)
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [servicePackage, setServicePackage] = useState<ServicePackageId>('domain_assessment');
  const [jobLanguage, setJobLanguage] = useState<AppLanguage>(lang);
  const [priority, setPriority] = useState<'standard' | 'urgent'>('standard');
  const [customerNotes, setCustomerNotes] = useState('');
  const [sendEmailReport, setSendEmailReport] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');

  const [executing, setExecuting] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [liveResponses, setLiveResponses] = useState<Record<string, AgentExecutionApiResponse>>({});

  // Inbound Email Safety Guard state (empty defaults)
  const [inboundSender, setInboundSender] = useState('');
  const [inboundSubject, setInboundSubject] = useState('');
  const [inboundBody, setInboundBody] = useState('');
  const [evaluatingInbound, setEvaluatingInbound] = useState(false);
  const [inboundResult, setInboundResult] = useState<InboundEmailEvaluationResult | null>(null);
  const [inboundError, setInboundError] = useState<string | null>(null);

  useEffect(() => {
    apiGetAgentStatus()
      .then(setAgentStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId((verifiedDomains[0] || domains[0]).id);
    }
  }, [domains, verifiedDomains, selectedDomainId]);

  useEffect(() => {
    if (!selectedJobId && agentJobs.length > 0) {
      setSelectedJobId(agentJobs[0].id);
    }
  }, [agentJobs, selectedJobId]);

  const handleLaunchOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeOrg || !canWrite) return;

    const targetDom = domains.find((d) => d.id === selectedDomainId);
    if (!targetDom) {
      setActionError('Select a target domain first.');
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setExecuting(true);

    try {
      const serviceRequestId = await createServiceRequestRecord({
        orgId: activeOrg.id,
        createdBy: user.uid,
        requesterEmail: user.email || '',
        domainId: targetDom.id,
        domain: targetDom.domain,
        servicePackage,
        language: jobLanguage,
        priority,
        customerNotes,
        memberUids: activeOrg.memberUids,
      });

      const effectiveNotifyEmail = notifyEmail.trim() || activeOrg.alertEmail || user.email || '';
      const result = await apiExecuteAgentJob({
        serviceRequestId,
        orgId: activeOrg.id,
        orgName: activeOrg.name,
        actorRole: activeRole,
        domainId: targetDom.id,
        domain: targetDom.domain,
        verificationToken: targetDom.verificationToken,
        tokenExpiresAt: targetDom.tokenExpiresAt,
        ownershipProof: targetDom.ownershipProof,
        dkimSelectors: targetDom.dkimSelectors,
        servicePackage,
        language: jobLanguage,
        priority,
        customerNotes,
        notifyEmail: sendEmailReport ? effectiveNotifyEmail : undefined,
        sendEmailReport,
      });

      await persistAgentJobExecution({
        orgId: activeOrg.id,
        serviceRequestId,
        domainId: targetDom.id,
        domain: targetDom.domain,
        servicePackage,
        language: jobLanguage,
        actorUid: user.uid,
        actorEmail: user.email || '',
        memberUids: activeOrg.memberUids,
        result,
      });

      setLiveResponses((prev) => ({ ...prev, [result.jobId]: result }));
      setSelectedJobId(result.jobId);
      setCustomerNotes('');
      setActionNotice(
        result.status === 'completed'
          ? `AI Operations Job ${result.jobId} completed cleanly for ${targetDom.domain}.`
          : `Job ${result.jobId} finished with status "${result.status}": ${result.aiDegradedReason || result.policySummary}`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to execute AI Operations Job.');
    } finally {
      setExecuting(false);
    }
  };

  const handleRetryJob = async (job: AgentJobDoc) => {
    if (!user || !activeOrg || !canWrite) return;
    setActionError(null);
    setActionNotice(null);
    setRetryingJobId(job.id);
    try {
      const result = await apiRetryAgentJob(job.id);
      await persistAgentJobExecution({
        orgId: activeOrg.id,
        serviceRequestId: job.serviceRequestId,
        domainId: job.domainId,
        domain: job.domain,
        servicePackage: job.servicePackage,
        language: job.language,
        actorUid: user.uid,
        actorEmail: user.email || '',
        memberUids: activeOrg.memberUids,
        result,
      });
      setLiveResponses((prev) => ({ ...prev, [result.jobId]: result }));
      setSelectedJobId(result.jobId);
      setActionNotice(`Retry #${result.attempts} completed with status "${result.status}".`);
    } catch (err) {
      // Fallback: if server runtime queue reset after restart, re-submit using persisted domain record
      const targetDom = domains.find((d) => d.id === job.domainId);
      if (targetDom) {
        try {
          const result = await apiExecuteAgentJob({
            jobId: job.id,
            serviceRequestId: job.serviceRequestId,
            orgId: activeOrg.id,
            orgName: activeOrg.name,
            actorRole: activeRole,
            domainId: targetDom.id,
            domain: targetDom.domain,
            verificationToken: targetDom.verificationToken,
            tokenExpiresAt: targetDom.tokenExpiresAt,
            ownershipProof: targetDom.ownershipProof,
            dkimSelectors: targetDom.dkimSelectors,
            servicePackage: job.servicePackage,
            language: job.language,
            priority: 'standard',
            customerNotes: '',
            sendEmailReport: false,
          });
          await persistAgentJobExecution({
            orgId: activeOrg.id,
            serviceRequestId: job.serviceRequestId,
            domainId: targetDom.id,
            domain: targetDom.domain,
            servicePackage: job.servicePackage,
            language: job.language,
            actorUid: user.uid,
            actorEmail: user.email || '',
            memberUids: activeOrg.memberUids,
            result,
          });
          setLiveResponses((prev) => ({ ...prev, [result.jobId]: result }));
          setActionNotice(`Re-executed job ${result.jobId} with status "${result.status}".`);
          return;
        } catch (innerErr) {
          setActionError(innerErr instanceof Error ? innerErr.message : 'Retry failed.');
          return;
        }
      }
      setActionError(err instanceof Error ? err.message : 'Retry failed.');
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleDownloadJobPdf = async (job: AgentJobDoc) => {
    const live = liveResponses[job.id];
    if (live?.reportPdfBase64) {
      const byteString = atob(live.reportPdfBase64);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i += 1) {
        bytes[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AstaSecure-${job.domain}-${live.reportLanguage || 'en'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }

    const linkedScan = job.scanId ? scans.find((s) => s.id === job.scanId) : scans.find((s) => s.domainId === job.domainId);
    if (!linkedScan) {
      setActionError('No linked scan found for PDF generation.');
      return;
    }
    try {
      await apiDownloadPdfReport({
        organizationName: activeOrg?.name || 'Organization',
        language: job.language === 'fr' ? 'fr' : 'en',
        scan: linkedScan,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'PDF download failed.');
    }
  };

  const handleEvaluateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setInboundError(null);
    setEvaluatingInbound(true);
    try {
      const res = await apiEvaluateInboundEmail({
        senderEmail: inboundSender,
        subject: inboundSubject,
        body: inboundBody,
        knownOrgDomains: domains.map((d) => d.domain),
      });
      setInboundResult(res);
    } catch (err) {
      setInboundError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setEvaluatingInbound(false);
    }
  };

  const activeJob: AgentJobDoc | null =
    agentJobs.find((j) => j.id === selectedJobId) || agentJobs[0] || null;
  const activeLive = activeJob ? liveResponses[activeJob.id] : undefined;

  return (
    <div className="space-y-6">
      {/* Header + Live Provider Status */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#22D3EE] mb-1">
            <Bot className="w-4 h-4" />
            <span>Policy-Guarded Autonomous Operations</span>
          </div>
          <h1 className="text-xl font-bold text-white">{t.aiOps.title}</h1>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.aiOps.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#0D1628] border border-slate-800 rounded-lg px-3.5 py-2 text-xs space-y-0.5">
            <div className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#00C8E8]" />
              <span>AI Engine ({agentStatus?.ai.model || 'gemini-4-hydrogen'})</span>
            </div>
            <div className={agentStatus?.ai.configured ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'}>
              {agentStatus
                ? agentStatus.ai.configured
                  ? 'Configured & Ready'
                  : 'Unconfigured (Deterministic Fallback Active)'
                : 'Checking...'}
            </div>
          </div>

          <div className="bg-[#0D1628] border border-slate-800 rounded-lg px-3.5 py-2 text-xs space-y-0.5">
            <div className="text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#00C8E8]" />
              <span>SMTP Dispatch</span>
            </div>
            <div className={agentStatus?.channels.emailConfigured ? 'text-emerald-400 font-semibold' : 'text-slate-300 font-semibold'}>
              {agentStatus
                ? agentStatus.channels.emailConfigured
                  ? 'Active'
                  : 'Not Configured (In-App Tracking Active)'
                : 'Checking...'}
            </div>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">
          {actionNotice}
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Launch Form + Guardrails */}
      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleLaunchOperation}
          className="lg:col-span-7 bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white">{t.aiOps.newRequestHeading}</h2>
            {!canWrite && (
              <span className="text-xs text-amber-300">Read-only member role blocked by Policy Engine</span>
            )}
          </div>

          {domains.length === 0 ? (
            <div className="p-4 bg-[#060B14] border border-slate-800 rounded-lg text-xs text-slate-300 space-y-3">
              <p>Add and verify at least one domain before launching an AI Operations workflow.</p>
              <button
                type="button"
                onClick={onOpenDomains}
                className="px-3.5 py-2 bg-[#00C8E8] text-[#060B14] font-semibold rounded-lg cursor-pointer"
              >
                Go to Domains & Ownership Verification
              </button>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.aiOps.domainLabel}
                  </label>
                  <select
                    value={selectedDomainId}
                    onChange={(e) => setSelectedDomainId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00C8E8]"
                  >
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.domain} ({d.verificationStatus})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.aiOps.packageLabel}
                  </label>
                  <select
                    value={servicePackage}
                    onChange={(e) => setServicePackage(e.target.value as ServicePackageId)}
                    className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00C8E8]"
                  >
                    {SERVICE_PACKAGE_OPTIONS.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Report / Narrative Language</label>
                  <select
                    value={jobLanguage}
                    onChange={(e) => setJobLanguage(e.target.value as AppLanguage)}
                    className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00C8E8]"
                  >
                    <option value="en">English (EN)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="ar">العربية (AR narrative + EN PDF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.aiOps.priorityLabel}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'standard' | 'urgent')}
                    className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00C8E8]"
                  >
                    <option value="standard">Standard</option>
                    <option value="urgent">Urgent Triage</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.aiOps.notesLabel}
                </label>
                <textarea
                  rows={2}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder={t.aiOps.notesPlaceholder}
                  className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmailReport}
                    onChange={(e) => setSendEmailReport(e.target.checked)}
                    className="accent-[#00C8E8]"
                  />
                  <span>{t.aiOps.emailReportToggle}</span>
                </label>
                {sendEmailReport && (
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder={activeOrg?.alertEmail || user?.email || 'security@company.tn'}
                    className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
                  />
                )}
              </div>

              <div className="pt-2 flex items-center justify-between gap-4">
                <span className="text-[11px] text-slate-400">
                  {SERVICE_PACKAGE_OPTIONS.find((p) => p.id === servicePackage)?.desc}
                </span>
                <button
                  type="submit"
                  disabled={executing || !canWrite}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-xs rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  {executing ? t.aiOps.runningBtn : t.aiOps.launchBtn}
                </button>
              </div>
            </>
          )}
        </form>

        {/* Policy Enforcement Summary Card */}
        <div className="lg:col-span-5 bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-[#00C8E8]" />
            <span>Active Agent Policy Guardrails</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Allowlisted passive tools only: domain scope check, dual-resolver TXT verification, passive DNS/TLS scan, remediation guide, PDF report, and optional email notice.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Prohibited actions blocked server-side: DNS modification, cross-tenant export, port scanning, exploitation, and environment secret access.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Untrusted text inputs & inbound emails are scanned for prompt injection before planning.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Zero-fabrication rule: if the Gemini API key or quota is unavailable, jobs mark <strong>degraded_retryable</strong> without inventing AI narratives.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Job Queue + Inspector */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-[#0D1628] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">AI Operations Jobs ({agentJobs.length})</h2>
          </div>
          {agentJobs.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              No AI Operations jobs executed yet for this organization.
            </p>
          ) : (
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {agentJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-colors cursor-pointer space-y-1.5 ${
                    activeJob?.id === job.id
                      ? 'bg-[#101D35] border-[#00C8E8]/50'
                      : 'bg-[#060B14] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">{job.domain}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="capitalize">{job.servicePackage.replace(/_/g, ' ')}</span>
                    <span className="font-mono">
                      {typeof job.score === 'number' ? `${job.score}/100` : '--'} · Attempt {job.attempts}/{job.maxAttempts}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-5">
          {!activeJob ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Launch a security operation or select an existing job to inspect step logs, tool calls, AI reasoning, and artifacts.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-white">{activeJob.domain}</h3>
                    <StatusBadge status={activeJob.status} />
                    <span className="text-xs font-mono text-slate-400">{activeJob.id}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{activeJob.policySummary}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(activeJob.status === 'degraded_retryable' || activeJob.status === 'failed') &&
                    activeJob.attempts < activeJob.maxAttempts &&
                    canWrite && (
                      <button
                        type="button"
                        disabled={retryingJobId === activeJob.id}
                        onClick={() => handleRetryJob(activeJob)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${retryingJobId === activeJob.id ? 'animate-spin' : ''}`} />
                        {t.aiOps.retryBtn}
                      </button>
                    )}

                  {activeJob.scanId && (
                    <button
                      type="button"
                      onClick={() => onOpenScanDetail(activeJob.scanId!)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                    >
                      Inspect Scan Evidence
                    </button>
                  )}

                  {(activeLive?.reportPdfBase64 || activeJob.scanId) && (
                    <button
                      type="button"
                      onClick={() => handleDownloadJobPdf(activeJob)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                  )}
                </div>
              </div>

              {/* AI Provider Outcome / Narrative */}
              {activeJob.aiProviderAvailable && activeJob.executiveNarrative ? (
                <div className="bg-[#060B14] border border-[#00C8E8]/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#22D3EE]">
                      AI Risk Synthesis ({activeJob.aiModel})
                    </span>
                    {activeJob.aiClassification && (
                      <span className="font-mono text-slate-300">{activeJob.aiClassification}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                    {activeJob.executiveNarrative}
                  </p>
                  {activeJob.prioritizedActions && activeJob.prioritizedActions.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400">Prioritized Actions:</div>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {activeJob.prioritizedActions.map((act, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Wrench className="w-3.5 h-3.5 text-[#00C8E8] shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-xs text-amber-200 space-y-1">
                  <div className="font-semibold">
                    AI Reasoning Unavailable — Deterministic Checks Preserved
                  </div>
                  <p className="text-amber-200/80">
                    {activeJob.aiDegradedReason ||
                      activeJob.errorMessage ||
                      'Live AI provider was not configured or reachable during this execution.'}
                  </p>
                </div>
              )}

              {/* Email Delivery & SHA-256 Metadata */}
              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#060B14] border border-slate-800 rounded-lg p-3.5 space-y-1">
                  <div className="text-slate-400">Email Notification Outcome</div>
                  <div className="font-semibold text-white capitalize">
                    {activeJob.emailDeliveryStatus || 'skipped'}
                  </div>
                  <div className="text-slate-400">{activeJob.emailDeliveryDetail || 'Not requested'}</div>
                </div>
                <div className="bg-[#060B14] border border-slate-800 rounded-lg p-3.5 space-y-1">
                  <div className="text-slate-400">Signed PDF SHA-256</div>
                  <div className="font-mono text-slate-200 break-all text-[11px]">
                    {activeJob.reportSha256 || 'Pending scan completion'}
                  </div>
                </div>
              </div>

              {/* Execution Step Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00C8E8]" />
                  Execution Step Timeline
                </h4>
                <div className="space-y-2">
                  {activeJob.steps.map((step) => (
                    <div
                      key={step.stepId}
                      className="flex items-start justify-between gap-3 bg-[#060B14] border border-slate-800/80 rounded-lg px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        {step.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : step.status === 'failed' || step.status === 'blocked' ? (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-white">{step.title}</div>
                          <div className="text-slate-400">{step.detail}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 capitalize shrink-0">
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tool-Call Audit Log */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#00C8E8]" />
                  Audited Tool Calls ({activeJob.toolCalls.length})
                </h4>
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#060B14] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Tool</th>
                        <th className="py-2 px-3">Policy</th>
                        <th className="py-2 px-3">Duration</th>
                        <th className="py-2 px-3">Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {activeJob.toolCalls.map((tc) => (
                        <tr key={tc.callId}>
                          <td className="py-2 px-3 font-mono text-[#22D3EE] whitespace-nowrap">{tc.toolName}</td>
                          <td className={`py-2 px-3 font-semibold whitespace-nowrap ${tc.allowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tc.policyDecision}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">{tc.durationMs}ms</td>
                          <td className="py-2 px-3 text-slate-300">{tc.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inbound Email Triage & Prompt-Injection Guard */}
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldAlert className="w-4 h-4 text-[#00C8E8]" />
            <span>{t.aiOps.inboundHeading}</span>
          </div>
          <p className="text-xs text-slate-400">{t.aiOps.inboundSub}</p>
        </div>

        <form onSubmit={handleEvaluateInbound} className="grid lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-5 space-y-3">
            <input
              type="email"
              required
              value={inboundSender}
              onChange={(e) => setInboundSender(e.target.value)}
              placeholder={t.aiOps.inboundSenderPlaceholder}
              className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
            />
            <input
              type="text"
              required
              value={inboundSubject}
              onChange={(e) => setInboundSubject(e.target.value)}
              placeholder={t.aiOps.inboundSubjectPlaceholder}
              className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
            />
            <textarea
              required
              rows={3}
              value={inboundBody}
              onChange={(e) => setInboundBody(e.target.value)}
              placeholder={t.aiOps.inboundBodyPlaceholder}
              className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
            />
            <button
              type="submit"
              disabled={evaluatingInbound}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg cursor-pointer disabled:opacity-50"
            >
              {evaluatingInbound ? 'Inspecting...' : t.aiOps.evaluateBtn}
            </button>
          </div>

          <div className="lg:col-span-7 bg-[#060B14] border border-slate-800 rounded-lg p-4 min-h-[180px] text-xs space-y-3">
            {inboundError && <p className="text-rose-300">{inboundError}</p>}
            {!inboundResult && !inboundError && (
              <p className="text-slate-500 py-10 text-center">
                Submit an inbound message to test sanitization, secret-probing defense, and mandatory human-review gating.
              </p>
            )}
            {inboundResult && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <span className="font-semibold text-white">
                    Recommended Action: <span className="font-mono text-[#22D3EE]">{inboundResult.recommendedAction}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                      inboundResult.safeToRoute
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {inboundResult.safeToRoute ? 'Safe to Route' : 'Quarantined / Blocked'}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="text-slate-300">
                    Prompt Injection Detected:{' '}
                    <strong className={inboundResult.promptInjectionDetected ? 'text-rose-400' : 'text-emerald-400'}>
                      {inboundResult.promptInjectionDetected ? 'Yes' : 'No'}
                    </strong>
                  </div>
                  <div className="text-slate-300">
                    Requires Human Review:{' '}
                    <strong className={inboundResult.requiresHumanReview ? 'text-amber-300' : 'text-emerald-400'}>
                      {inboundResult.requiresHumanReview ? 'Mandatory' : 'No'}
                    </strong>
                  </div>
                </div>
                {inboundResult.riskFlags.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-rose-300">Detected Risk Flags:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {inboundResult.riskFlags.map((flag) => (
                        <span key={flag} className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 rounded text-[11px] font-mono text-rose-300">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Sanitized Payload Summary:</div>
                  <p className="text-slate-300 bg-[#0D1628] border border-slate-800 rounded p-2.5 leading-relaxed">
                    {inboundResult.sanitizedSummary}
                  </p>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
