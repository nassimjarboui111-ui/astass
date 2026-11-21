import React from 'react';
import { CheckCircle2, FileText, Lock, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ShowcaseProps {
  variant?: 'overview' | 'remediation';
}

const SAMPLE_CHECKS = [
  { code: 'DMARC', state: 'Confirmed', detail: 'v=DMARC1; p=reject; rua=mailto:sec@example-sme.tn', impact: '0' },
  { code: 'SPF', state: 'Confirmed', detail: 'v=spf1 include:_spf.google.com ~all (3/10 lookups)', impact: '0' },
  { code: 'DKIM', state: 'Confirmed', detail: 'Selector google._domainkey verified (2048-bit RSA)', impact: '0' },
  { code: 'DNSSEC', state: 'Missing', detail: 'No DS delegation key published at parent registry', impact: '-15' },
  { code: 'CAA', state: 'Missing', detail: 'No Certificate Authority restriction policy set', impact: '-8' },
  { code: 'TLS / HTTPS', state: 'Confirmed', detail: 'Valid chain · 142 days remaining before expiry', impact: '0' },
];

export const MonitorShowcaseVisual: React.FC<ShowcaseProps> = ({ variant = 'overview' }) => {
  const { lang } = useLanguage();

  const labels =
    lang === 'fr'
      ? {
          previewTag: 'Aperçu produit · AstaSecure Monitor',
          sampleDomain: 'domaine-exemple.tn',
          scoreTitle: 'Indice de posture DNS & e-mail',
          scoreSub: 'Calcul pondéré fondé sur les preuves observées',
          checksHeader: 'Preuves techniques passives (résolveurs 1.1.1.1 & 8.8.8.8)',
          remediationTitle: 'Guide de correction prêt à copier',
          remediationHost: 'Hébergeur détecté : Cloudflare DNS',
          remediationStep1: '1. Ajouter un enregistrement CAA pour restreindre l’émission de certificats TLS.',
          remediationStep2: '2. Activer la signature DNSSEC et publier l’enregistrement DS auprès du bureau d’enregistrement.',
          reportTitle: 'Rapport exécutif PDF bilingue',
          reportMeta: 'Export EN / FR · Empreinte d’intégrité SHA-256 incluse',
        }
      : lang === 'ar'
        ? {
            previewTag: 'معاينة المنتج · AstaSecure Monitor',
            sampleDomain: 'example-sme.tn',
            scoreTitle: 'مؤشر جاهزية النطاق والبريد',
            scoreSub: 'نتيجة شفافة مبنية على الأدلة التقنية الموثّقة',
            checksHeader: 'نتائج الفحص السلبي عبر خادمي 1.1.1.1 و 8.8.8.8',
            remediationTitle: 'دليل المعالجة الجاهز للنسخ',
            remediationHost: 'المزوّد المكتشف: Cloudflare DNS',
            remediationStep1: '١. إضافة سجل CAA لتحديد الجهات المصرّح لها بإصدار شهادات TLS.',
            remediationStep2: '٢. تفعيل توقيع DNSSEC ونشر سجل DS لدى مسجّل النطاق.',
            reportTitle: 'تقرير تنفيذي PDF ثنائي اللغة',
            reportMeta: 'إصدار بالفرنسية والإنجليزية مع بصمة SHA-256',
          }
        : {
            previewTag: 'Product Preview · AstaSecure Monitor',
            sampleDomain: 'example-sme.tn',
            scoreTitle: 'Domain & Email Security Posture',
            scoreSub: 'Evidence-weighted assessment from verified DNS lookups',
            checksHeader: 'Passive Technical Evidence (1.1.1.1 & 8.8.8.8 Resolvers)',
            remediationTitle: 'Provider-Specific Remediation Guidance',
            remediationHost: 'Detected DNS Host: Cloudflare DNS',
            remediationStep1: '1. Publish a CAA record restricting TLS certificate issuance to authorized CAs.',
            remediationStep2: '2. Enable DNSSEC signing and publish the DS delegation record at your registrar.',
            reportTitle: 'Bilingual Executive PDF Report',
            reportMeta: 'English & French exports · SHA-256 verification digest included',
          };

  if (variant === 'remediation') {
    return (
      <figure
        aria-label={labels.remediationTitle}
        className="rounded-xl border border-slate-800 bg-[#0B1322] overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-800 bg-[#070D19]">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/Logo_futuriste_ASTASECURE_sur_fond_noir_581a41ea.png"
              alt="AstaSecure mark"
              referrerPolicy="no-referrer"
              className="h-6 w-6 object-contain rounded"
            />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">
              {labels.remediationTitle}
            </span>
          </div>
          <span className="text-xs text-slate-400 tabular-nums">{labels.remediationHost}</span>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#22D3EE]">{labels.remediationStep1}</p>
            <div className="rounded-lg border border-slate-800 bg-[#060B14] px-4 py-3 font-mono text-xs text-slate-200 overflow-x-auto">
              example-sme.tn. &nbsp; 3600 &nbsp; IN &nbsp; CAA &nbsp; 0 issue &quot;letsencrypt.org&quot;
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#22D3EE]">{labels.remediationStep2}</p>
            <div className="rounded-lg border border-slate-800 bg-[#060B14] px-4 py-3 font-mono text-xs text-slate-300 overflow-x-auto">
              Key Tag: 2371 · Algorithm: ECDSAP256SHA256 (13) · Digest Type: SHA-256 (2)
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#00C8E8]/10 border border-[#00C8E8]/25 flex items-center justify-center text-[#22D3EE]">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{labels.reportTitle}</p>
                <p className="text-xs text-slate-400">{labels.reportMeta}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              SHA-256 · 8e4a9c…f210
            </span>
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure
      aria-label={labels.previewTag}
      className="rounded-xl border border-slate-800 bg-[#0B1322] overflow-hidden"
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-800 bg-[#070D19]">
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/aistudio/Logo_futuriste_ASTASECURE_sur_fond_noir_581a41ea.png"
            alt="AstaSecure mark"
            referrerPolicy="no-referrer"
            className="h-6 w-6 object-contain rounded"
          />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            {labels.previewTag}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-400">{labels.sampleDomain}</span>
      </div>

      <div className="p-6 grid md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-4 rounded-lg border border-slate-800 bg-[#070D19] p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#22D3EE] font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{labels.scoreTitle}</span>
          </div>
          <div className="py-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-bold tracking-tight text-white tabular-nums">77</span>
              <span className="text-lg font-medium text-slate-400 tabular-nums">/ 100</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full w-[77%] rounded-full bg-gradient-to-r from-[#00C8E8] to-[#22D3EE]" />
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{labels.scoreSub}</p>
        </div>

        <div className="md:col-span-8 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span>{labels.checksHeader}</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>TXT Verified</span>
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-[#070D19]">
            {SAMPLE_CHECKS.map((item) => {
              const isOk = item.state === 'Confirmed';
              return (
                <div
                  key={item.code}
                  className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-semibold text-white w-24 shrink-0">
                      {item.code}
                    </span>
                    <span className="text-slate-400 truncate">{item.detail}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        isOk ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {isOk ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                      <span>{item.state}</span>
                    </span>
                    <span className="font-mono text-slate-400 tabular-nums w-8 text-end">
                      {item.impact}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </figure>
  );
};
