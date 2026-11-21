# AstaSecure Monitor — Technical Audit & Functional Verification Report

**Audit Date:** 2026-11-21  
**Auditor Role:** Technical Audit & Verification (Code, Backend API, Firestore Rules, DNS Engine, AI Agent, Email Transport, Security & Deployment)  
**Target Environment:** `/app/applet` (Node `v22.23.2`, Vite `8.3.8`, TypeScript `7.0.2`, Express `4.21.2`, Firebase Project `responsible-sunup-dvr20`)

---

## Executive Summary & Module Scorecard

This audit inspected the actual source code, backend API routes, Firebase rules/config, DNS & ownership engine, AI Operations orchestrator, SMTP notification client, PDF generator, and production build/runtime without redesigning UI or fabricating test passes.

**Overall Verification Commands Run Post-Fix:**
- `npm test`: **PASS** — 6 test files passed, **48 / 48 tests passed** (`tests/systemAuditVerification.test.ts` [19], `tests/aiAgentAndOperations.test.ts` [9], `tests/engineAndScoring.test.ts` [9], `tests/apiIntegration.test.ts` [3], `tests/domainValidator.test.ts` [4], `tests/firestoreRulesSpec.test.ts` [4]).
- `npm run lint:rules`: **PASS** — `@firebase/eslint-plugin-security-rules` passed with 0 errors across `firestore.rules` and `DRAFT_firestore.rules`.
- `npx tsc --noEmit`: **PASS** — 0 TypeScript compiler errors.
- `npm run build`: **PASS** — Vite production bundle built cleanly (`dist/index.html`, CSS, JS chunks).
- **Production Runtime Smoke (`NODE_ENV=production`)**: **PASS** — `createAppServer()` served `dist/index.html` (`200`), `/api/v1/health` (`200`), Helmet headers (`X-Frame-Options: SAMEORIGIN`), and rejected unauthenticated `/api/v1/admin/overview` (`401`).

### Honest Module Grading Matrix

| # | Module | Status | Summary |
|---|---|---|---|
| 1 | Public Website | **PASS** | All 10 routes + 4 legacy aliases return HTTP `200`; logo, SEO JSON-LD, localization (`en`/`fr`/`ar`), and empty contact form consent validation verified. |
| 2 | Authentication | **BLOCKED** (Email/Pwd) / **PASS** (Gates & 2FA) | Live Firebase Identity Toolkit probe returned `PASSWORD_LOGIN_DISABLED` — Email/Password login/register/reset are disabled in Firebase Console. Google OAuth, `EmailVerificationGate`, TOTP 2FA, and `requireAuth`/`requireVerifiedEmail` pass. |
| 3 | Organizations & RBAC | **PASS** | Org creation, membership, invitations, `owner`/`admin`/`member` RBAC, and `memberUids` tenant isolation rules verified & linted (`0` errors). |
| 4 | Domain Management | **PASS** | Strict validation, IP/internal TLD blocking, 7-day TXT token generation, and UI quota enforcement verified. Note: daily scan quota is client+rules scoped (see gap below). |
| 5 | DNS Ownership Verification | **PASS** | Dual-resolver confirmation (`1.1.1.1` & `8.8.8.8`), expired/malformed/single-resolver/timeout cases verified via controlled fixtures. **Fixed HMAC hex-truncation bug.** |
| 6 | DNS Engine (SPF/DKIM/DMARC/MX/NS/SOA/DNSSEC/CAA/TLS) | **PASS** | All 8 DNS checks + TLS check verified with controlled fixtures. **Fixed TLS SSRF vulnerability, DNSSEC single-resolver failure, and SPF/DMARC prefix regexes.** |
| 7 | Security Scoring & Integrity | **PASS** | `/100` deductions, `0` penalty on `not_verified`/`technical_error`, and HMAC signature tamper rejection verified (`403`). **Fixed hex-length validation.** |
| 8 | AI Operations Agent | **PASS** (Guardrails/Queue) / **BLOCKED** (Live E2E LLM Round-Trip) | Policy Engine, allowlisted tools, prompt-injection hold, `degraded_retryable` honesty, and 3-attempt retries verified. **Fixed Cross-User Job IDOR (`403`).** Live server reports `ai.configured: true` (`gemini-4-hydrogen`); full E2E LLM call not run without live user ID token + verified domain. |
| 9 | Email & Notifications | **BLOCKED** (Live SMTP Unconfigured) / **PASS** (STARTTLS Logic) | **Fixed broken port-587 plaintext auth bug** (implemented RFC 3207 `STARTTLS` upgrade + RFC 5321 multi-line parsing + CRLF/dot-stuffing; verified against ephemeral OpenSSL mock server). Runtime `SMTP_*` env vars remain unset. |
| 10 | PDF Security Reports | **PASS** | Real `%PDF-` buffers generated in EN & FR with official logo, `X-Report-SHA256` checksum, and `403` HMAC tamper rejection. |
| 11 | Admin Panel | **PASS** (Bootstrapped Admin) | Server `/api/v1/admin/overview` enforces `403 ADMIN_FORBIDDEN` for non-admins. Architectural limit: granted sub-admins cannot list cross-tenant collections due to Firestore `list` rule constraints (`isBootstrappedAdmin()`). |
| 12 | Platform Security | **PASS** (Hardened; 3 Bugs Fixed + Env Notes) | Helmet, rate limiters, `1mb` payload cap (`413`), and Firestore rules verified. Upstream `@grpc/grpc-js` has 2 transitive advisories; `SCAN_SIGNING_SECRET` should be set explicitly in production. |
| 13 | Build & Deployment | **PASS** | `vite build` + `NODE_ENV=production` Express startup verified on `0.0.0.0`. |

---

## Security & Functional Bugs Discovered and Fixed During Audit

### 1. Cross-User AI Operations Job IDOR (`server/routes/api.ts`, `server/agent/orchestrator.ts`) — **CRITICAL/HIGH — FIXED**
- **Root Cause**: `GET /api/v1/agent/jobs/:jobId` and `POST /api/v1/agent/jobs/retry` checked `requireAuth` only without verifying whether `stored.input.actorUid === req.user.uid` (or `req.user.isPlatformAdmin`). Additionally, `retryAgentServiceJob` overwrote `actorUid` with the caller's UID.
- **Fix Applied**: Added `getServerAgentJobForActor(jobId, uid, isPlatformAdmin)` and enforced ownership checks inside both `GET /api/v1/agent/jobs/:jobId`, `POST /api/v1/agent/jobs/retry` (returning `403 JOB_ACCESS_FORBIDDEN`), and `retryAgentServiceJob` itself (throws `FORBIDDEN_JOB_ACCESS`). Also clamped `body.actorRole` on `/agent/jobs/execute` strictly to `'owner' | 'admin' | 'member'`.
- **Verification**: Covered by `tests/systemAuditVerification.test.ts` (User B attempting `GET` or `POST /retry` on User A's job receives HTTP `403`).

### 2. Server-Side Request Forgery (SSRF) in TLS Certificate Check (`server/engine/scanner.ts`) — **HIGH — FIXED**
- **Root Cause**: `runTlsCertificateCheck(domain)` invoked `tls.connect({ host: domain, port: 443 })` directly. A verified customer domain temporarily pointed to `127.0.0.1`, `169.254.169.254` (cloud metadata), `10.0.0.0/8`, or `::1` would induce the backend to connect to internal sockets.
- **Fix Applied**: Added `isPublicRoutableIp(ip)` and pre-connection `A`/`AAAA` DNS resolution via `queryWithFallback`. Connections to loopback, RFC1918, CGNAT (`100.64.0.0/10`), link-local/metadata (`169.254.0.0/16`), ULA/multicast IPv6, or IPv4-mapped private IPv6 are aborted before any socket opens (`status: 'not_verified'`, `0` points deducted), and valid public targets connect directly to the validated IP with TLS SNI (`servername: domain`) to prevent DNS rebinding TOCTOU.
- **Verification**: Covered by `tests/systemAuditVerification.test.ts` across 15 private/reserved IPv4 & IPv6 vectors.

### 3. Node `Buffer.from(..., 'hex')` Signature Truncation Bypass (`server/engine/ownershipVerifier.ts`, `server/engine/scorer.ts`) — **HIGH — FIXED**
- **Root Cause**: Calling `Buffer.from(sig, 'hex')` in Node.js silently stops at the first non-hex character. Appending non-hex trailing characters to a valid proof token (`${proof}tamper`) caused `Buffer.from(pSig, 'hex')` to decode only the valid 32-byte prefix, unexpectedly passing `crypto.timingSafeEqual`!
- **Fix Applied**: Enforced strict `/^[0-9a-f]{64}$/i` regex validation on `pSig` in `verifyOwnershipProof` and `params.integritySig` in `verifyScanSignature` prior to hex decoding.
- **Verification**: Verified in `tests/systemAuditVerification.test.ts` (`${proof}tamper` and mid-signature tampering both return `false`).

### 4. Broken SMTP `STARTTLS` Upgrade on Port 587 (`server/services/notifications.ts`) — **HIGH (Functional) — FIXED**
- **Root Cause**: `dispatchEmailAlert` connected with plain `net.connect` on port 587 and sent `AUTH LOGIN` without issuing `STARTTLS` or upgrading the socket to `tls.TLSSocket`, and lacked RFC 5321 multi-line response accumulation (`250-` vs final `250 `), SMTP `DATA` dot-stuffing, and `From`/`To` CRLF sanitization.
- **Fix Applied**: Implemented full RFC 3207 `STARTTLS` upgrade (`EHLO` -> `STARTTLS` -> `tls.connect({ socket, servername })` -> `EHLO` -> `AUTH LOGIN`), RFC 5321 multi-line reply buffering, RFC 5321 `DATA` leading-dot escaping, header `\r\n` stripping, and RFC 6066 IP SNI avoidance (`net.isIP`).
- **Verification**: Verified in `tests/systemAuditVerification.test.ts` against an ephemeral OpenSSL self-signed TLS mock SMTP server (`STARTTLS` upgrade confirmed, injected header stripped, `.DotLine` dot-stuffed, and `535` auth failure honestly returns `sent: false`).

### 5. DNSSEC Missing Google DoH Fallback & SPF/DMARC Prefix Edge Cases (`server/engine/scanner.ts`, `firebase-blueprint.json`) — **MEDIUM/LOW — FIXED**
- **Fix Applied**:
  - Updated `runDnssecCheck` from Cloudflare-only `queryDohResolver` to `queryWithFallback(..., true)` so Google `8.8.8.8` DoH handles Cloudflare transient failures.
  - Tightened SPF regex (`/^v=spf1(?:\s|$)/i`) and DMARC regex (`/^v=DMARC1(?:\s*;|\s|$)/`) so malformed records (`v=spf10`, `v=DMARC10`) are rejected, and added integer bounds validation (`0..100`) for DMARC `pct=`.
  - Synced `OrganizationMember` entity schema in `firebase-blueprint.json` with `memberUids` and `invitationId` enforced in `firestore.rules`.

---

## Detailed Module-by-Module Findings & PoC Verification

### Module 1 — Public Website (`PASS`)
- Verified all 10 routes (`/`, `/features`, `/how-it-works`, `/pricing`, `/about`, `/contact`, `/faq`, `/privacy`, `/terms`, `/scanning`) plus 4 legacy aliases (`/services`, `/solutions`, `/monitor`, `/why-us`) serve HTTP `200` on `http://127.0.0.1:3000`.
- Verified official logo PNG (`/assets/aistudio/Logo_futuriste_ASTASECURE_sur_fond_noir_581a41ea.png`) serves HTTP `200`, `index.html` embeds Schema.org JSON-LD + OpenGraph tags synced to `metadata.json`.
- Contact form (`PublicSite.tsx`) initializes empty fields, validates domain syntax via `/api/v1/domains/validate`, enforces consent (`POST /api/v1/contact/notify` returns `400` when `consentAccepted: false`), stores in Firestore `contactInquiries`, and reports honest SMTP status (`unconfigured` when `SMTP_*`/`CONTACT_RECIPIENT_EMAIL` are unset).

### Module 2 — Authentication (`BLOCKED` Live Email/Password / `PASS` Code & Gates)
- **Live Probe (`accounts:signInWithPassword` against Firebase Identity Toolkit)**: Returned HTTP `400` `"PASSWORD_LOGIN_DISABLED"`.
  - **Impact**: End-user email/password signup, email login, and password reset cannot succeed until Email/Password sign-in is enabled in Firebase Console (`Authentication -> Sign-in method -> Email/Password`). `AuthViews.tsx` cleanly surfaces an explicit guidance notice when `auth/operation-not-allowed` occurs.
- **Verified Passing Components**: `App.tsx` gates unverified emails (`EmailVerificationGate`) and TOTP-enrolled sessions (`TotpChallengeGate`); backend `requireAuth` (`firebase-admin/auth`) and `requireVerifiedEmail` reject unauthenticated calls (`401`) and unverified tokens (`403 EMAIL_NOT_VERIFIED`); TOTP 2FA QR generation + RFC 6238 validation verified via `tests/engineAndScoring.test.ts`.

### Module 3 — Organizations (`PASS`)
- Verified via `firestore.rules` + `tests/firestoreRulesSpec.test.ts` + `npm run lint:rules`:
  - `organizations/{orgId}` enforces `ownerId == request.auth.uid`, `plan == 'free'`, `domainLimit == 1`, `scanQuotaDaily == 5` on self-creation alongside atomic creation of `members/{uid}`.
  - `invitations/{inviteId}` validates inviter role (`isOrgAdminOrOwner`), binds recipient email to `request.auth.token.email`, and prevents role escalation on acceptance.
  - Note: Removing a member deletes `members/{uid}` and strips their UID from `org.memberUids` and `users/{uid}/memberships/{orgId}`; `isOrgMember(orgId)` immediately blocks `get` access, while historical immutable `scans` retain the historical `memberUids` field.

### Module 4 — Domain Management (`PASS`)
- Syntax validator rejects IPv4/IPv6 (`400 IP_ADDRESS_FORBIDDEN`), URLs/ports/`@` (`CONTAINS_PROTOCOL_OR_PATH`), wildcards (`WILDCARD_FORBIDDEN`), and reserved internal TLDs (`.local`, `.internal`, `.localhost`, `.invalid`, `.test`, `.arpa`, `.example`).
- Generates cryptographically random `astasecure-verify=<32hex>` TXT tokens with 7-day expiry (`generateOwnershipToken`).
- **Architectural Gap**: `domainLimit` and `scanQuotaDaily` are checked client-side (`DomainsView.tsx`, `AppWorkspace.tsx`) and rate-limited server-side (`30` scans / `15` min via `scanRateLimiter`), because starter-tier server routes do not query Firestore Admin DB directly. Server-side per-plan quota enforcement is recommended upon backend DB migration.

### Module 5 & 6 — DNS Ownership Verification & DNS Engine (`PASS` under Controlled Fixtures)
- **Compliance**: Zero unauthorized third-party domains were scanned during this audit.
- Dual-resolver verification requires BOTH Cloudflare (`1.1.1.1`) and Google (`8.8.8.8`) to observe the valid unexpired TXT record before issuing an HMAC-SHA256 `ownershipProof`.
- Verified all 8+1 checks (`DMARC`, `SPF`, `DKIM`, `MX`, `NS`, `SOA`, `DNSSEC`, `CAA`, `TLS`), provider detection across all 10 DNS hosts, DKIM anti-false-missing rule (`not_verified` = `0` pts when no custom selector matches), Null MX (`0 .`), SPF `+all` / `>10` lookups, DMARC `p=none`/`p=quarantine`/`p=reject`/`pct`, and TLS SSRF IP rejection.

### Module 7 — Security Scoring (`PASS`)
- Deductions verified: Critical (`-25`), High (`-15`), Medium (`-8`), Low (`-3`), floored at `0`.
- `not_verified` and `technical_error` strictly yield `0` deductions even if injected with non-zero points.
- `signScanResult` & `verifyScanSignature` reject tampered scores/checks (`403 INTEGRITY_CHECK_FAILED`).

### Module 8 — AI Operations Agent (`PASS` Policy & Queue / `BLOCKED` Live LLM Round-Trip)
- **Live Server Inspection**: `GET /api/v1/health` on port `3000` reports `{"provider":"gemini","model":"gemini-4-hydrogen","configured":true}` (key injected by AI Studio dev server runtime; unset in isolated shell tests).
- **Verified Guardrails**: Only allowlisted passive tools (`validate_domain_scope`, `verify_domain_ownership`, `run_passive_dns_scan`, `generate_remediation_plan`, `generate_pdf_report`, `dispatch_notification_email`) can run. Prohibited tools (`modify_dns`, `delete_organization`, `export_other_tenant`, `penetration_test`, `port_scan`, `read_env_secrets`), `member` role, cross-tenant `targetOrgId`, and prompt-injection / secret-probing text are blocked (`UNTRUSTED_INPUT_HOLD` / `TOOL_NOT_ALLOWLISTED` / `INSUFFICIENT_ROLE`).
- **Honest Degradation & Retries**: When `GEMINI_API_KEY` is absent or AI fails, `aiProvider.ts` marks jobs `degraded_retryable` without fabricating narratives; up to 3 retry attempts are tracked; attempt 4 stops as `failed`.
- **Limitation**: `serverJobQueue` is in-memory (`Map`), so server restarts clear runtime retry contexts (`AiOperationsView` falls back to re-submitting via `/agent/jobs/execute`). Live E2E `models/gemini-4-hydrogen` call was not invoked in automated tests due to absent shell API key + policy against scanning external domains.

### Module 9 — Email (`BLOCKED` Live Relay / `PASS` SMTP Client)
- Runtime `GET /api/v1/health` confirms `emailConfigured: false`, `whatsappConfigured: false`, `contactRecipientEmail: null`.
- Client (`dispatchEmailAlert`) now properly handles `STARTTLS` upgrade, multi-line EHLO, CRLF stripping, and dot-stuffing (verified against local OpenSSL TLS mock server), and refuses to claim delivery when unconfigured or rejected (`535`).

### Module 10 — PDF Reports (`PASS`)
- Authenticated `POST /api/v1/reports/pdf` verified end-to-end: validates HMAC signature (`403` if tampered), renders EN and FR PDFKit reports (>1.5 KB, `%PDF-` header), embeds official AstaSecure logo, includes ANCS Decree-Law No. 2023-17 disclaimer, and sets `X-Report-SHA256`.

### Module 11 — Admin Panel (`PASS` Bootstrapped Admin / Architectural Caveat)
- `GET /api/v1/admin/overview` enforces `requireAuth` (`401`) and `requirePlatformAdmin` (`403 ADMIN_FORBIDDEN` for regular users, `200` for bootstrapped admin `nassimjarboui111@gmail.com`).
- **Architectural Limitation**: Firestore Security Rules forbid `get()`/`exists()` calls inside collection `list` queries on several collections; therefore `firestore.rules` `allow list` on `/users`, `/admins`, `/contactInquiries`, and cross-tenant `/organizations` grants list access to `isBootstrappedAdmin()` (`nassimjarboui111@gmail.com`). Additional platform admins granted via `/admins/{uid}` cannot list cross-tenant collections via client SDK until backed by Firebase Admin Firestore endpoints.

### Module 12 — Platform Security (`PASS` with Notes)
- Helmet headers verified (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `COOP: same-origin-allow-popups`).
- Express JSON body limit (`1mb`) verified (`413` on oversized payload).
- Rate limiters configured on API (`120/min`), scans (`30/15min`), verification (`40/10min`), TOTP (`15/5min`) — currently in-memory `MemoryStore` (per-instance on Cloud Run).
- **Signing Secret Note**: `ENV.scanSigningSecret` falls back to a deterministic hash derived from public `projectId` + `APP_URL` if `SCAN_SIGNING_SECRET` is unset — **set a strong random `SCAN_SIGNING_SECRET` before production launch**.
- **Dependency Audit (`bun audit`)**: 2 transitive advisories in `@grpc/grpc-js` (`GHSA-m9gg-hp2v-232j` High, `GHSA-f596-whhp-79r4` Low) pulled by `firebase` / `firebase-admin`.

### Module 13 — Deployment (`PASS`)
- `vite build` builds cleanly into `dist/`; `server.ts` serves `dist/` SPA fallback in `NODE_ENV=production` cleanly on `0.0.0.0:${PORT}`.

---

## Security Summary (Post-Audit PoC Verification)

### Security Findings Resolved
1. **Cross-User AI Job IDOR** (`server/routes/api.ts`, `server/agent/orchestrator.ts`) — Fixed & verified via `403 JOB_ACCESS_FORBIDDEN` HTTP PoC.
2. **TLS Check SSRF** (`server/engine/scanner.ts`) — Fixed via `isPublicRoutableIp()` blocking `127.0.0.1`, `169.254.169.254`, RFC1918, CGNAT, and internal IPv6 prior to socket connect.
3. **Node Hex Truncation in HMAC Verification** (`server/engine/ownershipVerifier.ts`, `server/engine/scorer.ts`) — Fixed via strict `/^[0-9a-f]{64}$/i` check before `Buffer.from(..., 'hex')`.
4. **Insecure Port-587 Plaintext SMTP Auth** (`server/services/notifications.ts`) — Fixed via RFC 3207 `STARTTLS` socket upgrade and CRLF/dot-stuffing hardening.

### PoC Verification Summary
- All security boundaries (unauthenticated `401`, unverified email `403`, non-admin `/admin/overview` `403`, cross-user job `GET`/`POST /retry` `403`, forged scan HMAC PDF `403`, TLS `169.254.169.254` SSRF block, `>1MB` payload `413`, trailing-garbage HMAC proof rejection) are regression-tested in `tests/systemAuditVerification.test.ts` and passed `48/48` in `npm test`.

---

## Setup Checklist for Blocked External Integrations

1. **Enable Email/Password Authentication (Fixes Module 2 `BLOCKED`)**:
   - Open Firebase Console for project `responsible-sunup-dvr20` -> **Authentication** -> **Sign-in method** -> Enable **Email/Password**.
2. **Configure Production Secrets (Fixes Module 9 `BLOCKED` & Hardens Module 12)**:
   - Set strong random **`SCAN_SIGNING_SECRET`** (32+ random bytes hex) in runtime secrets.
   - Set **`SMTP_HOST`**, **`SMTP_PORT`** (`587` for STARTTLS or `465` for implicit TLS), **`SMTP_USER`**, **`SMTP_PASS`**, **`SMTP_FROM`**, and **`CONTACT_RECIPIENT_EMAIL`** to activate live email alerts & contact routing.
   - Optionally set **`WHATSAPP_API_TOKEN`** and **`WHATSAPP_PHONE_ID`** for WhatsApp Business Cloud alerts.
   - Verify **`GEMINI_API_KEY`** is injected in production environment secrets for live `gemini-4-hydrogen` AI Operations planning/narratives (already active in dev runtime).
3. **Optional Scale Hardening (Post-Starter Tier)**:
   - Replace in-memory `serverJobQueue` & `MemoryStore` rate limiter with PostgreSQL/Redis (`DATABASE_URL` already modeled in `ENV`) and enforce `scanQuotaDaily` server-side via Firebase Admin / PostgreSQL.
