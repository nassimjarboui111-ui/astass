import React, { useEffect, useState } from 'react';
import { Bot, Building2, Mail, RefreshCw, Shield, Sliders, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiAdminGetOverview } from '../../services/apiClient';
import {
  adminAssignOrganizationPlan,
  adminGrantPlatformAdmin,
  adminListAllOrganizations,
  adminListAllUsers,
  adminListContactInquiries,
  adminListOperationsAcrossOrgs,
  DEFAULT_PLANS,
  listPlans,
  savePlanConfig,
} from '../../services/firestoreService';
import {
  AgentJobDoc,
  EmailDeliveryLogDoc,
  MonitoredDomainDoc,
  OrganizationDoc,
  PlanId,
  ServiceRequestDoc,
  SubscriptionPlanDoc,
} from '../../types/astasecure';

export const AdminPanelView: React.FC = () => {
  const { user, isPlatformAdmin } = useAuth();
  const [orgs, setOrgs] = useState<OrganizationDoc[]>([]);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof adminListAllUsers>>>([]);
  const [inquiries, setInquiries] = useState<Array<{ id: string } & Record<string, unknown>>>([]);
  const [planConfigs, setPlanConfigs] = useState<SubscriptionPlanDoc[]>(DEFAULT_PLANS);
  const [allDomains, setAllDomains] = useState<MonitoredDomainDoc[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [allRequests, setAllRequests] = useState<ServiceRequestDoc[]>([]);
  const [allJobs, setAllJobs] = useState<AgentJobDoc[]>([]);
  const [allEmailLogs, setAllEmailLogs] = useState<EmailDeliveryLogDoc[]>([]);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof apiAdminGetOverview>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [o, u, inq, p, ov] = await Promise.all([
        adminListAllOrganizations(),
        adminListAllUsers(),
        adminListContactInquiries().catch(() => []),
        listPlans(),
        apiAdminGetOverview().catch(() => null),
      ]);
      setOrgs(o);
      setUsers(u);
      setInquiries(inq);
      setPlanConfigs(p);
      setOverview(ov);

      const ops = await adminListOperationsAcrossOrgs(o);
      setAllDomains(ops.allDomains);
      setTotalScans(ops.totalScans);
      setAllRequests(ops.allRequests);
      setAllJobs(ops.allJobs);
      setAllEmailLogs(ops.allEmailLogs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to load admin metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPlatformAdmin) {
      loadAdminData();
    }
  }, [isPlatformAdmin]);

  if (!isPlatformAdmin) {
    return (
      <div className="bg-[#0D1628] border border-rose-500/30 rounded-xl p-8 text-center text-sm text-rose-300">
        Access denied. Platform Administrator authorization is required.
      </div>
    );
  }

  const verifiedDomainsCount = allDomains.filter((d) => d.verificationStatus === 'verified').length;

  const handleAssignOrgPlan = async (org: OrganizationDoc, nextPlanId: PlanId) => {
    const matched = planConfigs.find((p) => p.id === nextPlanId) || DEFAULT_PLANS[0];
    await adminAssignOrganizationPlan({
      orgId: org.id,
      plan: nextPlanId,
      domainLimit: matched.domainLimit,
      scanQuotaDaily: matched.dailyScanQuota,
    });
    setMsg(`Updated ${org.name} to ${matched.name} (${matched.domainLimit} domains).`);
    await loadAdminData();
  };

  const handleSavePlan = async (plan: SubscriptionPlanDoc) => {
    await savePlanConfig(plan);
    setMsg(`Saved configuration for plan "${plan.name}".`);
  };

  const handleGrantAdmin = async (targetUid: string, targetEmail: string) => {
    if (!user) return;
    await adminGrantPlatformAdmin({
      targetUid,
      targetEmail,
      grantedByUid: user.uid,
    });
    setMsg(`Granted platform admin privileges to ${targetEmail}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Platform Administration</h1>
          <p className="text-xs text-slate-400 mt-1">
            Protected system console for organizations, domains, scans, AI Operations jobs, email delivery status, configurable plans, and inquiries.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAdminData}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {msg && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">{msg}</div>}
      {err && <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">{err}</div>}

      {/* Platform Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Organizations / Users</div>
          <div className="text-2xl font-bold text-white tabular-nums mt-1">
            {orgs.length} <span className="text-sm font-normal text-slate-400">/ {users.length} users</span>
          </div>
        </div>
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Domains (Verified / Total)</div>
          <div className="text-2xl font-bold text-white tabular-nums mt-1">
            {verifiedDomainsCount} <span className="text-sm font-normal text-slate-400">/ {allDomains.length}</span>
          </div>
        </div>
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Scans / AI Jobs / Requests</div>
          <div className="text-2xl font-bold text-white tabular-nums mt-1">
            {totalScans} <span className="text-sm font-normal text-slate-400">/ {allJobs.length} / {allRequests.length}</span>
          </div>
        </div>
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Backend Integrations</div>
          <div className="text-xs text-slate-200 mt-1.5 space-y-0.5">
            <div>AI ({overview?.ai.model || 'gemini-4-hydrogen'}): {overview?.ai.configured ? 'Configured' : 'Unconfigured'}</div>
            <div>SMTP: {overview?.channels.emailConfigured ? 'Active' : 'Off'} · WhatsApp: {overview?.channels.whatsappConfigured ? 'Active' : 'Off'}</div>
          </div>
        </div>
      </div>

      {/* Plan Configuration */}
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Sliders className="w-4 h-4 text-[#00C8E8]" />
          Configurable Plan Quotas & TND Pricing
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {planConfigs.map((plan, idx) => (
            <div key={plan.id} className="bg-[#060B14] border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
              <div className="font-bold text-white">{plan.name} ({plan.id})</div>
              <div>
                <label className="text-slate-400 block mb-1">Price (TND)</label>
                <input
                  type="number"
                  value={plan.priceTnd}
                  onChange={(e) => {
                    const next = [...planConfigs];
                    next[idx] = { ...plan, priceTnd: Number(e.target.value) };
                    setPlanConfigs(next);
                  }}
                  className="w-full px-2.5 py-1 bg-[#0D1628] border border-slate-700 rounded text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Domain Limit</label>
                <input
                  type="number"
                  min={1}
                  value={plan.domainLimit}
                  onChange={(e) => {
                    const next = [...planConfigs];
                    next[idx] = { ...plan, domainLimit: Math.max(1, Number(e.target.value)) };
                    setPlanConfigs(next);
                  }}
                  className="w-full px-2.5 py-1 bg-[#0D1628] border border-slate-700 rounded text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Daily Scans</label>
                <input
                  type="number"
                  min={1}
                  value={plan.dailyScanQuota}
                  onChange={(e) => {
                    const next = [...planConfigs];
                    next[idx] = { ...plan, dailyScanQuota: Math.max(1, Number(e.target.value)) };
                    setPlanConfigs(next);
                  }}
                  className="w-full px-2.5 py-1 bg-[#0D1628] border border-slate-700 rounded text-white font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSavePlan(plan)}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded cursor-pointer"
              >
                Save Plan
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* AI Operations Jobs Across Orgs */}
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Bot className="w-4 h-4 text-[#00C8E8]" />
            AI Operations Jobs & Service Requests ({allJobs.length} persisted / {overview?.runtimeQueueCount || 0} runtime queue)
          </div>
        </div>
        {allJobs.length === 0 ? (
          <p className="text-xs text-slate-400">No AI Operations jobs recorded across organizations yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2 pr-4">Job ID</th>
                <th className="py-2 pr-4">Domain</th>
                <th className="py-2 pr-4">Package</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">AI Provider</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Email Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {allJobs.slice(0, 20).map((job) => (
                <tr key={job.id}>
                  <td className="py-2.5 pr-4 font-mono text-slate-300 whitespace-nowrap">{job.id}</td>
                  <td className="py-2.5 pr-4 font-semibold text-white whitespace-nowrap">{job.domain}</td>
                  <td className="py-2.5 pr-4 text-slate-300 capitalize whitespace-nowrap">{job.servicePackage.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-[#22D3EE] font-semibold whitespace-nowrap">{job.status}</td>
                  <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">
                    {job.aiProviderAvailable ? job.aiModel : 'Degraded / Unavailable'}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-white tabular-nums">
                    {typeof job.score === 'number' ? `${job.score}/100` : '--'}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400 capitalize whitespace-nowrap">
                    {job.emailDeliveryStatus || 'skipped'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Email Delivery Logs */}
      {allEmailLogs.length > 0 && (
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-3 overflow-x-auto">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Mail className="w-4 h-4 text-[#00C8E8]" />
            Recent Email Delivery Logs ({allEmailLogs.length})
          </div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2 pr-4">Sent At</th>
                <th className="py-2 pr-4">Recipient</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {allEmailLogs.slice(0, 15).map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap tabular-nums">
                    {new Date(log.sentAtIso).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-white whitespace-nowrap">{log.recipient}</td>
                  <td className="py-2.5 pr-4 text-slate-300">{log.subject}</td>
                  <td className="py-2.5 pr-4 font-semibold capitalize text-slate-200">{log.status}</td>
                  <td className="py-2.5 pr-4 text-slate-400">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Organizations Management */}
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4 overflow-x-auto">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Building2 className="w-4 h-4 text-[#00C8E8]" />
          Organizations & Subscription Assignment
        </div>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 text-slate-400">
            <tr>
              <th className="py-2 pr-4">Organization</th>
              <th className="py-2 pr-4">Members</th>
              <th className="py-2 pr-4">Domain Limit</th>
              <th className="py-2 pr-4">Assign Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {orgs.map((o) => (
              <tr key={o.id}>
                <td className="py-2.5 pr-4 font-semibold text-white">{o.name}</td>
                <td className="py-2.5 pr-4 text-slate-300 tabular-nums">{o.memberUids?.length || 1}</td>
                <td className="py-2.5 pr-4 font-mono text-slate-300 tabular-nums">{o.domainLimit}</td>
                <td className="py-2.5 pr-4">
                  <select
                    value={o.plan}
                    onChange={(e) => handleAssignOrgPlan(o, e.target.value as PlanId)}
                    className="bg-[#060B14] border border-slate-700 rounded px-2.5 py-1 text-white"
                  >
                    {planConfigs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.priceTnd} TND)
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Users & Admin Grant */}
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4 overflow-x-auto">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Users className="w-4 h-4 text-[#00C8E8]" />
          Registered Users
        </div>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 text-slate-400">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">2FA</th>
              <th className="py-2 pr-4">Privilege</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {users.map((u) => (
              <tr key={u.uid}>
                <td className="py-2.5 pr-4 text-white font-medium">{u.displayName}</td>
                <td className="py-2.5 pr-4 text-slate-300">{u.email}</td>
                <td className="py-2.5 pr-4 text-slate-400">{u.totpEnabled ? 'TOTP On' : 'Off'}</td>
                <td className="py-2.5 pr-4">
                  <button
                    type="button"
                    onClick={() => handleGrantAdmin(u.uid, u.email)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
                  >
                    <Shield className="w-3 h-3 text-[#00C8E8]" />
                    Grant Platform Admin
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Contact Inquiries */}
      {inquiries.length > 0 && (
        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-bold text-white">Recent Contact Inquiries ({inquiries.length})</h2>
          <div className="space-y-3">
            {inquiries.map((inq) => (
              <div key={inq.id} className="p-3.5 bg-[#060B14] border border-slate-800 rounded-lg text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-white">
                    {String(inq.name || '')} ({String(inq.email || '')}) {inq.company ? `· ${String(inq.company)}` : ''}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    {Boolean(inq.serviceCategory) && (
                      <span className="px-2 py-0.5 bg-[#101D35] border border-slate-700 rounded text-[#22D3EE]">
                        {String(inq.serviceCategory)}
                      </span>
                    )}
                    {Boolean(inq.emailDeliveryStatus) && (
                      <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 capitalize">
                        Email: {String(inq.emailDeliveryStatus)}
                      </span>
                    )}
                  </div>
                </div>
                {Boolean(inq.domain) && (
                  <div className="text-[11px] font-mono text-slate-400">Domain: {String(inq.domain)}</div>
                )}
                <p className="text-slate-300 leading-relaxed">{String(inq.message || '')}</p>
                {Boolean(inq.emailDeliveryDetail) && (
                  <div className="text-[11px] text-slate-500">{String(inq.emailDeliveryDetail)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

