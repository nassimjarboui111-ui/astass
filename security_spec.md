# AstaSecure Monitor — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Organization Isolation (Tenant Boundary)**: Every organization-scoped resource (`domains`, `scans`, `members`, `invitations`, `auditLogs`) belongs to a single `orgId`. No user outside `/organizations/{orgId}/members/{uid}` may read, list, create, update, or delete resources in that organization.
2. **RBAC Role Enforcement**:
   - `owner`: Full read/write access to organization settings, domains, scans, member invitations, and deletion.
   - `admin`: Can manage domains, run scans, and invite/remove read-only members; cannot delete the organization or demote the owner.
   - `member` (Read-only Member): Read-only access to domains, scans, reports, and audit logs. Strictly forbidden from creating, updating, or deleting domains, scans, invitations, or organization settings.
   - Platform Administrator (`/admins/{uid}`): Can read/manage plans, contact inquiries, and platform-level organization/user moderation. Never self-assigned by client writes.
3. **Mandatory Email Verification**: All standard writes require `request.auth.token.email_verified == true`.
4. **No Client-Side Score Manipulation**: Scan scores and check results originate from the backend DNS engine (`/api/v1/scans/run`) accompanied by a server-computed HMAC-SHA256 `integritySig` verified before PDF export or audit inspection.
5. **No Scan Without Ownership Verification**: The server scanning engine refuses any domain without a valid, active DNS TXT ownership token verified on two independent public resolvers (`1.1.1.1` and `8.8.8.8`).
6. **Immutable Audit Logs**: `/organizations/{orgId}/auditLogs/{logId}` documents are append-only (`allow update: if false`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-Tenant Domain Read**: Authenticated User B attempts `getDoc('/organizations/orgA/domains/dom1')`. Expect `PERMISSION_DENIED`.
2. **Cross-Tenant List Scraping**: Authenticated User B queries `getDocs('/organizations/orgA/scans')`. Expect `PERMISSION_DENIED`.
3. **Self-Assigned Platform Admin**: Standard user attempts `setDoc('/admins/' + uid, { email: user.email })`. Expect `PERMISSION_DENIED`.
4. **Self-Assigned Org Role Escalation**: A `member` (read-only) attempts `updateDoc('/organizations/orgA/members/' + uid, { role: 'owner' })`. Expect `PERMISSION_DENIED`.
5. **Read-Only Member Creating Domain**: A `member` attempts `setDoc('/organizations/orgA/domains/dom2', {...})`. Expect `PERMISSION_DENIED`.
6. **Read-Only Member Deleting Scan**: A `member` attempts `deleteDoc('/organizations/orgA/scans/scan1')`. Expect `PERMISSION_DENIED`.
7. **Shadow Field Injection on Domain Create**: An `owner` sends `{ ..., isAdminOverride: true }` on domain creation. Expect `PERMISSION_DENIED` (`hasOnly` check).
8. **ID Poisoning (1.5KB Document ID)**: User attempts to write `/organizations/orgA/domains/${'a'.repeat(1500)}`. Expect `PERMISSION_DENIED` (`isValidId` <= 128 chars).
9. **Spoofed Timestamp on Scan**: Owner attempts to create a scan with `createdAt: new Date('2020-01-01')` instead of `request.time`. Expect `PERMISSION_DENIED`.
10. **Audit Log Tampering**: Owner attempts `updateDoc('/organizations/orgA/auditLogs/log1', { action: 'harmless' })`. Expect `PERMISSION_DENIED`.
11. **Unverified Email Write**: User with `email_verified: false` attempts to create an organization. Expect `PERMISSION_DENIED`.
12. **PII Leak on Users Collection**: Authenticated User B attempts `getDoc('/users/' + uidA)` or `getDoc('/users/' + uidA + '/secrets/totp')`. Expect `PERMISSION_DENIED`.
