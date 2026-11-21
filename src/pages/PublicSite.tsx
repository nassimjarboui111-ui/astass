import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  FileText,
  Globe,
  Lock,
  Mail,
  Menu,
  Server,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import heroCyberImg from '../assets/images/hero_cyber_command_1795185452290.jpg';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  apiGetHealth,
  apiSendContactNotification,
  apiValidateDomainSyntax,
} from '../services/apiClient';
import { DEFAULT_PLANS, submitContactInquiry } from '../services/firestoreService';
import { AppLanguage } from '../types/astasecure';

export type PublicPageId =
  | 'home'
  | 'features'
  | 'how-it-works'
  | 'pricing'
  | 'about'
  | 'contact'
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'scanning';

interface PublicSiteProps {
  activePage: PublicPageId;
  onNavigate: (page: PublicPageId) => void;
  onOpenAuth: (mode: 'login' | 'register', prefillDomain?: string) => void;
  onOpenWorkspace: () => void;
}

const CHECK_CARDS = [
  { id: 'dmarc', title: 'Anti-Spoofing Policy (DMARC)', desc: 'Evaluates p=, sp=, pct=, and rua= reporting at _dmarc to stop exact-domain phishing.' },
  { id: 'spf', title: 'Authorized Senders (SPF)', desc: 'Parses v=spf1 syntax, enforces single-record compliance, checks +all risk, and counts recursive 10-DNS lookups.' },
  { id: 'dkim', title: 'Email Cryptographic Signature (DKIM)', desc: 'Probes custom and common selectors. Never marks DKIM missing without checking a known selector.' },
  { id: 'mx', title: 'Incoming Mail Servers (MX)', desc: 'Verifies MX priority routing, A/AAAA hostname resolution, Null MX detection, and SPF alignment.' },
  { id: 'ns', title: 'Authoritative Nameservers (NS)', desc: 'Checks multi-server DNS redundancy and detects your hosting provider for tailored fix guides.' },
  { id: 'soa', title: 'Zone Authority (SOA)', desc: 'Audits primary nameserver, hostmaster metadata, serial structure, and zone refresh timers.' },
  { id: 'dnssec', title: 'DNS Integrity (DNSSEC)', desc: 'Queries DS and DNSKEY records with Authenticated Data (AD) validation against cache poisoning.' },
  { id: 'caa', title: 'Certificate Issuers (CAA)', desc: 'Checks CAA restrictions governing which Certificate Authorities may issue TLS certificates.' },
];

const FAQ_ITEMS = [
  {
    q: 'Why does AstaSecure Monitor require DNS TXT verification before scanning?',
    a: 'Scanning domains without written or technical authorization violates ethical and legal security boundaries. Publishing a 7-day astasecure-verify TXT record confirms your organization controls the domain before any check runs.',
  },
  {
    q: 'How is the security score out of 100 calculated?',
    a: 'Every verified domain starts at 100. Confirmed issues deduct points by severity: Critical (-25), High (-15), Medium (-8), and Low (-3). Unknown DKIM selectors (Not Verified) and DNS timeouts (Technical Error) never deduct points.',
  },
  {
    q: 'Why is DKIM sometimes shown as "Not Verified" instead of "Missing"?',
    a: 'DKIM keys live under provider-specific selectors (for example selector1, google, or mailjet). If none of the common selectors match and you have not entered your selector yet, AstaSecure Monitor honestly marks it Not Verified rather than fabricating a failure.',
  },
  {
    q: 'How does the AstaSecure AI Operations Agent stay safe and accurate?',
    a: 'The AI Operations Agent runs strictly server-side behind a policy engine that permits only allowlisted passive tools after verifying actor email, role, organization tenant scope, and DNS ownership. It inspects untrusted text for prompt injection and never invents scan evidence.',
  },
  {
    q: 'Does AstaSecure Monitor replace a mandatory ANCS-certified regulatory audit?',
    a: 'No. Under Tunisian Decree-Law No. 2023-17, regulated audits are reserved for ANCS-certified auditors. AstaSecure Monitor provides continuous passive technical checks, evidence-backed scoring, and guided remediation.',
  },
  {
    q: 'Which DNS hosting providers are supported in the Remediation Center?',
    a: 'Step-by-step guides cover Cloudflare, OVHcloud, GoDaddy, AWS Route 53, Microsoft Azure DNS, Namecheap, Gandi, IONOS, Hostinger, and generic cPanel / local registrars.',
  },
];

const CONTACT_CATEGORIES = [
  { value: 'domain_assessment', label: 'Domain Security Assessment' },
  { value: 'email_security', label: 'Business Email Security (SPF / DKIM / DMARC)' },
  { value: 'dns_monitoring', label: 'Continuous DNS Monitoring & Pilot' },
  { value: 'agency_partnership', label: 'Agency / Multi-Domain Partnership' },
  { value: 'consulting', label: 'Cybersecurity Advisory & Support' },
];

export const PublicSite: React.FC<PublicSiteProps> = ({
  activePage,
  onNavigate,
  onOpenAuth,
  onOpenWorkspace,
}) => {
  const { lang, setLang, t } = useLanguage();
  const { user, plans } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroDomain, setHeroDomain] = useState('');
  const [heroMsg, setHeroMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Backend contact routing status
  const [contactDestEmail, setContactDestEmail] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);

  // Contact form state — strictly empty defaults
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactCategory, setContactCategory] = useState('');
  const [contactDomain, setContactDomain] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactResult, setContactResult] = useState<{
    saved: boolean;
    deliveryStatus: 'sent' | 'failed' | 'unconfigured';
    detail: string;
  } | null>(null);
  const [contactErr, setContactErr] = useState<string | null>(null);

  const displayPlans = plans.length > 0 ? plans : DEFAULT_PLANS;

  useEffect(() => {
    apiGetHealth()
      .then((h) => {
        setContactDestEmail(h.channels.contactRecipientEmail || null);
        setEmailConfigured(Boolean(h.channels.emailConfigured));
      })
      .catch(() => {});
  }, []);

  const handleNavClick = (page: PublicPageId) => {
    setMobileNavOpen(false);
    onNavigate(page);
  };

  const handleHeroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHeroMsg(null);
    const check = await apiValidateDomainSyntax(heroDomain);
    if (!check.valid || !check.normalized) {
      setHeroMsg({ ok: false, text: check.errorMessage || 'Invalid domain syntax.' });
      return;
    }
    if (user) {
      localStorage.setItem('astasecure_prefill_domain', check.normalized);
      onOpenWorkspace();
    } else {
      setHeroMsg({ ok: true, text: t.hero.syntaxValid });
      onOpenAuth('register', check.normalized);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactErr(null);

    if (!contactCategory) {
      setContactErr('Please choose a service category.');
      return;
    }
    if (!contactConsent) {
      setContactErr('Consent to our Privacy Policy and Authorized Scanning Policy is required.');
      return;
    }

    setContactBusy(true);
    try {
      const notify = await apiSendContactNotification({
        name: contactName,
        email: contactEmail,
        company: contactCompany,
        serviceCategory: contactCategory,
        domain: contactDomain,
        message: contactMessage,
        consentAccepted: contactConsent,
      });

      await submitContactInquiry({
        name: contactName,
        email: contactEmail,
        company: contactCompany,
        serviceCategory: contactCategory,
        domain: contactDomain,
        consentAccepted: contactConsent,
        emailDeliveryStatus: notify.status,
        emailDeliveryDetail: notify.detail,
        message: contactMessage,
      });

      setContactResult({
        saved: true,
        deliveryStatus: notify.status,
        detail: notify.detail,
      });
      setContactName('');
      setContactEmail('');
      setContactCompany('');
      setContactCategory('');
      setContactDomain('');
      setContactMessage('');
      setContactConsent(false);
    } catch (err) {
      setContactErr(err instanceof Error ? err.message : 'Unable to submit inquiry.');
    } finally {
      setContactBusy(false);
    }
  };

  const fadeProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: 'easeOut' as const },
      };

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#060B14]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C8E8] rounded"
          >
            <BrandLogo compact />
          </button>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
            {(
              [
                { id: 'features', label: t.nav.features },
                { id: 'how-it-works', label: t.nav.howItWorks },
                { id: 'pricing', label: t.nav.pricing },
                { id: 'about', label: t.nav.about },
                { id: 'contact', label: t.nav.contact },
                { id: 'faq', label: t.nav.faq },
              ] as { id: PublicPageId; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activePage === item.id ? 'text-[#22D3EE]' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center border border-slate-800 rounded-lg p-0.5 bg-[#0D1628]">
              {(['en', 'fr', 'ar'] as AppLanguage[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    lang === code ? 'bg-[#00C8E8] text-[#060B14] font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>

            {user ? (
              <button
                type="button"
                onClick={onOpenWorkspace}
                className="px-4 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.nav.openConsole}
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-2 border border-slate-700 hover:border-[#00C8E8] text-slate-200 hover:text-white font-medium text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {t.nav.signIn}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {t.auth.registerBtn}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-[#0A1120] px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  { id: 'features', label: t.nav.features },
                  { id: 'how-it-works', label: t.nav.howItWorks },
                  { id: 'pricing', label: t.nav.pricing },
                  { id: 'about', label: t.nav.about },
                  { id: 'contact', label: t.nav.contact },
                  { id: 'faq', label: t.nav.faq },
                ] as { id: PublicPageId; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`text-left py-1.5 font-medium cursor-pointer ${
                    activePage === item.id ? 'text-[#22D3EE]' : 'text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
              <div className="flex items-center border border-slate-800 rounded-lg p-0.5 bg-[#060B14]">
                {(['en', 'fr', 'ar'] as AppLanguage[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    className={`px-2 py-1 text-xs font-medium rounded-md cursor-pointer ${
                      lang === code ? 'bg-[#00C8E8] text-[#060B14] font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
              {!user && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      onOpenAuth('login');
                    }}
                    className="px-3 py-1.5 border border-slate-700 text-xs font-medium text-white rounded-lg cursor-pointer"
                  >
                    {t.nav.signIn}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      onOpenAuth('register');
                    }}
                    className="px-3 py-1.5 bg-[#00C8E8] text-[#060B14] text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {t.auth.registerBtn}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {activePage === 'home' && (
          <>
            {/* Hero Section */}
            <section className="relative overflow-hidden border-b border-slate-800/80">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,200,232,0.12),transparent_60%)] pointer-events-none" />
              <motion.div
                {...fadeProps}
                className="max-w-7xl mx-auto px-6 py-14 lg:py-20 grid lg:grid-cols-12 gap-10 items-center"
              >
                <div className="lg:col-span-7 space-y-6">
                  <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                    {t.hero.kicker}
                  </p>
                  <h1
                    className="font-bold tracking-tight text-white leading-[1.12]"
                    style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
                  >
                    {t.hero.headline}
                  </h1>
                  <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
                    {t.hero.subheadline}
                  </p>

                  <form onSubmit={handleHeroSubmit} className="flex flex-col sm:flex-row gap-3 pt-1 max-w-xl">
                    <input
                      type="text"
                      value={heroDomain}
                      onChange={(e) => setHeroDomain(e.target.value)}
                      placeholder={t.hero.domainPlaceholder}
                      aria-label={t.hero.domainPlaceholder}
                      className="flex-1 px-4 py-3 bg-[#0D1628] border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{t.hero.ctaPrimary}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {heroMsg && (
                    <p className={`text-xs ${heroMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {heroMsg.text}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <span>SPF · DKIM · DMARC · MX · NS · SOA · DNSSEC · CAA</span>
                    <span aria-hidden="true">/</span>
                    <span>AI Operations Agent</span>
                    <span aria-hidden="true">/</span>
                    <span>EN · FR · AR</span>
                  </div>
                </div>

                {/* Hero Cyber Visual & Scoring Methodology */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[#0D1628] border border-slate-800 rounded-xl overflow-hidden">
                    <div className="bg-black border-b border-slate-800 relative">
                      <img
                        src={heroCyberImg}
                        alt="AstaSecure cyber operations monitoring command visual"
                        className="w-full h-52 object-cover"
                      />
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Scoring Methodology Preview</span>
                        <span className="font-mono tabular-nums text-[#22D3EE]">Max 100 pts</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="p-2.5 bg-[#060B14] border border-slate-800/80 rounded-lg flex items-center justify-between">
                          <span className="text-slate-300">Critical Finding</span>
                          <span className="font-mono tabular-nums text-rose-400">-25</span>
                        </div>
                        <div className="p-2.5 bg-[#060B14] border border-slate-800/80 rounded-lg flex items-center justify-between">
                          <span className="text-slate-300">High Finding</span>
                          <span className="font-mono tabular-nums text-orange-400">-15</span>
                        </div>
                        <div className="p-2.5 bg-[#060B14] border border-slate-800/80 rounded-lg flex items-center justify-between">
                          <span className="text-slate-300">Medium Finding</span>
                          <span className="font-mono tabular-nums text-amber-400">-8</span>
                        </div>
                        <div className="p-2.5 bg-[#060B14] border border-slate-800/80 rounded-lg flex items-center justify-between">
                          <span className="text-slate-300">Low Finding</span>
                          <span className="font-mono tabular-nums text-slate-300">-3</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Not Verified and Technical Error checks never penalize your domain score.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* 8 Checks Architecture */}
            <section className="max-w-7xl mx-auto px-6 py-16 space-y-10">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-2xl font-bold text-white">{t.publicSections.architectureHeading}</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{t.publicSections.architectureSub}</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CHECK_CARDS.map((c, idx) => (
                  <div key={c.id} className="bg-[#0D1628] border border-slate-800 rounded-xl p-5 space-y-2.5">
                    <div className="text-xs font-mono text-[#22D3EE] tabular-nums">0{idx + 1}</div>
                    <h3 className="text-sm font-semibold text-white">{c.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* How It Works */}
            <section className="border-y border-slate-800/80 bg-[#0A1120]">
              <div className="max-w-7xl mx-auto px-6 py-16 space-y-10">
                <div className="max-w-2xl space-y-2">
                  <h2 className="text-2xl font-bold text-white">{t.publicSections.howItWorksHeading}</h2>
                  <p className="text-sm text-slate-400">{t.publicSections.howItWorksSub}</p>
                </div>
                <div className="grid md:grid-cols-4 gap-6">
                  {[
                    { icon: Globe, title: t.publicSections.step1Title, desc: t.publicSections.step1Desc },
                    { icon: Lock, title: t.publicSections.step2Title, desc: t.publicSections.step2Desc },
                    { icon: ShieldCheck, title: t.publicSections.step3Title, desc: t.publicSections.step3Desc },
                    { icon: Wrench, title: t.publicSections.step4Title, desc: t.publicSections.step4Desc },
                  ].map((step) => (
                    <div key={step.title} className="space-y-3">
                      <step.icon className="w-6 h-6 text-[#00C8E8]" />
                      <h3 className="text-base font-semibold text-white">{step.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SME Benefits & AI Operations Console Preview */}
            <section className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5 space-y-5">
                <h2 className="text-2xl font-bold text-white">{t.publicSections.smeBenefitsTitle}</h2>
                <ul className="space-y-3 text-sm text-slate-300">
                  {[
                    t.publicSections.smeBenefit1,
                    t.publicSections.smeBenefit2,
                    t.publicSections.smeBenefit3,
                    t.publicSections.smeBenefit4,
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#00C8E8] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleNavClick('features')}
                  className="px-4 py-2 border border-slate-700 hover:border-[#00C8E8] text-sm font-medium text-white rounded-lg transition-colors cursor-pointer"
                >
                  {t.hero.ctaSecondary}
                </button>
              </div>
              <div className="lg:col-span-7 bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <div className="text-xs text-slate-400">Console Architecture Preview</div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      AI Operations Agent, Remediation & Signed Evidence
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#22D3EE]">Server-Side Engine</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-[#060B14] border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">Ownership Gate</div>
                    <div className="text-white font-semibold">2-Resolver TXT</div>
                    <div className="text-slate-400">1.1.1.1 & 8.8.8.8</div>
                  </div>
                  <div className="p-4 bg-[#060B14] border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">AI Operations</div>
                    <div className="text-white font-semibold">Policy-Guarded</div>
                    <div className="text-slate-400">Allowlisted tools only</div>
                  </div>
                  <div className="p-4 bg-[#060B14] border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">Hosted Guides</div>
                    <div className="text-white font-semibold">10 DNS Providers</div>
                    <div className="text-slate-400">OVH, Cloudflare, cPanel</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing Preview — Neutral Equal Cards (No Preselected Paid Plan) */}
            <section className="border-t border-slate-800/80 bg-[#0A1120]">
              <div className="max-w-7xl mx-auto px-6 py-16 space-y-10">
                <div className="max-w-2xl space-y-2">
                  <h2 className="text-2xl font-bold text-white">{t.publicSections.pricingHeading}</h2>
                  <p className="text-sm text-slate-400">{t.publicSections.pricingSub}</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {displayPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-xl p-6 border bg-[#0D1628] border-slate-800 flex flex-col justify-between space-y-6"
                    >
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-white">{plan.name}</div>
                        <div className="text-3xl font-bold text-white tabular-nums">
                          {plan.priceTnd} <span className="text-sm font-normal text-slate-400">TND / mo</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                          <li>{plan.domainLimit} monitored domain(s)</li>
                          <li>{plan.dailyScanQuota} scans / day server quota</li>
                          <li>Schedule: {plan.scheduleAllowed}</li>
                          <li>PDF Reports: {plan.pdfReportsEnabled ? 'EN & FR included' : 'Summary view'}</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => (user ? onOpenWorkspace() : onOpenAuth('register'))}
                        className="w-full py-2 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer bg-slate-800 text-white hover:bg-[#00C8E8] hover:text-[#060B14]"
                      >
                        {user ? t.nav.openConsole : `Choose ${plan.name}`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FAQ Preview */}
            <section className="max-w-4xl mx-auto px-6 py-16 space-y-6">
              <h2 className="text-2xl font-bold text-white">{t.publicSections.faqHeading}</h2>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-[#0D1628]">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={item.q} className="p-5">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between gap-4 text-left text-sm font-semibold text-white cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === i && <p className="text-sm text-slate-400 mt-3 leading-relaxed">{item.a}</p>}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activePage === 'features' && (
          <section className="max-w-6xl mx-auto px-6 py-16 space-y-12">
            <div className="space-y-3 max-w-2xl">
              <h1 className="text-3xl font-bold text-white">{t.nav.features}</h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Every check in AstaSecure Monitor executes on our Node.js backend against authoritative public DNS resolvers—never in your browser.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {CHECK_CARDS.map((c) => (
                <div key={c.id} className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-2">
                  <h2 className="text-base font-semibold text-white">{c.title}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{c.desc}</p>
                </div>
              ))}
              <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-2">
                <div className="flex items-center gap-2 text-[#22D3EE] text-xs font-semibold">
                  <Bot className="w-4 h-4" />
                  <span>Autonomous Workflows</span>
                </div>
                <h2 className="text-base font-semibold text-white">Policy-Guarded AI Operations Agent</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Executes authorized multi-step security assessments, summarizes findings in EN/FR/AR strictly from DNS evidence, enforces allowlisted tools, and guards inbound communications against prompt injection.
                </p>
              </div>
              <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-2">
                <div className="flex items-center gap-2 text-[#22D3EE] text-xs font-semibold">
                  <FileText className="w-4 h-4" />
                  <span>Verified Evidence</span>
                </div>
                <h2 className="text-base font-semibold text-white">HTTPS/TLS & Signed PDF Reports (EN & FR)</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Inspects leaf SSL/TLS certificate expiry and produces server-generated PDF documents carrying raw records, hosting-specific fixes, and SHA-256 fingerprints.
                </p>
              </div>
            </div>
          </section>
        )}

        {activePage === 'how-it-works' && (
          <section className="max-w-5xl mx-auto px-6 py-16 space-y-10">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">{t.publicSections.howItWorksHeading}</h1>
              <p className="text-sm text-slate-400">{t.publicSections.howItWorksSub}</p>
            </div>
            <div className="space-y-4">
              {[
                { title: t.publicSections.step1Title, desc: t.publicSections.step1Desc },
                { title: t.publicSections.step2Title, desc: t.publicSections.step2Desc },
                { title: t.publicSections.step3Title, desc: t.publicSections.step3Desc },
                { title: t.publicSections.step4Title, desc: t.publicSections.step4Desc },
              ].map((s) => (
                <div key={s.title} className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-1.5">
                  <h2 className="text-base font-semibold text-white">{s.title}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === 'pricing' && (
          <section className="max-w-7xl mx-auto px-6 py-16 space-y-10">
            <div className="max-w-2xl space-y-2">
              <h1 className="text-3xl font-bold text-white">{t.publicSections.pricingHeading}</h1>
              <p className="text-sm text-slate-400">{t.publicSections.pricingSub}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {displayPlans.map((plan) => (
                <div key={plan.id} className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <h2 className="text-base font-semibold text-white">{plan.name}</h2>
                    <div className="text-3xl font-bold text-white tabular-nums">
                      {plan.priceTnd} <span className="text-sm font-normal text-slate-400">TND / mo</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800">
                      <li>Up to {plan.domainLimit} verified domain(s)</li>
                      <li>{plan.dailyScanQuota} server scans / day</li>
                      <li>Scheduled scans: {plan.scheduleAllowed}</li>
                      <li>Branded PDF exports: {plan.pdfReportsEnabled ? 'Enabled (EN / FR)' : 'Upgrade required'}</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => (user ? onOpenWorkspace() : onOpenAuth('register'))}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-[#00C8E8] text-white hover:text-[#060B14] font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    {user ? t.nav.openConsole : `Select ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === 'about' && (
          <section className="max-w-5xl mx-auto px-6 py-16 space-y-10">
            <div className="grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <h1 className="text-3xl font-bold text-white">{t.nav.about} AstaSecure</h1>
                <p className="text-base text-slate-300 leading-relaxed">
                  AstaSecure builds practical, accessible domain and business email security tooling for SMEs, web agencies, and growing institutions internationally. Our goal is to turn complex DNS and email authentication vulnerabilities into clear, verifiable fixes any business team can implement.
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Protecting Businesses. Empowering Growth.
                </p>
              </div>
              {/* Exact Official Logo Asset Displayed in Original Proportions — No Crop, No Stretch, No Overlay */}
              <div className="md:col-span-5 bg-black border border-slate-800 rounded-xl p-6 flex items-center justify-center">
                <img
                  src="/assets/aistudio/Logo_futuriste_ASTASECURE_sur_fond_noir_581a41ea.png"
                  alt="Official AstaSecure Logo"
                  referrerPolicy="no-referrer"
                  className="w-full max-w-[280px] h-auto object-contain"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-2">
                <h2 className="text-base font-semibold text-white">Our Mission</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Traditional diagnostic tools stop at technical jargon in English. AstaSecure Monitor explains risks clearly in English, French, and Arabic, pairs server-side evidence with hosting-specific instructions, and supports AI-assisted operational workflows.
                </p>
              </div>
              <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-2">
                <h2 className="text-base font-semibold text-white">Ethical & Legal Boundaries</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We perform passive, read-only public DNS checks strictly after ownership verification. We never run penetration tests, never claim &ldquo;certified audit&rdquo; status reserved for ANCS-certified experts under Decree-Law No. 2023-17, and protect personal data under Organic Law No. 2004-63.
                </p>
              </div>
            </div>
          </section>
        )}

        {activePage === 'contact' && (
          <section className="max-w-2xl mx-auto px-6 py-16 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">{t.nav.contact}</h1>
              <p className="text-sm text-slate-400">
                Request pilot onboarding, agency partnerships, or technical support.
              </p>
            </div>

            <div className="bg-[#0A1120] border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-[#00C8E8] shrink-0 mt-0.5" />
              <span>
                {emailConfigured && contactDestEmail
                  ? `Submissions are logged in the AstaSecure Admin Desk and dispatched via SMTP to ${contactDestEmail}.`
                  : 'Submissions are recorded directly in the AstaSecure Admin Review Desk. External SMTP email forwarding is currently unconfigured on this server.'}
              </span>
            </div>

            {contactResult ? (
              <div className="p-6 bg-[#0D1628] border border-emerald-500/30 rounded-xl space-y-3 text-sm">
                <div className="font-semibold text-emerald-300">
                  Inquiry Recorded in Admin Review Desk
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Email Delivery Status:{' '}
                  <strong className="uppercase text-white">{contactResult.deliveryStatus}</strong> —{' '}
                  {contactResult.detail}
                </p>
                <button
                  type="button"
                  onClick={() => setContactResult(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-lg cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="bg-[#0D1628] border border-slate-800 rounded-xl p-6 space-y-4">
                {contactErr && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                    {contactErr}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {t.contact.nameLabel}
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00C8E8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {t.contact.emailLabel}
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@company.tn"
                      className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00C8E8]"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {t.contact.categoryLabel}
                    </label>
                    <select
                      required
                      value={contactCategory}
                      onChange={(e) => setContactCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
                    >
                      <option value="">Select service category...</option>
                      {CONTACT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {t.contact.domainLabel}
                    </label>
                    <input
                      type="text"
                      value={contactDomain}
                      onChange={(e) => setContactDomain(e.target.value)}
                      placeholder="e.g. company.tn"
                      className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00C8E8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.contact.companyLabel}
                  </label>
                  <input
                    type="text"
                    value={contactCompany}
                    onChange={(e) => setContactCompany(e.target.value)}
                    placeholder="Organization or company name"
                    className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00C8E8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.contact.messageLabel}
                  </label>
                  <textarea
                    required
                    minLength={10}
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Tell us about your security goals or questions..."
                    className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00C8E8]"
                  />
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={contactConsent}
                    onChange={(e) => setContactConsent(e.target.checked)}
                    className="mt-0.5 accent-[#00C8E8]"
                  />
                  <span>{t.contact.consentLabel}</span>
                </label>

                <button
                  type="submit"
                  disabled={contactBusy}
                  className="px-5 py-2.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {contactBusy ? 'Submitting...' : t.contact.sendBtn}
                </button>
              </form>
            )}
          </section>
        )}

        {activePage === 'faq' && (
          <section className="max-w-4xl mx-auto px-6 py-16 space-y-6">
            <h1 className="text-3xl font-bold text-white">{t.publicSections.faqHeading}</h1>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-[#0D1628]">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="p-5 space-y-2">
                  <h2 className="text-sm font-semibold text-white">{item.q}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {(activePage === 'privacy' || activePage === 'terms' || activePage === 'scanning') && (
          <section className="max-w-4xl mx-auto px-6 py-16 space-y-6">
            <h1 className="text-3xl font-bold text-white">
              {activePage === 'privacy'
                ? t.legal.privacy
                : activePage === 'terms'
                  ? t.legal.terms
                  : t.legal.scanningPolicy}
            </h1>
            <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-8 space-y-4 text-sm text-slate-300 leading-relaxed">
              {activePage === 'privacy' && (
                <>
                  <p>AstaSecure Monitor collects only the minimal personal data required for account authentication, organization isolation, and domain security reporting, in alignment with Tunisian Organic Law No. 2004-63 (INPDP) and GDPR principles.</p>
                  <p>Retention periods: domain scan records are retained for 24 months, security audit logs for 12 months, and all user/organization records are permanently erased upon account deletion in Settings.</p>
                  <p>Sub-processors: Google Firebase (Authentication & Cloud Firestore) and configured optional SMTP/WhatsApp transport gateways.</p>
                </>
              )}
              {activePage === 'terms' && (
                <>
                  <p>AstaSecure Monitor provides automated passive DNS and email configuration checks, scoring, and guided remediation. Subscriptions are governed by transparent plan quotas enforced server-side.</p>
                  <p>AstaSecure Monitor does not provide regulated cybersecurity audits reserved for ANCS-certified auditors under Decree-Law No. 2023-17 and does not guarantee absolute security.</p>
                </>
              )}
              {activePage === 'scanning' && (
                <>
                  <p>Authorized Scanning Policy: AstaSecure Monitor strictly prohibits scanning any domain without prior cryptographic DNS TXT ownership verification confirmed across two independent public DNS resolvers (Cloudflare 1.1.1.1 and Google 8.8.8.8).</p>
                  <p>All checks are 100% passive, read-only public DNS and TLS handshake observations. Active vulnerability exploitation, port scanning, and brute-force testing are strictly excluded and prohibited.</p>
                </>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060B14] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <BrandLogo compact />
            <p className="text-slate-400 leading-relaxed">{t.tagline}</p>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-white">Platform</div>
            <div className="flex flex-col gap-1.5 items-start">
              <button type="button" onClick={() => handleNavClick('features')} className="hover:text-white cursor-pointer">{t.nav.features}</button>
              <button type="button" onClick={() => handleNavClick('how-it-works')} className="hover:text-white cursor-pointer">{t.nav.howItWorks}</button>
              <button type="button" onClick={() => handleNavClick('pricing')} className="hover:text-white cursor-pointer">{t.nav.pricing}</button>
              <button type="button" onClick={() => handleNavClick('faq')} className="hover:text-white cursor-pointer">{t.nav.faq}</button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-white">Company</div>
            <div className="flex flex-col gap-1.5 items-start">
              <button type="button" onClick={() => handleNavClick('about')} className="hover:text-white cursor-pointer">{t.nav.about}</button>
              <button type="button" onClick={() => handleNavClick('contact')} className="hover:text-white cursor-pointer">{t.nav.contact}</button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-white">Compliance & Legal</div>
            <div className="flex flex-col gap-1.5 items-start">
              <button type="button" onClick={() => handleNavClick('privacy')} className="hover:text-white cursor-pointer">{t.legal.privacy}</button>
              <button type="button" onClick={() => handleNavClick('terms')} className="hover:text-white cursor-pointer">{t.legal.terms}</button>
              <button type="button" onClick={() => handleNavClick('scanning')} className="hover:text-white cursor-pointer">{t.legal.scanningPolicy}</button>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800/80 py-4 px-6 max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} AstaSecure. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>Passive Authorized Checks Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
