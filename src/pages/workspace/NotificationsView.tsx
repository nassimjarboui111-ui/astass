import React, { useMemo, useState } from 'react';
import { Bell, Check, CheckCircle2, Mail, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { markNotificationRead } from '../../services/firestoreService';

interface NotificationsViewProps {
  onOpenAiOps: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onOpenAiOps }) => {
  const { t } = useLanguage();
  const { activeOrg, notifications, unreadNotificationsCount, emailLogs } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread' | 'agent_job'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    if (filter === 'agent_job') return notifications.filter((n) => n.category === 'agent_job');
    return notifications;
  }, [notifications, filter]);

  const handleMarkRead = async (id: string) => {
    if (!activeOrg) return;
    setBusyId(id);
    try {
      await markNotificationRead(activeOrg.id, id, true);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!activeOrg) return;
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await markNotificationRead(activeOrg.id, n.id, true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{t.notifications.title}</h1>
          <p className="text-xs text-slate-400 mt-1">{t.notifications.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-lg cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-[#00C8E8]" />
              {t.notifications.markAllRead}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAiOps}
            className="px-3.5 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-xs rounded-lg cursor-pointer"
          >
            {t.appNav.aiOps}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'unread', label: `Unread (${unreadNotificationsCount})` },
          { id: 'agent_job', label: 'AI Operations' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id as 'all' | 'unread' | 'agent_job')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
              filter === item.id
                ? 'bg-[#101D35] border-[#00C8E8]/40 text-[#22D3EE]'
                : 'bg-[#0D1628] border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Inbox List */}
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl divide-y divide-slate-800/80">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Bell className="w-7 h-7 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400">{t.notifications.empty}</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex flex-wrap items-start justify-between gap-4 ${
                !n.read ? 'bg-[#101D35]/40' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {n.severity === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : n.severity === 'warning' || n.severity === 'error' ? (
                  <ShieldAlert
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      n.severity === 'error' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  />
                ) : (
                  <Bell className="w-4 h-4 text-[#00C8E8] shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">{n.title}</span>
                    {!n.read && (
                      <span className="px-1.5 py-0.5 bg-[#00C8E8]/20 text-[#22D3EE] rounded text-[10px] font-semibold">
                        New
                      </span>
                    )}
                    {n.relatedDomain && (
                      <span className="text-[11px] font-mono text-slate-400">{n.relatedDomain}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.body}</p>
                  <div className="text-[11px] text-slate-500">
                    {new Date(n.createdAtIso).toLocaleString()}
                  </div>
                </div>
              </div>

              {!n.read && (
                <button
                  type="button"
                  disabled={busyId === n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded cursor-pointer disabled:opacity-50"
                >
                  {t.notifications.markRead}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Email Delivery Logs */}
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Mail className="w-4 h-4 text-[#00C8E8]" />
          <span>{t.notifications.emailLogsHeading}</span>
        </div>
        {emailLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">{t.notifications.emailLogsEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Timestamp</th>
                  <th className="py-2 pr-4">Recipient</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {emailLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap tabular-nums">
                      {new Date(log.sentAtIso).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-white whitespace-nowrap">{log.recipient}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{log.subject}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${
                          log.status === 'sent'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : log.status === 'unconfigured'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-400">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
