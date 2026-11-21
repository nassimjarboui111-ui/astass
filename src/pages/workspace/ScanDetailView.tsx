import React, { useState } from 'react';
import { ArrowLeft, Download, ShieldCheck, Wrench } from 'lucide-react';
import { CheckStatusLabel, SeverityText } from '../../components/StatusIndicators';
import { useAuth } from '../../contexts/AuthContext';
import { StoredScanDoc } from '../../contexts/AuthContext';
import { apiDownloadPdfReport, apiVerifyScanIntegrity } from '../../services/apiClient';
import { CheckId, DnsProviderId } from '../../types/astasecure';

interface ScanDetailViewProps {
  scan: StoredScanDoc;
  onBack: () => void;
  onOpenFix: (domainId: string, checkId: CheckId, provider: DnsProviderId) => void;
}

export const ScanDetailView: React.FC<ScanDetailViewProps> = ({ scan, onBack, onOpenFix }) => {
  const { activeOrg } = useAuth();
  const [integrityStatus, setIntegrityStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleCheckIntegrity = async () => {
    const ok = await apiVerifyScanIntegrity(scan);
    setIntegrityStatus(ok ? 'valid' : 'invalid');
  };

  const handleDownloadPdf = async (reportLang: 'en' | 'fr') => {
    setPdfError(null);
    setPdfBusy(true);
    try {
      await apiDownloadPdfReport({
        organizationName: activeOrg?.name || 'Organization',
        language: reportLang,
        scan,
      });
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'PDF generation failed.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCheckIntegrity}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-lg cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#00C8E8]" />
            {integrityStatus === 'idle'
              ? 'Verify Server HMAC Signature'
              : integrityStatus === 'valid'
                ? 'Signature Valid (Untampered)'
                : 'Integrity Mismatch'}
          </button>
          <button
            type="button"
            disabled={pdfBusy}
            onClick={() => handleDownloadPdf('en')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            PDF (EN)
          </button>
          <button
            type="button"
            disabled={pdfBusy}
            onClick={() => handleDownloadPdf('fr')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            PDF (FR)
          </button>
        </div>
      </div>

      {pdfError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
          {pdfError}
        </div>
      )}

      {/* Summary Banner */}
      <div className="bg-[#101D35] border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">{scan.domain}</h1>
          <div className="text-xs text-slate-400 tabular-nums">
            Scanned {new Date(scan.scannedAtIso).toLocaleString()} · Duration {scan.durationMs}ms · Provider {scan.detectedProviderLabel}
          </div>
        </div>
        <div className="flex items-center gap-6 tabular-nums">
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{scan.score} / 100</div>
            <div className="text-xs text-slate-400">Risk points: {scan.riskPoints}</div>
          </div>
        </div>
      </div>

      {/* Individual Check Evidence Cards */}
      <div className="space-y-4">
        {scan.checks.map((check) => (
          <div key={check.id} className="bg-[#0D1628] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white">{check.name}</h2>
                <CheckStatusLabel status={check.status} severity={check.severity} />
              </div>
              <div className="flex items-center gap-3">
                <SeverityText severity={check.severity} />
                {check.pointsRemoved > 0 && check.id !== 'tls' && (
                  <button
                    type="button"
                    onClick={() => onOpenFix(scan.domainId, check.id, scan.detectedProvider)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    Guided Fix
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-200">{check.summary}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{check.riskExplanation}</p>

            {/* Raw Technical Evidence */}
            <div className="bg-[#060B14] border border-slate-800 rounded-lg p-3.5 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                <span>
                  Resolver: <strong className="text-slate-200">{check.evidence.resolver}</strong>
                </span>
                <span className="font-mono">
                  {check.evidence.recordType} · {check.evidence.queryName}
                  {typeof check.evidence.ttl === 'number' ? ` · TTL ${check.evidence.ttl}s` : ''}
                </span>
              </div>
              {check.evidence.rawRecords.length > 0 ? (
                <div className="space-y-1 font-mono text-slate-200 break-all">
                  {check.evidence.rawRecords.map((rec, i) => (
                    <div key={i} className="p-2 bg-[#0D1628] rounded border border-slate-800/80">
                      {rec}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="font-mono text-slate-500">
                  No DNS records returned. {check.evidence.notes || ''}
                </div>
              )}
            </div>

            {check.pointsRemoved > 0 && (
              <div className="text-xs text-[#22D3EE]">
                Recommended Action: <span className="text-slate-300">{check.recommendedAction}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
