import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { MediaFrame } from '../../components/corporate/MediaFrame';
import { MonitorShowcaseVisual } from '../../components/corporate/MonitorShowcaseVisual';
import { useLanguage } from '../../contexts/LanguageContext';
import { CORPORATE_TRANSLATIONS } from '../../i18n/corporateTranslations';
import { SubscriptionPlanDoc } from '../../types/astasecure';
import { CorporatePageId } from '../../types/corporate';

interface HomeViewProps {
  plans: SubscriptionPlanDoc[];
  onNavigate: (page: CorporatePageId, prefillTopic?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ plans, onNavigate }) => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];

  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center border-b border-slate-800/80 overflow-hidden">
        <MediaFrame
          src="/src/assets/images/hero_cyber_command_1795185452290.jpg"
          alt="AstaSecure modern architectural cybersecurity headquarters"
          fallbackTitle="AstaSecure Corporate Headquarters"
          className="absolute inset-0 w-full h-full"
          imgClassName="w-full h-full object-cover object-center"
          overlayClassName="absolute inset-0 bg-gradient-to-r from-[#060B14] via-[#060B14]/90 to-[#060B14]/55"
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-20 lg:py-28">
          <div className="max-w-2xl space-y-6">
            <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
              {copy.hero.kicker}
            </p>
            <h1
              className="font-bold tracking-tight text-white leading-[1.12]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', textWrap: 'balance' }}
            >
              {copy.hero.headline}
            </h1>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
              {copy.hero.subheadline}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="inline-flex items-center gap-2 min-h-[46px] px-6 py-3 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>{copy.hero.ctaPrimary}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('monitor')}
                className="inline-flex items-center gap-1.5 min-h-[46px] px-2 text-sm font-medium text-slate-200 hover:text-[#22D3EE] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C8E8] rounded"
              >
                <span>{copy.hero.ctaSecondary}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Company Introduction */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-24 border-b border-slate-800/80">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
                {copy.home.introLabel}
              </p>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                {copy.home.introTitle}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {copy.home.introBody}
            </p>
            <ul className="space-y-3 text-sm text-slate-200">
              {[copy.home.introPoint1, copy.home.introPoint2, copy.home.introPoint3].map(
                (point) => (
                  <li key={point} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-[#22D3EE] shrink-0 mt-1" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                )
              )}
            </ul>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#22D3EE] hover:text-white transition-colors cursor-pointer"
              >
                <span>{copy.home.introLink}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <MediaFrame
              src="/src/assets/images/services_advisory_boardroom_1795185531475.jpg"
              alt="AstaSecure cybersecurity specialists reviewing network diagrams"
              fallbackTitle="AstaSecure Cybersecurity Advisory Team"
              className="h-full min-h-[300px] lg:min-h-[380px] rounded-xl border border-slate-800"
              overlayClassName="absolute inset-0 bg-gradient-to-t from-[#060B14]/45 via-transparent to-transparent"
            />
          </div>
        </div>
      </section>

      {/* 3. Services Overview */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-24 border-b border-slate-800/80 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
              {copy.home.servicesLabel}
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              {copy.home.servicesTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {copy.home.servicesSub}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#22D3EE] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{copy.home.servicesAllLink}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {copy.servicesList.map((service) => (
            <article
              key={service.number}
              className="rounded-xl border border-slate-800 bg-[#0B1322] p-7 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#22D3EE] tabular-nums">
                  {service.number}
                </p>
                <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{service.summary}</p>
              </div>
              <ul className="pt-4 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
                {service.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#22D3EE] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Business Security Solutions */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-24 border-b border-slate-800/80 space-y-12">
        <div className="grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-5">
            <MediaFrame
              src="/src/assets/images/solutions_network_infrastructure_1795185531754.jpg"
              alt="Secure enterprise data center infrastructure corridor"
              fallbackTitle="Enterprise & SME Defense Infrastructure"
              className="h-full min-h-[280px] rounded-xl border border-slate-800"
              overlayClassName="absolute inset-0 bg-gradient-to-t from-[#060B14]/70 via-transparent to-transparent"
            />
          </div>

          <div className="lg:col-span-7 flex flex-col justify-center space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
                {copy.home.solutionsLabel}
              </p>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                {copy.home.solutionsTitle}
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {copy.home.solutionsSub}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {copy.solutionsList.map((sol) => (
                <div
                  key={sol.title}
                  className="rounded-xl border border-slate-800 bg-[#0B1322] p-5 space-y-2"
                >
                  <p className="text-xs text-slate-400">{sol.audience}</p>
                  <h3 className="text-base font-semibold text-white">{sol.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{sol.description}</p>
                </div>
              ))}
            </div>

            <div>
              <button
                type="button"
                onClick={() => onNavigate('solutions')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#22D3EE] hover:text-white transition-colors cursor-pointer"
              >
                <span>{copy.home.solutionsLink}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. AstaSecure Monitor Product Showcase */}
      <section className="bg-[#08101E] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-24 space-y-10">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 space-y-3">
              <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
                {copy.home.monitorLabel}
              </p>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                {copy.home.monitorTitle}
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {copy.home.monitorSub}
              </p>
            </div>
            <div className="lg:col-span-4 lg:flex lg:justify-end">
              <button
                type="button"
                onClick={() => onNavigate('monitor')}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg border border-[#00C8E8]/40 bg-[#00C8E8]/10 hover:bg-[#00C8E8]/20 text-sm font-semibold text-[#22D3EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{copy.home.monitorLink}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <MonitorShowcaseVisual variant="overview" />

          <div className="grid md:grid-cols-3 gap-6 pt-2">
            {copy.home.monitorBullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-3 text-sm text-slate-300">
                <Check className="h-4 w-4 text-[#22D3EE] shrink-0 mt-1" aria-hidden="true" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Why Businesses Choose AstaSecure */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-24 border-b border-slate-800/80 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
              {copy.home.whyLabel}
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              {copy.home.whyTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {copy.home.whySub}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('why-us')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#22D3EE] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{copy.home.whyLink}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {copy.whyPoints.map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-800 bg-[#0B1322] p-6 space-y-2.5">
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Pricing Preview */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-24 border-b border-slate-800/80 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
              {copy.home.pricingLabel}
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              {copy.home.pricingTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {copy.home.pricingSub}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pricing')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#22D3EE] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{copy.home.pricingLink}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 flex flex-col justify-between gap-6 ${
                plan.id === 'pro'
                  ? 'border-[#00C8E8]/60 bg-[#0E1A30]'
                  : 'border-slate-800 bg-[#0B1322]'
              }`}
            >
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">{plan.name}</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-white tabular-nums">
                    {plan.priceTnd === 0 ? copy.pricingPage.freeLabel : `${plan.priceTnd} TND`}
                  </span>
                  {plan.priceTnd > 0 ? (
                    <span className="text-xs text-slate-400">{copy.pricingPage.perMonth}</span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-300 tabular-nums">
                  {plan.domainLimit}{' '}
                  {plan.domainLimit === 1
                    ? copy.pricingPage.domainSingular
                    : copy.pricingPage.domainsUnit}{' '}
                  · {plan.scheduleAllowed}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('contact', plan.name)}
                className={`min-h-[42px] w-full rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  plan.id === 'pro'
                    ? 'bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                }`}
              >
                {copy.pricingPage.selectPlanCta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Closing Contact CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-24">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0D1628] via-[#091221] to-[#060B14] p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              {copy.home.ctaTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {copy.home.ctaBody}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-7 py-3 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{copy.home.ctaButton}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </>
  );
};
