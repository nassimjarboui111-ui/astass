import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import type { DomainScanResult } from '../../src/types/astasecure.ts';

export interface PdfReportRequest {
  organizationName: string;
  language: 'en' | 'fr';
  scan: DomainScanResult;
}

const LABELS = {
  en: {
    reportTitle: 'Domain & Email Security Assessment Report',
    tagline: 'Protecting Businesses. Empowering Growth.',
    organization: 'Organization',
    domain: 'Domain',
    scanDate: 'Scan Date (UTC)',
    dnsProvider: 'Detected DNS Provider',
    overallScore: 'Overall Security Score',
    riskPoints: 'Risk Points',
    execSummary: 'Executive Summary',
    summaryHigh: 'Strong technical email and DNS posture. Maintain continuous monitoring and enforce DMARC at p=reject.',
    summaryMed: 'Moderate protection. Priority anti-spoofing or DNS configuration fixes are required to prevent domain impersonation.',
    summaryLow: 'High exposure to domain spoofing and phishing. Address Critical and High findings immediately using the guided fixes.',
    checksHeading: 'Technical Security Checks & Evidence',
    statusLabels: {
      confirmed: 'Confirmed',
      missing: 'Missing',
      not_verified: 'Not Verified',
      technical_error: 'Technical Error',
    },
    severity: 'Severity',
    pointsRemoved: 'Points Deducted',
    resolver: 'Resolver Queried',
    evidence: 'Observed DNS Evidence',
    noRecords: 'No matching DNS records returned.',
    recommendedFix: 'Recommended Remediation',
    proposedRecord: 'Suggested DNS Record',
    finalAssessment: 'Final Assessment & Compliance Notice',
    disclaimer:
      'AstaSecure Monitor provides passive, authorized technical DNS/email configuration checks and guided remediation. This report is an operational pre-assessment and does not constitute a regulated cybersecurity audit reserved for ANCS-certified auditors under Tunisian Decree-Law No. 2023-17.',
    fingerprint: 'Report Integrity SHA-256',
  },
  fr: {
    reportTitle: 'Rapport d\'Évaluation Sécurité Domaine & E-mail',
    tagline: 'Protéger les entreprises. Accélérer leur croissance.',
    organization: 'Organisation',
    domain: 'Domaine',
    scanDate: 'Date du scan (UTC)',
    dnsProvider: 'Fournisseur DNS détecté',
    overallScore: 'Score de sécurité global',
    riskPoints: 'Points de risque',
    execSummary: 'Synthèse exécutive',
    summaryHigh: 'Posture technique e-mail et DNS solide. Maintenez la surveillance continue et l\'application DMARC (p=reject).',
    summaryMed: 'Protection intermédiaire. Des actions prioritaires sont nécessaires pour empêcher l\'usurpation de votre domaine.',
    summaryLow: 'Exposition élevée à l\'usurpation et au phishing. Corrigez en priorité les alertes Critiques et Élevées.',
    checksHeading: 'Contrôles techniques & preuves DNS',
    statusLabels: {
      confirmed: 'Confirmé',
      missing: 'Manquant',
      not_verified: 'À vérifier',
      technical_error: 'Erreur technique',
    },
    severity: 'Gravité',
    pointsRemoved: 'Points retirés',
    resolver: 'Résolveur interrogé',
    evidence: 'Preuve DNS observée',
    noRecords: 'Aucun enregistrement DNS correspondant.',
    recommendedFix: 'Action recommandée',
    proposedRecord: 'Enregistrement DNS proposé',
    finalAssessment: 'Évaluation finale & mention légale',
    disclaimer:
      'AstaSecure Monitor effectue des contrôles techniques passifs et autorisés de configuration DNS/e-mail ainsi qu\'un accompagnement à la remédiation. Ce rapport constitue une pré-évaluation technique et ne remplace pas un audit réglementaire réservé aux auditeurs certifiés par l\'ANCS (Décret-loi n° 2023-17).',
    fingerprint: 'Empreinte SHA-256 du rapport',
  },
} as const;

export async function generateScanPdfBuffer(req: PdfReportRequest): Promise<{ buffer: Buffer; sha256: string }> {
  const t = LABELS[req.language];
  const { scan } = req;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 46, info: {
      Title: `AstaSecure Monitor - ${scan.domain}`,
      Author: 'AstaSecure Monitor',
      Subject: t.reportTitle,
    }});

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      resolve({ buffer, sha256 });
    });

    // Dark Header Banner
    doc.rect(0, 0, doc.page.width, 102).fill('#0A1120');

    const logoPath = path.resolve(process.cwd(), 'public/assets/aistudio/Logo_futuriste_ASTASECURE_sur_fond_noir_581a41ea.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 42, 16, { height: 70 });
      } catch {
        // Ignore image decoding edge cases
      }
    }

    doc.fillColor('#00C8E8').fontSize(11).font('Helvetica-Bold').text('ASTASECURE MONITOR', 130, 26);
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(t.reportTitle, 130, 42);
    doc.fillColor('#94A3B8').fontSize(9.5).font('Helvetica').text(t.tagline, 130, 66);

    doc.y = 122;

    // Metadata Grid
    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text(`${t.organization}: `, { continued: true }).font('Helvetica').text(req.organizationName);
    doc.font('Helvetica-Bold').text(`${t.domain}: `, { continued: true }).font('Helvetica').text(scan.domain);
    doc.font('Helvetica-Bold').text(`${t.scanDate}: `, { continued: true }).font('Helvetica').text(scan.scannedAtIso);
    doc.font('Helvetica-Bold').text(`${t.dnsProvider}: `, { continued: true }).font('Helvetica').text(scan.detectedProviderLabel);

    doc.moveDown(0.8);

    // Score Box
    const boxY = doc.y;
    const scoreColor = scan.score >= 80 ? '#23936A' : scan.score >= 55 ? '#D9A21B' : '#D64545';
    doc.roundedRect(46, boxY, doc.page.width - 92, 68, 6).fillAndStroke('#F3F6FA', '#CBD5E1');
    doc.fillColor(scoreColor).fontSize(26).font('Helvetica-Bold').text(`${scan.score} / 100`, 62, boxY + 14);
    doc.fillColor('#475569').fontSize(9.5).font('Helvetica').text(`${t.overallScore} · ${t.riskPoints}: ${scan.riskPoints}`, 62, boxY + 46);

    const summaryText = scan.score >= 80 ? t.summaryHigh : scan.score >= 55 ? t.summaryMed : t.summaryLow;
    doc.fillColor('#1E293B').fontSize(9.5).font('Helvetica').text(summaryText, 210, boxY + 18, {
      width: doc.page.width - 270,
    });

    doc.y = boxY + 84;

    // Executive Summary Heading
    doc.fillColor('#101D35').fontSize(13).font('Helvetica-Bold').text(t.checksHeading);
    doc.moveTo(46, doc.y + 3).lineTo(doc.page.width - 46, doc.y + 3).strokeColor('#00C8E8').lineWidth(1).stroke();
    doc.moveDown(0.8);

    for (const check of scan.checks) {
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }

      const statusLabel = t.statusLabels[check.status];
      const badgeColor =
        check.status === 'confirmed' && check.severity === 'none'
          ? '#23936A'
          : check.severity === 'critical' || check.severity === 'high'
            ? '#D64545'
            : check.severity === 'medium'
              ? '#D9A21B'
              : '#5F6E86';

      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(`${check.name}`, { continued: true });
      doc.fillColor(badgeColor).fontSize(10).font('Helvetica-Bold').text(`   [${statusLabel} · ${check.severity.toUpperCase()} · -${check.pointsRemoved} pts]`);

      doc.fillColor('#334155').fontSize(9.5).font('Helvetica').text(check.summary);
      doc.fillColor('#475569').fontSize(8.5).text(`${t.resolver}: ${check.evidence.resolver} · ${check.evidence.recordType} (${check.evidence.queryName})`);

      const rawList = check.evidence.rawRecords.length > 0
        ? check.evidence.rawRecords.slice(0, 3).join(' | ')
        : t.noRecords;
      doc.fillColor('#0F172A').font('Courier').fontSize(8).text(`${t.evidence}: ${rawList}`);

      if (check.pointsRemoved > 0 || check.status === 'not_verified') {
        doc.fillColor('#007E93').font('Helvetica-Bold').fontSize(8.5).text(`${t.recommendedFix}: `, { continued: true })
          .fillColor('#1E293B').font('Helvetica').text(check.recommendedAction);
        if (check.proposedRecord) {
          doc.fillColor('#334155').font('Courier').fontSize(8)
            .text(`${t.proposedRecord}: ${check.proposedRecord.type} ${check.proposedRecord.name} -> ${check.proposedRecord.value}`);
        }
      }

      doc.moveDown(0.6);
      doc.moveTo(46, doc.y).lineTo(doc.page.width - 46, doc.y).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      doc.moveDown(0.5);
    }

    if (doc.y > doc.page.height - 130) {
      doc.addPage();
    }

    doc.moveDown(0.5);
    doc.fillColor('#101D35').fontSize(12).font('Helvetica-Bold').text(t.finalAssessment);
    doc.moveDown(0.3);
    doc.fillColor('#475569').fontSize(8.8).font('Helvetica').text(t.disclaimer);
    doc.moveDown(0.4);
    const sigShort = crypto.createHash('sha256').update(scan.integritySig).digest('hex');
    doc.fillColor('#64748B').font('Courier').fontSize(8).text(`${t.fingerprint}: ${sigShort}`);

    doc.end();
  });
}
