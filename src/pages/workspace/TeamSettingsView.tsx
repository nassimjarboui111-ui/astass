import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, KeyRound, Mail, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiGetHealth, apiSetupTotp, apiVerifyTotp } from '../../services/apiClient';
import {
  inviteOrgMember,
  removeOrgMember,
  saveTotpSecret,
  updateMemberRole,
  updateOrganizationSettings,
  updateUserProfile,
} from '../../services/firestoreService';
import { OrgRole } from '../../types/astasecure';

export const TeamSettingsView: React.FC = () => {
  const { t } = useLanguage();
  const {
    user,
    profile,
    activeOrg,
    activeRole,
    members,
    pendingInvitations,
    acceptInvitation,
    totpRequired,
    totpSecretBase32,
    refreshTotpState,
    deleteCurrentAccount,
  } = useAuth();

  const isOwner = activeRole === 'owner';
  const canManageAlerts = activeRole === 'owner' || activeRole === 'admin';

  // Organization & alert settings state
  const [orgName, setOrgName] = useState(activeOrg?.name || '');
  const [alertEmail, setAlertEmail] = useState(activeOrg?.alertEmail || user?.email || '');
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(Boolean(activeOrg?.emailAlertsEnabled));
  const [whatsappNumber, setWhatsappNumber] = useState(activeOrg?.whatsappNumber || '');
  const [whatsappAlertsEnabled, setWhatsappAlertsEnabled] = useState(Boolean(activeOrg?.whatsappAlertsEnabled));
  const [orgMsg, setOrgMsg] = useState<string | null>(null);
  const [orgErr, setOrgErr] = useState<string | null>(null);
  const [channels, setChannels] = useState<{ emailConfigured: boolean; whatsappConfigured: boolean } | null>(null);

  // Team invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  // Profile & TOTP state
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [totpEnroll, setTotpEnroll] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpMsg, setTotpMsg] = useState<string | null>(null);
  const [totpErr, setTotpErr] = useState<string | null>(null);

  // Account deletion state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      setOrgName(activeOrg.name);
      setAlertEmail(activeOrg.alertEmail || user?.email || '');
      setEmailAlertsEnabled(Boolean(activeOrg.emailAlertsEnabled));
      setWhatsappNumber(activeOrg.whatsappNumber || '');
      setWhatsappAlertsEnabled(Boolean(activeOrg.whatsappAlertsEnabled));
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    if (profile) setDisplayName(profile.displayName);
  }, [profile?.displayName]);

  useEffect(() => {
    apiGetHealth()
      .then((res) => setChannels(res.channels))
      .catch(() => {});
  }, []);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !canManageAlerts) return;
    setOrgMsg(null);
    setOrgErr(null);
    try {
      const updates: Parameters<typeof updateOrganizationSettings>[0]['updates'] = {
        alertEmail: alertEmail.trim(),
        emailAlertsEnabled,
        whatsappNumber: whatsappNumber.trim(),
        whatsappAlertsEnabled,
      };
      if (isOwner) {
        updates.name = orgName.trim();
      }
      await updateOrganizationSettings({ orgId: activeOrg.id, updates });
      setOrgMsg('Organization & alert settings saved.');
    } catch (err) {
      setOrgErr(err instanceof Error ? err.message : 'Unable to save settings.');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !user || !canManageAlerts) return;
    setInviteMsg(null);
    setInviteErr(null);
    try {
      await inviteOrgMember({
        orgId: activeOrg.id,
        orgName: activeOrg.name,
        email: inviteEmail,
        role: inviteRole,
        invitedBy: user.uid,
        actorEmail: user.email || '',
        memberUids: activeOrg.memberUids,
      });
      setInviteMsg(`Invitation created for ${inviteEmail.trim().toLowerCase()} (${inviteRole}).`);
      setInviteEmail('');
    } catch (err) {
      setInviteErr(err instanceof Error ? err.message : 'Failed to invite team member.');
    }
  };

  const handleRoleChange = async (targetUid: string, role: OrgRole) => {
    if (!activeOrg || !user || !isOwner) return;
    await updateMemberRole({
      orgId: activeOrg.id,
      targetUserId: targetUid,
      newRole: role,
      actorId: user.uid,
      actorEmail: user.email || '',
      memberUids: activeOrg.memberUids,
    });
  };

  const handleRemoveMember = async (targetUid: string) => {
    if (!activeOrg || !user || !isOwner || targetUid === user.uid) return;
    await removeOrgMember({
      orgId: activeOrg.id,
      targetUserId: targetUid,
      currentMemberUids: activeOrg.memberUids,
      actorId: user.uid,
      actorEmail: user.email || '',
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await updateUserProfile(user.uid, { displayName: displayName.trim() });
    setProfileMsg('Profile name updated.');
  };

  const handleStartTotp = async () => {
    setTotpErr(null);
    setTotpMsg(null);
    try {
      const data = await apiSetupTotp();
      setTotpEnroll({ secret: data.secret, qrCodeDataUrl: data.qrCodeDataUrl });
    } catch (err) {
      setTotpErr(err instanceof Error ? err.message : 'Unable to generate 2FA enrollment.');
    }
  };

  const handleConfirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !totpEnroll) return;
    setTotpErr(null);
    const valid = await apiVerifyTotp(totpEnroll.secret, totpCode);
    if (!valid) {
      setTotpErr('Invalid 6-digit authenticator code.');
      return;
    }
    await saveTotpSecret(user.uid, totpEnroll.secret, true);
    sessionStorage.setItem(`astasecure_2fa_${user.uid}`, 'ok');
    await refreshTotpState();
    setTotpEnroll(null);
    setTotpCode('');
    setTotpMsg('Two-factor authentication is now enabled.');
  };

  const handleDisableTotp = async () => {
    if (!user) return;
    const preservedSecret =
      totpSecretBase32 && totpSecretBase32.length >= 16
        ? totpSecretBase32
        : 'DISABLED_TOTP_PLACEHOLDER';
    await saveTotpSecret(user.uid, preservedSecret, false);
    await refreshTotpState();
    setTotpMsg('Two-factor authentication disabled.');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteBusy(true);
    setDeleteErr(null);
    try {
      await deleteCurrentAccount();
    } catch (err) {
      setDeleteErr(
        err instanceof Error
          ? err.message
          : 'Account deletion failed. Firebase may require recent re-authentication before deleting.'
      );
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{t.appNav.team}</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage organization identity, team RBAC roles, notification channels, TOTP 2FA, and account lifecycle.
        </p>
      </div>

      {/* Pending Invitations for Current User */}
      {pendingInvitations.length > 0 && (
        <div className="bg-[#101D35] border border-[#00C8E8]/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Mail className="w-4 h-4 text-[#00C8E8]" />
            Pending Organization Invitations
          </div>
          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 bg-[#060B14] border border-slate-800 rounded-lg p-3">
              <div className="text-xs">
                <span className="font-semibold text-white">{inv.orgName}</span> · Role:{' '}
                <span className="text-[#22D3EE] capitalize">{inv.role}</span>
              </div>
              <button
                type="button"
                onClick={() => acceptInvitation(inv)}
                className="px-4 py-1.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-xs rounded-lg cursor-pointer"
              >
                Accept & Join
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Organization & Alert Channels */}
      <form onSubmit={handleSaveOrg} className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#00C8E8]" />
            <h2 className="text-base font-bold text-white">Organization & Alert Channels</h2>
          </div>
          {channels && (
            <span className="text-xs text-slate-400">
              Server SMTP: {channels.emailConfigured ? 'Configured' : 'Not Configured'} · WhatsApp API:{' '}
              {channels.whatsappConfigured ? 'Configured' : 'Optional / Not Configured'}
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Organization Name</label>
            <input
              type="text"
              disabled={!isOwner}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white disabled:opacity-60 focus:outline-none focus:border-[#00C8E8]"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Alert Email Recipient</label>
            <input
              type="email"
              disabled={!canManageAlerts}
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white disabled:opacity-60 focus:outline-none focus:border-[#00C8E8]"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">WhatsApp Alert Number (Optional E.164)</label>
            <input
              type="text"
              disabled={!canManageAlerts}
              placeholder="+216..."
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white disabled:opacity-60 focus:outline-none focus:border-[#00C8E8]"
            />
          </div>
          <div className="flex flex-col justify-end gap-2 text-xs text-slate-300">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!canManageAlerts}
                checked={emailAlertsEnabled}
                onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                className="accent-[#00C8E8]"
              />
              Notify on score drops via Email (when SMTP configured)
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!canManageAlerts}
                checked={whatsappAlertsEnabled}
                onChange={(e) => setWhatsappAlertsEnabled(e.target.checked)}
                className="accent-[#00C8E8]"
              />
              Notify via WhatsApp Cloud API (when configured)
            </label>
          </div>
        </div>

        {orgMsg && <p className="text-xs text-emerald-400">{orgMsg}</p>}
        {orgErr && <p className="text-xs text-rose-400">{orgErr}</p>}

        {canManageAlerts && (
          <button
            type="submit"
            className="px-4 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-xs rounded-lg cursor-pointer"
          >
            Save Organization Settings
          </button>
        )}
      </form>

      {/* Team Members & Invitations */}
      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00C8E8]" />
          <h2 className="text-base font-bold text-white">Team Members & RBAC</h2>
        </div>

        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-[#060B14]">
          {members.map((m) => (
            <div key={m.userId} className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-white">{m.displayName}</div>
                <div className="text-slate-400">{m.email}</div>
              </div>
              <div className="flex items-center gap-3">
                {isOwner && m.userId !== user?.uid && m.role !== 'owner' ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value as OrgRole)}
                    className="bg-[#0D1628] border border-slate-700 rounded px-2.5 py-1 text-white"
                  >
                    <option value="admin">Administrator</option>
                    <option value="member">Read-only Member</option>
                  </select>
                ) : (
                  <span className="px-2.5 py-1 bg-[#0D1628] border border-slate-800 rounded capitalize text-slate-200">
                    {m.role === 'member' ? 'Read-only Member' : m.role}
                  </span>
                )}
                {isOwner && m.userId !== user?.uid && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.userId)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                    aria-label={`Remove ${m.email}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {canManageAlerts && (
          <form onSubmit={handleInvite} className="grid sm:grid-cols-12 gap-3 items-end pt-2">
            <div className="sm:col-span-6">
              <label className="block text-xs text-slate-400 mb-1">Invite Colleague Email</label>
              <input
                type="email"
                required
                placeholder="colleague@company.tn"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00C8E8]"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-slate-400 mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00C8E8]"
              >
                <option value="member">Read-only Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#00C8E8]" />
                Send Invite
              </button>
            </div>
          </form>
        )}
        {inviteMsg && <p className="text-xs text-emerald-400">{inviteMsg}</p>}
        {inviteErr && <p className="text-xs text-rose-400">{inviteErr}</p>}
      </div>

      {/* Personal Profile & TOTP 2FA */}
      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={handleSaveProfile} className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Your Profile</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono">Account Email: {user?.email}</div>
          {profileMsg && <p className="text-xs text-emerald-400">{profileMsg}</p>}
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Update Profile
          </button>
        </form>

        <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#00C8E8]" />
              <h2 className="text-base font-bold text-white">Two-Factor Authentication (TOTP)</h2>
            </div>
            <span className={`text-xs font-semibold ${totpRequired ? 'text-emerald-400' : 'text-slate-400'}`}>
              {totpRequired ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Protect organization access with an authenticator app (Google Authenticator, 1Password, or Authy).
          </p>

          {totpMsg && <p className="text-xs text-emerald-400">{totpMsg}</p>}
          {totpErr && <p className="text-xs text-rose-400">{totpErr}</p>}

          {!totpRequired && !totpEnroll && (
            <button
              type="button"
              onClick={handleStartTotp}
              className="px-4 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-xs rounded-lg cursor-pointer"
            >
              Enable TOTP 2FA
            </button>
          )}

          {totpEnroll && (
            <form onSubmit={handleConfirmTotp} className="space-y-3 bg-[#060B14] border border-slate-800 rounded-lg p-4">
              <img
                src={totpEnroll.qrCodeDataUrl}
                alt="TOTP QR Code"
                className="w-36 h-36 rounded bg-white p-1.5 mx-auto"
              />
              <div className="text-xs font-mono text-center text-slate-300 break-all">
                Secret: {totpEnroll.secret}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="6-digit code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-3 py-1.5 bg-[#0D1628] border border-slate-700 rounded text-xs text-white font-mono text-center"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#00C8E8] text-[#060B14] font-semibold text-xs rounded cursor-pointer inline-flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Confirm
                </button>
              </div>
            </form>
          )}

          {totpRequired && (
            <button
              type="button"
              onClick={handleDisableTotp}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Disable 2FA
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-[#0D1628] border border-rose-500/30 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          Account Deletion
        </div>
        <p className="text-xs text-slate-400">
          Permanently deletes your user profile, TOTP secret, and any organization where you are the owner. Type{' '}
          <strong className="text-white font-mono">DELETE</strong> below to confirm.
        </p>
        {deleteErr && <p className="text-xs text-rose-400">{deleteErr}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
            className="px-3 py-1.5 bg-[#060B14] border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-rose-500"
          />
          <button
            type="button"
            disabled={deleteConfirm !== 'DELETE' || deleteBusy}
            onClick={handleDeleteAccount}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-40"
          >
            {deleteBusy ? 'Deleting...' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
