import React, { useMemo, useState } from 'react';
import { Bot, Download, Eye, FileText, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiDownloadPdfReport, apiVerifyScanIntegrity } from '../../services/apiClient';
import { recordStoredReport } from '../../services/firestoreService';

interface ReportsViewProps {
  onOpenScanDetail: (scanId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onOpenScanDetail }) => {
  const { t } = useLanguage();
  const { user, activeOrg, domains, scans, reports } = useAuth();
  const [filterDomainId, setFilterDomainId] = useState<string>('all');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [integrityMap, setIntegrityMap] = useState<Record<string, 'valid' | 'invalid'>>({});
  const [error, setError] = useState<string | null>(null);

  const filteredScans = useMemo(() => {
    if (filterDomainId === 'all') return scans;
    return scans.filter((s) => s.domainId === filterDomainId);
  }, [scans, filterDomainId]);

  const filteredReports = useMemo(() => {
    if (filterDomainId === 'all') return reports;
    return reports.filter((r) => r.domainId === filterDomainId);
  }, [reports, filterDomainId]);

  const handleDownload = async (scanId: string, language: 'en' | 'fr') => {
    const scan = scans.find((s) => s.id === scanId);
    if (!scan || !activeOrg || !user) return;
    setError(null);
    setDownloadingKey(`${scanId}-${language}`);
    try {
      const { sha256 } = await apiDownloadPdfReport({
        organizationName: activeOrg.name || 'Organization',
        language,
        scan,
      });
      await recordStoredReport({
        orgId: activeOrg.id,
        domainId: scan.domainId,
        domain: scan.domain,
        scanId: scan.id,
        language,
        score: scan.score,
        sha256: sha256 || 'client-generated',
        integritySig: scan.integritySig,
        generatedBy: user.uid,
        memberUids: activeOrg.memberUids,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF download failed.');
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleVerifyIntegrity = async (scanId: string) => {
    const scan = scans.find((s) => s.id === scanId);
    if (!scan) return;
    const ok = await apiVerifyScanIntegrity(scan);
    setIntegrityMap((prev) => ({ ...prev, [scanId]: ok ? 'valid' : 'invalid' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{t.appNav.reports}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Download tamper-checked English and French PDF security reports backed by server HMAC-SHA256 signatures and SHA-256 checksums.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="report-domain-filter" className="text-xs text-slate-400">
            Domain:
          </label>
          <select
            id="report-domain-filter"
            value={filterDomainId}
            onChange={(e) => setFilterDomainId(e.target.value)}
            className="bg-[#0D1628] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C8E8]"
          >
            <option value="all">All Domains ({scans.length})</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.domain}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Stored PDF Reports Archive */}
      {filteredReports.length > 0 && (
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              Generated PDF Reports Archive ({filteredReports.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Generated</th>
                  <th className="py-2 pr-4">Domain</th>
                  <th className="py-2 pr-4">Language</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">SHA-256 Fingerprint</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredReports.map((rep) => (
                  <tr key={rep.id}>
                    <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap tabular-nums">
                      {new Date(rep.generatedAtIso).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-white whitespace-nowrap">{rep.domain}</td>
                    <td className="py-2.5 pr-4 uppercase font-mono text-[#22D3EE]">{rep.language}</td>
                    <td className="py-2.5 pr-4 font-mono text-white tabular-nums">{rep.score}/100</td>
                    <td className="py-2.5 pr-4 font-mono text-[11px] text-slate-400">
                      {rep.sha256.slice(0, 18)}...
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {rep.jobId ? (
                        <span className="inline-flex items-center gap-1 text-[#22D3EE]">
                          <Bot className="w-3 h-3" />
                          AI Operations
                        </span>
                      ) : (
                        <span className="text-slate-400">Manual Export</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={downloadingKey === `${rep.scanId}-${rep.language}`}
                        onClick={() => handleDownload(rep.scanId, rep.language)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" />
                        Re-download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredScans.length === 0 ? (
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-10 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-medium text-white">No scan reports recorded yet.</p>
          <p className="text-xs text-slate-400">
            Verify domain ownership and execute a security scan to generate signed evidence reports.
          </p>
        </div>
      ) : (
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 bg-[#0A1120]">
              <tr>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Domain</th>
                <th className="py-3 px-4 font-semibold">Trigger</th>
                <th className="py-3 px-4 font-semibold">Score</th>
                <th className="py-3 px-4 font-semibold">Provider</th>
                <th className="py-3 px-4 font-semibold">Integrity</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredScans.map((scan) => {
                const integ = integrityMap[scan.id];
                return (
                  <tr key={scan.id} className="hover:bg-[#101D35]/50">
                    <td className="py-3 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                      {new Date(scan.scannedAtIso).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">{scan.domain}</td>
                    <td className="py-3 px-4 text-slate-400 capitalize whitespace-nowrap">{scan.triggerType}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white tabular-nums whitespace-nowrap">
                      {scan.score} / 100
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {scan.detectedProviderLabel || scan.detectedProvider}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {integ === 'valid' ? (
                        <span className="text-emerald-400 font-medium">Verified</span>
                      ) : integ === 'invalid' ? (
                        <span className="text-rose-400 font-medium">Mismatch</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleVerifyIntegrity(scan.id)}
                          className="inline-flex items-center gap-1 text-[#22D3EE] hover:underline cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verify HMAC
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenScanDetail(scan.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          Evidence
                        </button>
                        <button
                          type="button"
                          disabled={downloadingKey === `${scan.id}-en`}
                          onClick={() => handleDownload(scan.id, 'en')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold rounded cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          PDF EN
                        </button>
                        <button
                          type="button"
                          disabled={downloadingKey === `${scan.id}-fr`}
                          onClick={() => handleDownload(scan.id, 'fr')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          PDF FR
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

