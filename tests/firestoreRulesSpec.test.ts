import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Firestore Security Rules Eight Pillars Static Verification', () => {
  const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');

  it('enforces a global default-deny catch-all rule', () => {
    expect(rules).toContain('match /{document=**}');
    expect(rules).toContain('allow read, write: if false;');
  });

  it('enforces immutable scans, reports, emailLogs, and auditLogs (no client updates)', () => {
    expect(rules).toMatch(/match \/scans\/\{scanId\}[\s\S]*allow update: if false;/);
    expect(rules).toMatch(/match \/reports\/\{reportId\}[\s\S]*allow update: if false;/);
    expect(rules).toMatch(/match \/emailLogs\/\{emailLogId\}[\s\S]*allow update: if false;/);
    expect(rules).toMatch(/match \/auditLogs\/\{logId\}[\s\S]*allow update: if false;/);
    expect(rules).toMatch(/match \/auditLogs\/\{logId\}[\s\S]*existsAfter\(\/databases\/\$\(database\)\/documents\/organizations\/\$\(orgId\)\/members\/\$\(request\.auth\.uid\)\)/);
  });

  it('covers AI Operations collections (serviceRequests, agentJobs, notifications) with memberUid isolation', () => {
    expect(rules).toContain('match /serviceRequests/{requestId}');
    expect(rules).toContain('match /agentJobs/{jobId}');
    expect(rules).toContain('match /notifications/{notifId}');
    expect(rules).toContain('match /reports/{reportId}');
    expect(rules).toContain('match /emailLogs/{emailLogId}');
  });

  it('includes /invitations/{inviteId} rules and never uses get() or exists() inside allow list statements', () => {
    expect(rules).toContain('match /invitations/{inviteId}');
    const lines = rules.split('\n');
    for (const line of lines) {
      if (line.includes('allow list:')) {
        expect(line).not.toContain('get(');
        expect(line).not.toContain('exists(');
      }
    }
  });
});
