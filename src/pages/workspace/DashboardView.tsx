import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  Circle,
  Globe,
  Play,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckStatusLabel, SeverityText } from '../../components/StatusIndicators';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CheckId, DnsCheckResult, DnsProviderId, MonitoredDomainDoc } from '../../types/astasecure';

interface DashboardViewProps {
  selectedDomainId: string | null;
  onSelectDomain: (domainId: string) => void;
  onRunScan: (domain: MonitoredDomainDoc) => Promise<void>;
  scanningDomainId: string | null;
  onOpenDomains: () => void;
  onOpenFix: (domainId: string, checkId: CheckId, provider: DnsProviderId) => void;
  onOpenScanDetail: (scanId: string) => void;
  onOpenAiOps?: () => void;
  onOpenNotifications?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedDomainId,
  onSelectDomain,
  onRunScan,
  scanningDomainId,
  onOpenDomains,
  onOpenFix,
  onOpenScanDetail,
  onOpenAiOps,
  onOpenNotifications,
}) => {
  const { t } = useLanguage();
  const {
    domains,
    scans,
    auditLogs,
    agentJobs,
    reports,
    unreadNotificationsCount,
    emailVerified,
    activeRole,
  } = useAuth();

  const canWrite = activeRole === 'owner' || activeRole === 'admin';
  const verifiedDomains = domains.filter((d) => d.verificationStatus === 'verified');
  const activeDomain =
    domains.find((d) => d.id === selectedDomainId) || verifiedDomains[0] || domains[0] || null;

  const domainScans = activeDomain ? scans.filter((s) => s.domainId === activeDomain.id) : [];
  const latestScan = domainScans[0] || null;

  const avgScore =
    verifiedDomains.filter((d) => typeof d.lastScore === 'number').length > 0
      ? Math.round(
          verifiedDomains
            .filter((d) => typeof d.lastScore === 'number')
            .reduce((acc, d) => acc + (d.lastScore || 0), 0) /
            verifiedDomains.filter((d) => typeof d.lastScore === 'number').length
        )
      : latestScan?.score ?? null;

  const currentScore = latestScan ? latestScan.score : avgScore;
  const riskPoints = currentScore !== null ? 100 - currentScore : null;

  // Severity counts across latest scan
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  if (latestScan) {
    for (const c of latestScan.checks) {
      if (c.pointsRemoved > 0 && c.severity !== 'none') {
        severityCounts[c.severity] += 1;
      }
    }
  }

  // Priority action (highest severity deduction)
  const priorityCheck: DnsCheckResult | null = latestScan
    ? [...latestScan.checks]
        .filter((c) => c.pointsRemoved > 0)
        .sort((a, b) => b.pointsRemoved - a.pointsRemoved)[0] || null
    : null;

  const trendData = [...domainScans]
    .slice(0, 12)
    .reverse()
    .map((s) => ({
      date: new Date(s.scannedAtIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: s.score,
    }));

  const dmarcStage = latestScan?.dmarcStage || 'missing';
  const dmarcStepIndex =
    dmarcStage === 'p_reject' ? 4 : dmarcStage === 'p_quarantine' ? 3 : dmarcStage === 'p_none' ? 2 : 1;

  if (domains.length === 0) {
    return (
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-10 text-center space-y-4">
        <Globe className="w-10 h-10 text-[#00C8E8] mx-auto" />
        <h2 className="text-xl font-bold text-white">{t.dashboard.noVerifiedDomain}</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Add your domain, verify DNS TXT ownership across two public resolvers, and receive your evidence-based posture score.
        </p>
        {canWrite && (
          <button
            type="button"
            onClick={onOpenDomains}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg cursor-pointer"
          >
            <span>{t.dashboard.addFirstDomain}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const onboardingSteps = [
    { label: t.onboarding.stepAccount, done: emailVerified },
    { label: t.onboarding.stepDomain, done: domains.length > 0 },
    { label: t.onboarding.stepOwnership, done: verifiedDomains.length > 0 },
    { label: t.onboarding.stepScan, done: scans.length > 0 },
    { label: t.onboarding.stepReport, done: agentJobs.length > 0 || reports.length > 0 },
  ];
  const onboardingDoneCount = onboardingSteps.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      {/* Onboarding Checklist & Live Operations Strip */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-[#0D1628] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-white">{t.onboarding.heading}</span>
            <span className="font-mono text-[#22D3EE] tabular-nums">
              {onboardingDoneCount}/{onboardingSteps.length} Complete
            </span>
          </div>
          <div className="grid sm:grid-cols-5 gap-2">
            {onboardingSteps.map((step) => (
              <div
                key={step.label}
                className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                  step.done
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-[#060B14] border-slate-800 text-slate-400'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#0D1628] border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#00C8E8]" />
              {t.appNav.aiOps}
            </span>
            <span className="font-mono text-slate-300 tabular-nums">{agentJobs.length} job(s)</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenAiOps && (
              <button
                type="button"
                onClick={onOpenAiOps}
                className="flex-1 py-2 px-3 bg-[#101D35] hover:bg-[#152544] border border-[#00C8E8]/30 text-[#22D3EE] text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
              >
                Open AI Ops
              </button>
            )}
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="inline-flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Bell className="w-3.5 h-3.5 text-[#00C8E8]" />
                <span>{unreadNotificationsCount}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Domain Selector & Run Scan Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0D1628] border border-slate-800 rounded-xl px-5 py-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="dash-domain-select" className="text-xs font-medium text-slate-400">
            Monitored Domain:
          </label>
          <select
            id="dash-domain-select"
            value={activeDomain?.id || ''}
            onChange={(e) => onSelectDomain(e.target.value)}
            className="bg-[#060B14] border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus:border-[#00C8E8]"
          >
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.domain} ({d.verificationStatus})
              </option>
            ))}
          </select>
          {activeDomain && (
            <span className="text-xs text-slate-400">
              {activeDomain.verificationStatus === 'verified' ? t.statuses.verified : t.statuses.pending}
              {latestScan ? ` · Last scanned ${new Date(latestScan.scannedAtIso).toLocaleString()}` : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {activeDomain?.verificationStatus === 'verified' && canWrite ? (
            <button
              type="button"
              disabled={scanningDomainId === activeDomain.id}
              onClick={() => onRunScan(activeDomain)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-xs rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              {scanningDomainId === activeDomain.id ? t.dashboard.scanning : t.dashboard.runScan}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenDomains}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg cursor-pointer whitespace-nowrap"
            >
              Verify Ownership First
            </button>
          )}
        </div>
      </div>

      {/* Top Row: Protection Banner + Priority Action */}
      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-[#101D35] border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-28 h-28 rounded-full border-4 border-[#00C8E8]/30 bg-[#060B14] flex flex-col items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-white tabular-nums">
              {currentScore !== null ? currentScore : '--'}
            </span>
            <span className="text-xs text-slate-400">out of 100</span>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#22D3EE]">
              {currentScore === null
                ? 'Awaiting First Verified Scan'
                : currentScore >= 85
                  ? 'Strong Protection Posture'
                  : currentScore >= 60
                    ? 'Moderate Protection — Action Recommended'
                    : 'Exposed to Domain Spoofing'}
            </div>
            <h2 className="text-lg font-bold text-white">
              {latestScan
                ? priorityCheck
                  ? `${activeDomain?.domain}: ${priorityCheck.summary}`
                  : `${activeDomain?.domain} has zero active point deductions.`
                : `Verify ${activeDomain?.domain} and run a scan to compute its real posture score.`}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 tabular-nums pt-1">
              <span>{t.dashboard.riskPoints}: {riskPoints !== null ? riskPoints : '--'}</span>
              <span>/</span>
              <span>{t.dashboard.totalDomains}: {domains.length}</span>
              <span>/</span>
              <span>{t.dashboard.verifiedDomains}: {verifiedDomains.length}</span>
              <span>/</span>
              <span>{t.dashboard.totalScans}: {scans.length}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#0D1628] border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
          {priorityCheck && activeDomain ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-rose-400 inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t.dashboard.priorityAction}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 tabular-nums">
                    Gain +{priorityCheck.pointsRemoved} pts
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{priorityCheck.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{priorityCheck.recommendedAction}</p>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  Host: <strong className="text-slate-200">{latestScan?.detectedProviderLabel}</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onOpenFix(activeDomain.id, priorityCheck.id, latestScan?.detectedProvider || 'generic')
                  }
                  className="px-4 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-xs rounded-lg cursor-pointer whitespace-nowrap"
                >
                  {t.dashboard.fixNow}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col justify-center h-full space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <ShieldCheck className="w-5 h-5" />
                <span>{latestScan ? 'No Priority Deductions' : 'Ready to Scan'}</span>
              </div>
              <p className="text-xs text-slate-400">
                {latestScan
                  ? 'All evaluated checks are currently compliant. Review individual evidence records below.'
                  : 'Once domain TXT ownership is verified, run your first scan to populate priority recommendations.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Severity Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Critical', count: severityCounts.critical, color: 'text-rose-400' },
          { label: 'High', count: severityCounts.high, color: 'text-orange-400' },
          { label: 'Medium', count: severityCounts.medium, color: 'text-amber-400' },
          { label: 'Low', count: severityCounts.low, color: 'text-slate-300' },
        ].map((item) => (
          <div key={item.label} className="bg-[#0D1628] border border-slate-800 rounded-xl px-5 py-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">{item.label}</span>
            <span className={`text-xl font-bold tabular-nums ${item.color}`}>{item.count}</span>
          </div>
        ))}
      </div>

      {/* 8+1 Protection Cards */}
      {latestScan && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">{t.dashboard.yourProtections}</h3>
            <button
              type="button"
              onClick={() => onOpenScanDetail(latestScan.id)}
              className="text-xs text-[#22D3EE] hover:underline cursor-pointer"
            >
              Inspect Full Technical Evidence
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestScan.checks.map((check) => (
              <div
                key={check.id}
                className="bg-[#0D1628] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-white">{check.name}</h4>
                    <CheckStatusLabel status={check.status} severity={check.severity} />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{check.summary}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
                  <SeverityText severity={check.severity} />
                  {check.pointsRemoved > 0 && activeDomain && check.id !== 'tls' && (
                    <button
                      type="button"
                      onClick={() => onOpenFix(activeDomain.id, check.id, latestScan.detectedProvider)}
                      className="text-xs font-medium text-[#22D3EE] hover:underline cursor-pointer"
                    >
                      Fix Guide
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Row: Score Trend Chart, DMARC Journey, Recent Activity */}
      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-[#0D1628] border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">{t.dashboard.scoreTrend}</h3>
          {trendData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="scoreCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C8E8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#00C8E8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A1120',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#00C8E8" strokeWidth={2} fill="url(#scoreCyan)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-12 text-center">
              Run at least one verified scan to record historical score progression.
            </p>
          )}
        </div>

        <div className="lg:col-span-3 bg-[#0D1628] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">{t.dashboard.dmarcJourney}</h3>
          <div className="space-y-3">
            {[
              { step: 1, label: 'Publish p=none', desc: 'Safe monitoring mode' },
              { step: 2, label: 'Observe rua reports', desc: 'Verify legitimate senders' },
              { step: 3, label: 'Move to p=quarantine', desc: 'Filter spoofed emails' },
              { step: 4, label: 'Enforce p=reject', desc: 'Block direct spoofing' },
            ].map((item) => {
              const reached = dmarcStepIndex >= item.step && dmarcStage !== 'missing';
              return (
                <div key={item.step} className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      reached ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {reached ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.step}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#0D1628] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00C8E8]" />
            <h3 className="text-sm font-bold text-white">{t.dashboard.recentActivity}</h3>
          </div>
          <div className="space-y-2.5 max-h-52 overflow-y-auto">
            {auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="text-xs border-b border-slate-800/70 pb-2 last:border-0">
                <div className="font-medium text-slate-200">{log.action}</div>
                <div className="text-slate-400 truncate">
                  {log.target} · {log.actorEmail}
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <p className="text-xs text-slate-500">No recorded activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
