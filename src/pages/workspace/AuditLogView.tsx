import React, { useMemo, useState } from 'react';
import { Activity, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

function formatTimestamp(ts: unknown): string {
  if (!ts) return 'Pending sync';
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toLocaleString();
  }
  if (typeof ts === 'string') return new Date(ts).toLocaleString();
  return 'Recorded';
}

export const AuditLogView: React.FC = () => {
  const { t } = useLanguage();
  const { auditLogs } = useAuth();
  const [queryText, setQueryText] = useState('');

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (log) =>
        log.action.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q)
    );
  }, [auditLogs, queryText]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{t.appNav.auditLog}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable organization audit trail enforcing non-repudiation for domain additions, ownership proofs, scans, and team changes.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Filter action, domain, or actor..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0D1628] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00C8E8]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-10 text-center space-y-2">
          <Activity className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm text-slate-300">No matching audit log events.</p>
        </div>
      ) : (
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 bg-[#0A1120]">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Target</th>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-[#101D35]/40">
                  <td className="py-3 px-4 text-slate-400 tabular-nums whitespace-nowrap">
                    {formatTimestamp(log.createdAt)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#22D3EE] whitespace-nowrap">{log.action}</td>
                  <td className="py-3 px-4 text-white font-medium whitespace-nowrap">{log.target}</td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{log.actorEmail}</td>
                  <td className="py-3 px-4 text-slate-400 max-w-md">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
