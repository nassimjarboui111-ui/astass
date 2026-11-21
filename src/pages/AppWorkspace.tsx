import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  Bot,
  CreditCard,
  ExternalLink,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRunDomainScan } from '../services/apiClient';
import { saveDomainScanToFirestore } from '../services/firestoreService';
import { AppLanguage, CheckId, DnsProviderId, MonitoredDomainDoc } from '../types/astasecure';
import { AdminPanelView } from './workspace/AdminPanelView';
import { AiOperationsView } from './workspace/AiOperationsView';
import { AuditLogView } from './workspace/AuditLogView';
import { DashboardView } from './workspace/DashboardView';
import { DomainsView } from './workspace/DomainsView';
import { NotificationsView } from './workspace/NotificationsView';
import { RemediationView } from './workspace/RemediationView';
import { ReportsView } from './workspace/ReportsView';
import { ScanDetailView } from './workspace/ScanDetailView';
import { SubscriptionView } from './workspace/SubscriptionView';
import { TeamSettingsView } from './workspace/TeamSettingsView';

export type WorkspaceTab =
  | 'dashboard'
  | 'domains'
  | 'ai-ops'
  | 'remediation'
  | 'reports'
  | 'notifications'
  | 'audit'
  | 'team'
  | 'subscription'
  | 'admin'
  | 'scan-detail';

interface AppWorkspaceProps {
  onOpenPublicSite: () => void;
}

export const AppWorkspace: React.FC<AppWorkspaceProps> = ({ onOpenPublicSite }) => {
  const { lang, setLang, t } = useLanguage();
  const {
    user,
    profile,
    activeOrg,
    activeRole,
    memberships,
    domains,
    scans,
    pendingInvitations,
    unreadNotificationsCount,
    isPlatformAdmin,
    switchOrganization,
    logout,
  } = useAuth();

  const [tab, setTab] = useState<WorkspaceTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [remediationContext, setRemediationContext] = useState<{
    domainId: string;
    checkId: CheckId;
    provider: DnsProviderId;
  } | null>(null);

  const [scanningDomainId, setScanningDomainId] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleRunScan = async (dom: MonitoredDomainDoc) => {
    if (!user || !activeOrg) return;
    if (activeRole === 'member') {
      setScanError('Read-only members cannot trigger new DNS scans.');
      return;
    }

    // Check daily scan quota enforced per organization
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const scansToday = scans.filter((s) => s.scannedAtIso?.startsWith(todayPrefix)).length;
    const quota = activeOrg.scanQuotaDaily || 5;
    if (scansToday >= quota) {
      setScanError(`Daily scan quota reached (${scansToday}/${quota}). Upgrade your plan or try again tomorrow.`);
      return;
    }

    setScanError(null);
    setScanNotice(null);
    setScanningDomainId(dom.id);

    try {
      const { scan, alerts } = await apiRunDomainScan({
        orgId: activeOrg.id,
        domain: dom.domain,
        verificationToken: dom.verificationToken,
        tokenExpiresAt: dom.tokenExpiresAt,
        ownershipProof: dom.ownershipProof,
        dkimSelectors: dom.dkimSelectors,
        alertEmail: activeOrg.alertEmail,
        emailAlertsEnabled: activeOrg.emailAlertsEnabled,
        whatsappNumber: activeOrg.whatsappNumber,
        whatsappAlertsEnabled: activeOrg.whatsappAlertsEnabled,
        previousScore: dom.lastScore,
      });

      const scanId = await saveDomainScanToFirestore({
        orgId: activeOrg.id,
        domainId: dom.id,
        triggeredBy: user.uid,
        actorEmail: user.email || '',
        triggerType: 'manual',
        scan,
        memberUids: activeOrg.memberUids,
      });

      setSelectedDomainId(dom.id);
      setSelectedScanId(scanId);
      const alertSummary =
        alerts.length > 0 ? ` Alerts: ${alerts.map((a) => `${a.channel}: ${a.sent ? 'sent' : 'skipped'}`).join(', ')}.` : '';
      setScanNotice(`Completed verified scan for ${dom.domain}: ${scan.score}/100 (${scan.durationMs}ms).${alertSummary}`);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan execution failed.');
    } finally {
      setScanningDomainId(null);
    }
  };

  const handleFullRescanByDomainId = async (domainId: string) => {
    const dom = domains.find((d) => d.id === domainId);
    if (dom) {
      await handleRunScan(dom);
    }
  };

  const openFix = (domainId: string, checkId: CheckId, provider: DnsProviderId) => {
    setRemediationContext({ domainId, checkId, provider });
    setTab('remediation');
    setMobileMenuOpen(false);
  };

  const openScanDetail = (scanId: string) => {
    setSelectedScanId(scanId);
    setTab('scan-detail');
    setMobileMenuOpen(false);
  };

  const navItems: { id: WorkspaceTab; label: string; icon: React.ReactNode; show?: boolean }[] = [
    { id: 'dashboard', label: t.appNav.dashboard, icon: <LayoutDashboard className="w-4 h-4 shrink-0" />, show: true },
    { id: 'domains', label: t.appNav.domains, icon: <Globe className="w-4 h-4 shrink-0" />, show: true },
    { id: 'ai-ops', label: t.appNav.aiOps, icon: <Bot className="w-4 h-4 shrink-0" />, show: true },
    { id: 'remediation', label: t.appNav.remediation, icon: <Wrench className="w-4 h-4 shrink-0" />, show: true },
    { id: 'reports', label: t.appNav.reports, icon: <FileText className="w-4 h-4 shrink-0" />, show: true },
    { id: 'notifications', label: t.appNav.notifications, icon: <Bell className="w-4 h-4 shrink-0" />, show: true },
    { id: 'audit', label: t.appNav.auditLog, icon: <Activity className="w-4 h-4 shrink-0" />, show: true },
    { id: 'team', label: t.appNav.team, icon: <Users className="w-4 h-4 shrink-0" />, show: true },
    { id: 'subscription', label: t.appNav.subscription, icon: <CreditCard className="w-4 h-4 shrink-0" />, show: true },
    { id: 'admin', label: t.appNav.admin, icon: <Shield className="w-4 h-4 shrink-0" />, show: isPlatformAdmin },
  ];

  const activeScan = scans.find((s) => s.id === selectedScanId) || scans[0] || null;

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex">
      {/* Desktop Sidebar & Mobile Overlay */}
      <aside
        className={`fixed inset-y-0 z-40 w-64 bg-[#0A1120] border-e border-slate-800 flex flex-col transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <BrandLogo compact />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Organization Switcher */}
        <div className="p-4 border-b border-slate-800/80 space-y-2">
          <div className="text-xs text-slate-400">Organization Workspace</div>
          {memberships.length > 1 ? (
            <select
              value={activeOrg?.id || ''}
              onChange={(e) => switchOrganization(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#060B14] border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-[#00C8E8]"
            >
              {memberships.map((m) => (
                <option key={m.orgId} value={m.orgId}>
                  {m.orgName} ({m.role})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm font-semibold text-white truncate">
              {activeOrg?.name || 'Loading workspace...'}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="capitalize">Role: {activeRole === 'member' ? 'Read-only' : activeRole}</span>
            <span className="uppercase font-mono text-[#22D3EE]">{activeOrg?.plan || 'free'}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const active = tab === item.id || (tab === 'scan-detail' && item.id === 'reports');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#101D35] text-[#22D3EE] border border-[#00C8E8]/30'
                      : 'text-slate-300 hover:bg-[#0D1628] hover:text-white border border-transparent'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'team' && pendingInvitations.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#00C8E8] text-[#060B14] rounded">
                      {pendingInvitations.length}
                    </span>
                  )}
                  {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#00C8E8] text-[#060B14] rounded">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 truncate">
            {profile?.displayName || user?.email}
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenPublicSite}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public Site
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t.auth.signOut}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-[#060B14]/90 backdrop-blur border-b border-slate-800 px-5 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white whitespace-nowrap">{t.productName}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTab('notifications')}
              aria-label="Open notifications"
              className="relative p-2 bg-[#0D1628] border border-slate-800 rounded-lg text-slate-300 hover:text-white cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 bg-[#00C8E8] text-[#060B14] text-[10px] font-bold rounded flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            <div className="flex items-center bg-[#0D1628] border border-slate-800 rounded-lg p-0.5">
              {(['en', 'fr', 'ar'] as AppLanguage[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2 py-1 text-xs font-semibold rounded cursor-pointer uppercase ${
                    lang === code ? 'bg-[#00C8E8] text-[#060B14]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-5">
          {scanNotice && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">
              {scanNotice}
            </div>
          )}
          {scanError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {tab === 'dashboard' && (
            <DashboardView
              selectedDomainId={selectedDomainId}
              onSelectDomain={setSelectedDomainId}
              onRunScan={handleRunScan}
              scanningDomainId={scanningDomainId}
              onOpenDomains={() => setTab('domains')}
              onOpenFix={openFix}
              onOpenScanDetail={openScanDetail}
              onOpenAiOps={() => setTab('ai-ops')}
              onOpenNotifications={() => setTab('notifications')}
            />
          )}

          {tab === 'domains' && (
            <DomainsView
              onRunScan={handleRunScan}
              scanningDomainId={scanningDomainId}
              onViewLatestScan={openScanDetail}
            />
          )}

          {tab === 'ai-ops' && (
            <AiOperationsView
              onOpenDomains={() => setTab('domains')}
              onOpenScanDetail={openScanDetail}
            />
          )}

          {tab === 'remediation' && (
            <RemediationView
              initialDomainId={remediationContext?.domainId || selectedDomainId}
              initialCheckId={remediationContext?.checkId}
              initialProvider={remediationContext?.provider}
              onFullRescanRequested={handleFullRescanByDomainId}
            />
          )}

          {tab === 'reports' && <ReportsView onOpenScanDetail={openScanDetail} />}

          {tab === 'notifications' && (
            <NotificationsView onOpenAiOps={() => setTab('ai-ops')} />
          )}

          {tab === 'scan-detail' && activeScan && (
            <ScanDetailView
              scan={activeScan}
              onBack={() => setTab('reports')}
              onOpenFix={openFix}
            />
          )}

          {tab === 'audit' && <AuditLogView />}

          {tab === 'team' && <TeamSettingsView />}

          {tab === 'subscription' && <SubscriptionView />}

          {tab === 'admin' && <AdminPanelView />}
        </main>
      </div>
    </div>
  );
};
