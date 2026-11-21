import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import {
  acceptOrganizationInvitation,
  checkIsPlatformAdmin,
  createDefaultOrganization,
  deleteAccountData,
  ensureUserProfile,
  getTotpSecret,
  listPendingInvitationsForEmail,
  listPlans,
  listUserMemberships,
  syncDomainMemberAccess,
  updateUserProfile,
} from '../services/firestoreService';
import {
  AgentJobDoc,
  AuditLogDoc,
  DomainScanResult,
  EmailDeliveryLogDoc,
  MonitoredDomainDoc,
  NotificationDoc,
  OrganizationDoc,
  OrganizationMemberDoc,
  OrgRole,
  ServiceRequestDoc,
  StoredReportDoc,
  SubscriptionPlanDoc,
} from '../types/astasecure';
import { useLanguage } from './LanguageContext';

export interface StoredScanDoc extends DomainScanResult {
  id: string;
  domainId: string;
  triggeredBy: string;
  triggerType: 'manual' | 'scheduled' | 'recheck';
  createdAt?: unknown;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  totpRequired: boolean;
  totpVerified: boolean;
  totpSecretBase32: string | null;
  verifyTotpSession: () => void;
  isPlatformAdmin: boolean;
  profile: {
    displayName: string;
    activeOrgId?: string;
    totpEnabled: boolean;
  } | null;
  memberships: { orgId: string; orgName: string; role: OrgRole }[];
  activeOrg: OrganizationDoc | null;
  activeRole: OrgRole;
  domains: MonitoredDomainDoc[];
  scans: StoredScanDoc[];
  members: OrganizationMemberDoc[];
  auditLogs: AuditLogDoc[];
  serviceRequests: ServiceRequestDoc[];
  agentJobs: AgentJobDoc[];
  reports: StoredReportDoc[];
  emailLogs: EmailDeliveryLogDoc[];
  notifications: NotificationDoc[];
  unreadNotificationsCount: number;
  plans: SubscriptionPlanDoc[];
  pendingInvitations: {
    id: string;
    orgId: string;
    orgName: string;
    email: string;
    role: 'admin' | 'member';
    memberUids: string[];
  }[];
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (params: { email: string; password: string; name: string; orgName: string }) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUserVerification: () => Promise<boolean>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  acceptInvitation: (inv: {
    id: string;
    orgId: string;
    orgName: string;
    role: 'admin' | 'member';
    memberUids: string[];
  }) => Promise<void>;
  refreshTotpState: () => Promise<void>;
  deleteCurrentAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpVerified, setTotpVerified] = useState(false);
  const [totpSecretBase32, setTotpSecretBase32] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [profile, setProfile] = useState<{
    displayName: string;
    activeOrgId?: string;
    totpEnabled: boolean;
  } | null>(null);

  const [memberships, setMemberships] = useState<{ orgId: string; orgName: string; role: OrgRole }[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | undefined>(undefined);
  const [activeOrg, setActiveOrg] = useState<OrganizationDoc | null>(null);
  const [domains, setDomains] = useState<MonitoredDomainDoc[]>([]);
  const [scans, setScans] = useState<StoredScanDoc[]>([]);
  const [members, setMembers] = useState<OrganizationMemberDoc[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogDoc[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestDoc[]>([]);
  const [agentJobs, setAgentJobs] = useState<AgentJobDoc[]>([]);
  const [reports, setReports] = useState<StoredReportDoc[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailDeliveryLogDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanDoc[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<AuthContextValue['pendingInvitations']>([]);

  useEffect(() => {
    listPlans().then(setPlans).catch(() => {});
  }, []);

  const refreshTotpState = async () => {
    if (!auth.currentUser) return;
    const sec = await getTotpSecret(auth.currentUser.uid).catch(() => null);
    if (sec && sec.enabled) {
      setTotpSecretBase32(sec.secret);
      setTotpRequired(true);
    } else {
      setTotpSecretBase32(null);
      setTotpRequired(false);
      setTotpVerified(true);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setEmailVerified(false);
        setTotpRequired(false);
        setTotpVerified(false);
        setTotpSecretBase32(null);
        setIsPlatformAdmin(false);
        setProfile(null);
        setMemberships([]);
        setActiveOrgId(undefined);
        setActiveOrg(null);
        setDomains([]);
        setScans([]);
        setMembers([]);
        setAuditLogs([]);
        setServiceRequests([]);
        setAgentJobs([]);
        setReports([]);
        setEmailLogs([]);
        setNotifications([]);
        setPendingInvitations([]);
        setLoading(false);
        return;
      }

      setEmailVerified(firebaseUser.emailVerified);
      const adminStatus = await checkIsPlatformAdmin(firebaseUser.uid, firebaseUser.email);
      setIsPlatformAdmin(adminStatus);

      if (!firebaseUser.emailVerified) {
        setLoading(false);
        return;
      }

      try {
        const pendingOrgName = localStorage.getItem('astasecure_pending_org_name') || '';
        const prof = await ensureUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          preferredLang: lang,
        });

        const totpSec = await getTotpSecret(firebaseUser.uid).catch(() => null);
        if (totpSec && totpSec.enabled) {
          setTotpSecretBase32(totpSec.secret);
          setTotpRequired(true);
          const sessionOk = sessionStorage.getItem(`astasecure_2fa_${firebaseUser.uid}`) === 'ok';
          setTotpVerified(sessionOk);
        } else {
          setTotpRequired(false);
          setTotpVerified(true);
        }

        let userMems = await listUserMemberships(firebaseUser.uid);
        const invites = firebaseUser.email
          ? await listPendingInvitationsForEmail(firebaseUser.email).catch(() => [])
          : [];
        setPendingInvitations(invites);

        if (userMems.length === 0 && invites.length === 0) {
          const newOrgId = await createDefaultOrganization({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Owner',
            orgName: pendingOrgName || `${firebaseUser.displayName || 'My Company'} Security`,
            language: lang,
          });
          localStorage.removeItem('astasecure_pending_org_name');
          userMems = await listUserMemberships(firebaseUser.uid);
          setActiveOrgId(newOrgId);
        } else if (userMems.length > 0) {
          const preferred = prof?.activeOrgId && userMems.some((m) => m.orgId === prof.activeOrgId)
            ? prof.activeOrgId
            : userMems[0].orgId;
          setActiveOrgId(preferred);
        }

        setMemberships(userMems);
        setProfile({
          displayName: prof?.displayName || firebaseUser.displayName || 'User',
          activeOrgId: prof?.activeOrgId,
          totpEnabled: Boolean(prof?.totpEnabled),
        });
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Attach real-time Firestore listeners strictly when verified, 2FA cleared, and org selected
  useEffect(() => {
    if (!user || !emailVerified || (totpRequired && !totpVerified) || !activeOrgId) {
      return;
    }

    const orgRef = doc(db, 'organizations', activeOrgId);
    const unsubOrg = onSnapshot(
      orgRef,
      (snap) => {
        if (snap.exists()) {
          setActiveOrg({ id: snap.id, ...(snap.data() as Omit<OrganizationDoc, 'id'>) });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `organizations/${activeOrgId}`)
    );

    const domCol = collection(db, 'organizations', activeOrgId, 'domains');
    const unsubDom = onSnapshot(
      domCol,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MonitoredDomainDoc, 'id'>),
        }));
        setDomains(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `organizations/${activeOrgId}/domains`)
    );

    const scanCol = query(
      collection(db, 'organizations', activeOrgId, 'scans'),
      orderBy('createdAt', 'desc')
    );
    const unsubScan = onSnapshot(
      scanCol,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<StoredScanDoc, 'id'>),
        }));
        setScans(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `organizations/${activeOrgId}/scans`)
    );

    const memCol = collection(db, 'organizations', activeOrgId, 'members');
    const unsubMem = onSnapshot(
      memCol,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<OrganizationMemberDoc, 'id'>),
        }));
        setMembers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `organizations/${activeOrgId}/members`)
    );

    const logCol = query(
      collection(db, 'organizations', activeOrgId, 'auditLogs'),
      orderBy('createdAt', 'desc')
    );
    const unsubLog = onSnapshot(
      logCol,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AuditLogDoc, 'id'>),
        }));
        setAuditLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `organizations/${activeOrgId}/auditLogs`)
    );

    const reqCol = query(
      collection(db, 'organizations', activeOrgId, 'serviceRequests'),
      orderBy('createdAt', 'desc')
    );
    const unsubReq = onSnapshot(
      reqCol,
      (snap) => {
        setServiceRequests(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceRequestDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `organizations/${activeOrgId}/serviceRequests`)
    );

    const jobCol = query(
      collection(db, 'organizations', activeOrgId, 'agentJobs'),
      orderBy('createdAt', 'desc')
    );
    const unsubJob = onSnapshot(
      jobCol,
      (snap) => {
        setAgentJobs(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AgentJobDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `organizations/${activeOrgId}/agentJobs`)
    );

    const repCol = query(
      collection(db, 'organizations', activeOrgId, 'reports'),
      orderBy('createdAt', 'desc')
    );
    const unsubRep = onSnapshot(
      repCol,
      (snap) => {
        setReports(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredReportDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `organizations/${activeOrgId}/reports`)
    );

    const mailCol = query(
      collection(db, 'organizations', activeOrgId, 'emailLogs'),
      orderBy('createdAt', 'desc')
    );
    const unsubMail = onSnapshot(
      mailCol,
      (snap) => {
        setEmailLogs(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EmailDeliveryLogDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `organizations/${activeOrgId}/emailLogs`)
    );

    const notifCol = query(
      collection(db, 'organizations', activeOrgId, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsubNotif = onSnapshot(
      notifCol,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `organizations/${activeOrgId}/notifications`)
    );

    return () => {
      unsubOrg();
      unsubDom();
      unsubScan();
      unsubMem();
      unsubLog();
      unsubReq();
      unsubJob();
      unsubRep();
      unsubMail();
      unsubNotif();
    };
  }, [user, emailVerified, totpRequired, totpVerified, activeOrgId]);

  const activeRole: OrgRole =
    members.find((m) => m.userId === user?.uid)?.role ||
    memberships.find((m) => m.orgId === activeOrgId)?.role ||
    'member';

  // Auto-sync domain memberUids when owner/admin views org with newly joined members
  useEffect(() => {
    if (activeOrg && domains.length > 0 && (activeRole === 'owner' || activeRole === 'admin')) {
      syncDomainMemberAccess(activeOrg.id, domains, activeOrg.memberUids).catch(() => {});
    }
  }, [activeOrg?.memberUids.length, domains.length, activeRole]);

  const signInGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerEmail = async (params: {
    email: string;
    password: string;
    name: string;
    orgName: string;
  }) => {
    localStorage.setItem('astasecure_pending_org_name', params.orgName);
    const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.password);
    await updateProfile(cred.user, { displayName: params.name.trim() });
    await sendEmailVerification(cred.user);
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const refreshUserVerification = async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const verified = Boolean(auth.currentUser.emailVerified);
    setEmailVerified(verified);
    if (verified) {
      window.location.reload();
    }
    return verified;
  };

  const verifyTotpSession = () => {
    if (user) {
      sessionStorage.setItem(`astasecure_2fa_${user.uid}`, 'ok');
      setTotpVerified(true);
    }
  };

  const logout = async () => {
    if (user) {
      sessionStorage.removeItem(`astasecure_2fa_${user.uid}`);
    }
    await signOut(auth);
  };

  const switchOrganization = async (orgId: string) => {
    setActiveOrgId(orgId);
    if (user) {
      await updateUserProfile(user.uid, { activeOrgId: orgId });
    }
  };

  const acceptInvitation = async (inv: {
    id: string;
    orgId: string;
    orgName: string;
    role: 'admin' | 'member';
    memberUids: string[];
  }) => {
    if (!user) return;
    await acceptOrganizationInvitation({
      invitationId: inv.id,
      orgId: inv.orgId,
      orgName: inv.orgName,
      role: inv.role,
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Member',
      existingMemberUids: inv.memberUids,
    });
    const mems = await listUserMemberships(user.uid);
    setMemberships(mems);
    setPendingInvitations((prev) => prev.filter((p) => p.id !== inv.id));
    setActiveOrgId(inv.orgId);
  };

  const deleteCurrentAccount = async () => {
    if (!user) return;
    const ownedOrg = activeOrg && activeOrg.ownerId === user.uid ? activeOrg.id : undefined;
    await deleteAccountData(user.uid, ownedOrg);
    await deleteUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        emailVerified,
        totpRequired,
        totpVerified,
        totpSecretBase32,
        verifyTotpSession,
        isPlatformAdmin,
        profile,
        memberships,
        activeOrg,
        activeRole,
        domains,
        scans,
        members,
        auditLogs,
        serviceRequests,
        agentJobs,
        reports,
        emailLogs,
        notifications,
        unreadNotificationsCount: notifications.filter((n) => !n.read).length,
        plans,
        pendingInvitations,
        signInGoogle,
        signInEmail,
        registerEmail,
        sendResetEmail,
        resendVerification,
        refreshUserVerification,
        logout,
        switchOrganization,
        acceptInvitation,
        refreshTotpState,
        deleteCurrentAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
