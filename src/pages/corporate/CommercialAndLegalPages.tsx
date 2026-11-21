import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, CheckCircle2, Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CORPORATE_TRANSLATIONS } from '../../i18n/corporateTranslations';
import { submitContactInquiry } from '../../services/firestoreService';
import { SubscriptionPlanDoc } from '../../types/astasecure';
import { CorporatePageId } from '../../types/corporate';

export const PricingPage: React.FC<{
  plans: SubscriptionPlanDoc[];
  onSelectPlan: (planName: string) => void;
}> = ({ plans, onSelectPlan }) => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];
  const p = copy.pricingPage;

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 space-y-14">
      <div className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">{p.kicker}</p>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
          style={{ textWrap: 'balance' }}
        >
          {p.title}
        </h1>
        <p className="text-base text-slate-300 leading-relaxed">{p.lead}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`rounded-xl border p-7 flex flex-col justify-between gap-8 ${
              plan.id === 'pro'
                ? 'border-[#00C8E8]/60 bg-[#0E1A30]'
                : 'border-slate-800 bg-[#0B1322]'
            }`}
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-white tabular-nums">
                    {plan.priceTnd === 0 ? p.freeLabel : `${plan.priceTnd} TND`}
                  </span>
                  {plan.priceTnd > 0 ? (
                    <span className="text-xs text-slate-400">{p.perMonth}</span>
                  ) : null}
                </div>
              </div>

              <ul className="space-y-3 pt-4 border-t border-slate-800/80 text-sm text-slate-200">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#22D3EE] shrink-0 mt-1" aria-hidden="true" />
                  <span className="tabular-nums">
                    {plan.domainLimit}{' '}
                    {plan.domainLimit === 1 ? p.domainSingular : p.domainsUnit}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#22D3EE] shrink-0 mt-1" aria-hidden="true" />
                  <span className="tabular-nums">
                    {p.dailyScansLabel}: {plan.dailyScanQuota}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#22D3EE] shrink-0 mt-1" aria-hidden="true" />
                  <span className="capitalize">
                    {p.scheduleLabel}: {plan.scheduleAllowed}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check
                    className={`h-4 w-4 shrink-0 mt-1 ${
                      plan.pdfReportsEnabled ? 'text-[#22D3EE]' : 'text-slate-600'
                    }`}
                    aria-hidden="true"
                  />
                  <span className={plan.pdfReportsEnabled ? 'text-slate-200' : 'text-slate-400'}>
                    {plan.pdfReportsEnabled ? p.pdfIncluded : p.pdfExcluded}
                  </span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onSelectPlan(plan.name)}
              className={`min-h-[44px] w-full rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                plan.id === 'pro'
                  ? 'bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14]'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
              }`}
            >
              {p.selectPlanCta}
            </button>
          </article>
        ))}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">{p.note}</p>
    </div>
  );
};

export const ContactPage: React.FC<{
  prefillTopic?: string;
  onNavigate: (page: CorporatePageId) => void;
}> = ({ prefillTopic, onNavigate }) => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];
  const c = copy.contactPage;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState(c.topics[0]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillTopic) {
      setTopic(prefillTopic);
    } else {
      setTopic(c.topics[0]);
    }
  }, [prefillTopic, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMsg = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMsg) {
      setError(c.errRequired);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(c.errEmail);
      return;
    }

    setBusy(true);
    try {
      const formattedMessage = topic ? `[${topic}]\n\n${trimmedMsg}` : trimmedMsg;
      await submitContactInquiry({
        name: trimmedName,
        email: trimmedEmail,
        company: company.trim(),
        message: formattedMessage,
      });
      setSent(true);
      setName('');
      setEmail('');
      setCompany('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send inquiry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
      <div className="grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5 space-y-6">
          <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">{c.kicker}</p>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
            style={{ textWrap: 'balance' }}
          >
            {c.title}
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">{c.lead}</p>

          <div className="rounded-xl border border-slate-800 bg-[#0B1322] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">{c.directTitle}</h2>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-2.5 text-[#22D3EE]">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{c.directEmail}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{c.directScope}</p>
              <p className="text-xs text-slate-300">{c.directResponse}</p>
            </div>
            <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-4 text-xs">
              <button
                type="button"
                onClick={() => onNavigate('faq')}
                className="text-[#22D3EE] hover:text-white transition-colors cursor-pointer"
              >
                {copy.nav.faq}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('privacy')}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {copy.nav.privacy}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          {sent ? (
            <div className="rounded-xl border border-emerald-500/40 bg-[#0B1322] p-8 space-y-4">
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
                <h2 className="text-xl font-bold text-white">{c.successTitle}</h2>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{c.successBody}</p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                {c.sendAnother}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-xl border border-slate-800 bg-[#0B1322] p-7 sm:p-8 space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="block text-xs font-medium text-slate-300">
                    {c.nameLabel}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={c.namePlaceholder}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#060B14] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="block text-xs font-medium text-slate-300">
                    {c.emailLabel}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={c.emailPlaceholder}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#060B14] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="contact-company" className="block text-xs font-medium text-slate-300">
                    {c.companyLabel}
                  </label>
                  <input
                    id="contact-company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder={c.companyPlaceholder}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#060B14] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-topic" className="block text-xs font-medium text-slate-300">
                    {c.topicLabel}
                  </label>
                  <select
                    id="contact-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#060B14] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#00C8E8]"
                  >
                    {prefillTopic && !c.topics.includes(prefillTopic) ? (
                      <option value={prefillTopic}>{prefillTopic}</option>
                    ) : null}
                    {c.topics.map((tOpt) => (
                      <option key={tOpt} value={tOpt}>
                        {tOpt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="block text-xs font-medium text-slate-300">
                  {c.messageLabel}
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={c.messagePlaceholder}
                  className="w-full px-3.5 py-3 rounded-lg bg-[#060B14] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00C8E8]"
                />
              </div>

              {error ? (
                <p role="alert" className="text-xs text-rose-400">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 bg-[#00C8E8] hover:bg-[#22D3EE] disabled:opacity-60 text-[#060B14] font-semibold text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{busy ? c.sendingBtn : c.submitBtn}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const FaqPage: React.FC<{ onNavigate: (page: CorporatePageId) => void }> = ({
  onNavigate,
}) => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];
  const f = copy.faqPage;
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 lg:py-24 space-y-12">
      <div className="space-y-4">
        <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">{f.kicker}</p>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
          style={{ textWrap: 'balance' }}
        >
          {f.title}
        </h1>
        <p className="text-base text-slate-300 leading-relaxed">{f.lead}</p>
      </div>

      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#0B1322]">
        {f.items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.q}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between gap-4 text-start hover:bg-slate-800/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C8E8]"
              >
                <span className="text-sm sm:text-base font-semibold text-white">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                    isOpen ? 'rotate-180 text-[#22D3EE]' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
              {isOpen ? (
                <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed">{item.a}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#08101E] p-6">
        <p className="text-sm text-slate-300">{copy.home.ctaBody}</p>
        <button
          type="button"
          onClick={() => onNavigate('contact')}
          className="min-h-[42px] px-5 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copy.nav.contact}
        </button>
      </div>
    </div>
  );
};

export const LegalDocumentPage: React.FC<{ docType: 'privacy' | 'terms' }> = ({ docType }) => {
  const { lang } = useLanguage();
  const legal = CORPORATE_TRANSLATIONS[lang].legal;
  const title = docType === 'privacy' ? legal.privacyTitle : legal.termsTitle;
  const updated = docType === 'privacy' ? legal.privacyUpdated : legal.termsUpdated;
  const sections = docType === 'privacy' ? legal.privacySections : legal.termsSections;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24 space-y-10">
      <div className="space-y-3 border-b border-slate-800 pb-6">
        <p className="text-xs text-[#22D3EE] font-medium">{updated}</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
      </div>

      <div className="space-y-8">
        {sections.map((sec) => (
          <section key={sec.heading} className="space-y-2.5">
            <h2 className="text-lg font-semibold text-white">{sec.heading}</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{sec.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
};
