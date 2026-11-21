import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, RefreshCw, Send, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiGetRemediationGuide, apiRecheckSingleCheck } from '../../services/apiClient';
import {
  CheckId,
  DnsCheckResult,
  DnsProviderId,
  RemediationGuidePayload,
} from '../../types/astasecure';

interface RemediationViewProps {
  initialDomainId?: string | null;
  initialCheckId?: CheckId;
  initialProvider?: DnsProviderId;
  onFullRescanRequested: (domainId: string) => Promise<void>;
}

const PROVIDERS: { id: DnsProviderId; label: string }[] = [
  { id: 'cloudflare', label: 'Cloudflare' },
  { id: 'ovhcloud', label: 'OVHcloud' },
  { id: 'godaddy', label: 'GoDaddy' },
  { id: 'aws_route53', label: 'AWS Route 53' },
  { id: 'azure_dns', label: 'Microsoft Azure DNS' },
  { id: 'namecheap', label: 'Namecheap' },
  { id: 'gandi', label: 'Gandi' },
  { id: 'ionos', label: 'IONOS' },
  { id: 'hostinger', label: 'Hostinger' },
  { id: 'generic', label: 'Generic DNS / cPanel' },
];

const CHECK_OPTIONS: { id: Exclude<CheckId, 'tls'>; label: string }[] = [
  { id: 'dmarc', label: 'Anti-Spoofing (DMARC)' },
  { id: 'spf', label: 'Authorized Senders (SPF)' },
  { id: 'dkim', label: 'Email Signature (DKIM)' },
  { id: 'mx', label: 'Mail Servers (MX)' },
  { id: 'dnssec', label: 'DNS Integrity (DNSSEC)' },
  { id: 'caa', label: 'Certificate Issuers (CAA)' },
  { id: 'ns', label: 'Nameservers (NS)' },
  { id: 'soa', label: 'Zone Authority (SOA)' },
];

export const RemediationView: React.FC<RemediationViewProps> = ({
  initialDomainId,
  initialCheckId = 'dmarc',
  initialProvider,
  onFullRescanRequested,
}) => {
  const { lang, t } = useLanguage();
  const { activeOrg, activeRole, domains, scans } = useAuth();
  const verifiedDomains = domains.filter((d) => d.verificationStatus === 'verified');
  const [domainId, setDomainId] = useState(
    initialDomainId || verifiedDomains[0]?.id || domains[0]?.id || ''
  );
  const selectedDomain = domains.find((d) => d.id === domainId) || domains[0] || null;
  const latestScan = selectedDomain ? scans.find((s) => s.domainId === selectedDomain.id) : undefined;

  const [checkId, setCheckId] = useState<Exclude<CheckId, 'tls'>>(
    initialCheckId === 'tls' ? 'caa' : initialCheckId
  );
  const [provider, setProvider] = useState<DnsProviderId>(
    initialProvider || selectedDomain?.detectedProvider || 'generic'
  );
  const [guide, setGuide] = useState<RemediationGuidePayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedIt, setCopiedIt] = useState(false);
  const [recheckBusy, setRecheckBusy] = useState(false);
  const [recheckResult, setRecheckResult] = useState<DnsCheckResult | null>(null);
  const [recheckErr, setRecheckErr] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDomain?.detectedProvider && !initialProvider) {
      setProvider(selectedDomain.detectedProvider);
    }
  }, [selectedDomain?.id]);

  useEffect(() => {
    if (!selectedDomain) return;
    const matchedCheck = latestScan?.checks.find((c) => c.id === checkId);
    apiGetRemediationGuide({
      domain: selectedDomain.domain,
      checkId,
      provider,
      lang,
      customProposedRecord: matchedCheck?.proposedRecord,
    })
      .then(setGuide)
      .catch(() => {});
  }, [selectedDomain?.domain, checkId, provider, lang, latestScan?.id]);

  const handleCopyRecord = async () => {
    if (!guide) return;
    await navigator.clipboard.writeText(guide.requiredRecord.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyForIt = async () => {
    if (!guide || !selectedDomain) return;
    const text = [
      `AstaSecure Monitor Guided Fix — ${selectedDomain.domain}`,
      `Issue: ${guide.title}`,
      `Provider: ${guide.providerLabel}`,
      `Record Type: ${guide.requiredRecord.type}`,
      `Host / Name: ${guide.requiredRecord.name}`,
      `Value: ${guide.requiredRecord.value}`,
      `TTL: ${guide.requiredRecord.ttl}`,
      '',
      'Steps:',
      ...guide.steps.map((s, i) => `${i + 1}. ${s}`),
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedIt(true);
    setTimeout(() => setCopiedIt(false), 2000);
  };

  const handleRecheck = async () => {
    if (!activeOrg || !selectedDomain || !selectedDomain.ownershipProof) {
      setRecheckErr('Domain ownership must be verified before running live re-checks.');
      return;
    }
    setRecheckBusy(true);
    setRecheckErr(null);
    try {
      const liveCheck = await apiRecheckSingleCheck({
        orgId: activeOrg.id,
        domain: selectedDomain.domain,
        checkId,
        verificationToken: selectedDomain.verificationToken,
        ownershipProof: selectedDomain.ownershipProof,
        dkimSelectors: selectedDomain.dkimSelectors,
      });
      setRecheckResult(liveCheck);
      // If resolved or changed, run authoritative full scan to recompute and sign score
      if (activeRole === 'owner' || activeRole === 'admin') {
        await onFullRescanRequested(selectedDomain.id);
      }
    } catch (err) {
      setRecheckErr(err instanceof Error ? err.message : 'Re-check failed.');
    } finally {
      setRecheckBusy(false);
    }
  };

  if (!selectedDomain) {
    return (
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-400">
        Add and verify a domain first to access personalized remediation guides.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{t.remediation.title}</h1>
        <p className="text-xs text-slate-400 mt-1">{t.remediation.subtitle}</p>
      </div>

      {/* Selectors Bar */}
      <div className="grid sm:grid-cols-3 gap-4 bg-[#0D1628] border border-slate-800 rounded-xl p-5">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Domain</label>
          <select
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
          >
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.domain}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t.remediation.selectCheck}</label>
          <select
            value={checkId}
            onChange={(e) => setCheckId(e.target.value as Exclude<CheckId, 'tls'>)}
            className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
          >
            {CHECK_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t.remediation.selectProvider}</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as DnsProviderId)}
            className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {guide && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-5">
              <div>
                <div className="text-xs text-[#22D3EE] font-medium">{guide.providerLabel}</div>
                <h2 className="text-lg font-bold text-white mt-0.5">{guide.title}</h2>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-300">{t.remediation.problem}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{guide.problemSummary}</p>
              </div>

              {/* Copy-Ready DNS Record */}
              <div className="bg-[#060B14] border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{t.remediation.recordToAdd}</span>
                  <button
                    type="button"
                    onClick={handleCopyRecord}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? t.remediation.copied : t.remediation.copyRecord}
                  </button>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <div className="text-slate-500">Type</div>
                    <div className="text-white mt-0.5">{guide.requiredRecord.type}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Name / Host</div>
                    <div className="text-white mt-0.5">{guide.requiredRecord.name}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">TTL</div>
                    <div className="text-white mt-0.5">{guide.requiredRecord.ttl}</div>
                  </div>
                </div>
                <div className="text-xs font-mono text-[#22D3EE] bg-[#0D1628] border border-slate-800 rounded p-2.5 break-all">
                  {guide.requiredRecord.value}
                </div>
              </div>

              {/* Provider Steps */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-white">{t.remediation.stepsHeading}</h3>
                <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
                  {guide.steps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCopyForIt}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {copiedIt ? t.remediation.copied : t.remediation.sendToIt}
                </button>
                <button
                  type="button"
                  disabled={recheckBusy || selectedDomain.verificationStatus !== 'verified'}
                  onClick={handleRecheck}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-xs rounded-lg cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${recheckBusy ? 'animate-spin' : ''}`} />
                  {t.remediation.recheckBtn}
                </button>
              </div>

              {recheckErr && <p className="text-xs text-rose-400">{recheckErr}</p>}

              {recheckResult && (
                <div className="p-4 bg-[#060B14] border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold">
                    {recheckResult.pointsRemoved === 0 && recheckResult.status === 'confirmed' ? (
                      <span className="text-emerald-400 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Live DNS Re-check Confirmed
                      </span>
                    ) : (
                      <span className="text-amber-300 inline-flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        Not Yet Resolved ({recheckResult.status})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300">{recheckResult.summary}</p>
                  <div className="font-mono text-slate-400">
                    Observed ({recheckResult.evidence.resolver}):{' '}
                    {recheckResult.evidence.rawRecords.length > 0
                      ? recheckResult.evidence.rawRecords.join(' | ')
                      : 'No matching record'}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <div className="bg-[#101D35] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">{t.remediation.whyMatters}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{guide.whyItMatters}</p>
            </div>
            <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">{t.remediation.verificationHeading}</h3>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                {guide.verificationSteps.map((vs, i) => (
                  <li key={i} className="leading-relaxed">
                    {vs}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
