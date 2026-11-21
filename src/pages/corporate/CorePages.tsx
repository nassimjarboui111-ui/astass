import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { MediaFrame } from '../../components/corporate/MediaFrame';
import { MonitorShowcaseVisual } from '../../components/corporate/MonitorShowcaseVisual';
import { useLanguage } from '../../contexts/LanguageContext';
import { CORPORATE_TRANSLATIONS } from '../../i18n/corporateTranslations';
import { CorporatePageId } from '../../types/corporate';

interface SubPageProps {
  onNavigate: (page: CorporatePageId, prefillTopic?: string) => void;
}

export const AboutPage: React.FC<SubPageProps> = ({ onNavigate }) => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 space-y-16">
      <div className="grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">{copy.about.kicker}</p>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
            style={{ textWrap: 'balance' }}
          >
            {copy.about.title}
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">{copy.about.lead}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{copy.nav.contact}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <MediaFrame
            src="/assets/aistudio/Gemini_Generated_Image_o3u2pwo3u2pwo3u2_99ff298f.jpg"
            alt="AstaSecure official brand visual presentation"
            fallbackTitle="AstaSecure Official Visual Identity"
            className="aspect-square max-w-md mx-auto rounded-xl border border-slate-800 bg-black"
            imgClassName="w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="rounded-xl border border-slate-800 bg-[#0B1322] p-8 space-y-3">
          <h2 className="text-xl font-semibold text-white">{copy.about.missionTitle}</h2>
          <p className="text-sm text-slate-300 leading-relaxed">{copy.about.missionBody}</p>
        </section>
        <section className="rounded-xl border border-slate-800 bg-[#0B1322] p-8 space-y-3">
          <h2 className="text-xl font-semibold text-white">{copy.about.visionTitle}</h2>
          <p className="text-sm text-slate-300 leading-relaxed">{copy.about.visionBody}</p>
        </section>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white">{copy.about.principlesTitle}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {copy.about.principles.map((p) => (
            <div key={p.title} className="rounded-xl border border-slate-800 bg-[#0B1322] p-6 space-y-2.5">
              <h3 className="text-base font-semibold text-white">{p.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export const ServicesPage: React.FC<SubPageProps> = ({ onNavigate }) => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 space-y-14">
      <div className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
          {copy.home.servicesLabel}
        </p>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
          style={{ textWrap: 'balance' }}
        >
          {copy.home.servicesTitle}
        </h1>
        <p className="text-base text-slate-300 leading-relaxed">{copy.home.servicesSub}</p>
      </div>

      <div className="space-y-6">
        {copy.servicesList.map((service) => (
          <article
            key={service.number}
            className="rounded-xl border border-slate-800 bg-[#0B1322] p-8 grid lg:grid-cols-12 gap-8 items-start"
          >
            <div className="lg:col-span-7 space-y-3">
              <p className="text-xs font-semibold text-[#22D3EE] tabular-nums">{service.number}</p>
              <h2 className="text-xl font-bold text-white">{service.title}</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{service.summary}</p>
            </div>
            <div className="lg:col-span-5 space-y-3 lg:border-s lg:border-slate-800 lg:ps-8">
              <ul className="space-y-2.5 text-sm text-slate-200">
                {service.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-[#22D3EE] shrink-0 mt-1" aria-hidden="true" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('contact', service.number)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#22D3EE] hover:text-white transition-colors cursor-pointer"
                >
                  <span>{copy.nav.contact}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export const SolutionsPage: React.FC<SubPageProps> = ({ onNavigate }) => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 space-y-14">
      <div className="grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-4">
          <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
            {copy.home.solutionsLabel}
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
            style={{ textWrap: 'balance' }}
          >
            {copy.home.solutionsTitle}
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">{copy.home.solutionsSub}</p>
        </div>
        <div className="lg:col-span-5">
          <MediaFrame
            src="/src/assets/images/solutions_network_infrastructure_1795185531754.jpg"
            alt="Resilient enterprise network infrastructure"
            fallbackTitle="Business Cybersecurity Architecture"
            className="aspect-video rounded-xl border border-slate-800"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {copy.solutionsList.map((sol) => (
          <article
            key={sol.title}
            className="rounded-xl border border-slate-800 bg-[#0B1322] p-8 flex flex-col justify-between gap-6"
          >
            <div className="space-y-3">
              <p className="text-xs text-[#22D3EE] font-medium">{sol.audience}</p>
              <h2 className="text-xl font-bold text-white">{sol.title}</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{sol.description}</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <ul className="space-y-2.5 text-sm text-slate-200">
                {sol.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-[#22D3EE] shrink-0 mt-1" aria-hidden="true" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onNavigate('contact', sol.title)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#22D3EE] hover:text-white transition-colors cursor-pointer"
              >
                <span>{copy.nav.contact}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export const MonitorProductPage: React.FC<SubPageProps> = ({ onNavigate }) => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];
  const m = copy.monitorPage;

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 space-y-20">
      <section className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">{m.kicker}</p>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
            style={{ textWrap: 'balance' }}
          >
            {m.title}
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">{m.lead}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('contact', 'AstaSecure Monitor')}
              className="inline-flex items-center gap-2 min-h-[46px] px-6 py-3 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{m.ctaButton}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <MonitorShowcaseVisual variant="overview" />
          <MonitorShowcaseVisual variant="remediation" />
        </div>
      </section>

      <section className="space-y-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl font-bold text-white">{m.architectureTitle}</h2>
          <p className="text-sm text-slate-300 leading-relaxed">{m.architectureSub}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {m.checks.map((c) => (
            <div key={c.code} className="rounded-xl border border-slate-800 bg-[#0B1322] p-6 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-mono font-semibold text-[#22D3EE]">{c.code}</span>
                <span className="text-xs text-slate-400">{c.name}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-white">{m.workflowTitle}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {m.workflowSteps.map((w) => (
            <div key={w.step} className="rounded-xl border border-slate-800 bg-[#0B1322] p-6 space-y-2.5">
              <span className="text-xs font-mono font-semibold text-[#22D3EE] tabular-nums">
                {w.step}
              </span>
              <h3 className="text-base font-semibold text-white">{w.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#0B1322] p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">{m.scoringTitle}</h2>
          <p className="text-sm text-slate-300">{m.scoringSub}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {m.scoringTiers.map((tier) => (
            <div key={tier.label} className="rounded-lg border border-slate-800 bg-[#070D19] p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{tier.label}</span>
                <span className="text-xs font-mono font-semibold text-[#22D3EE] tabular-nums">
                  {tier.points}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{tier.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export const WhyChooseUsPage: React.FC<SubPageProps> = ({ onNavigate }) => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 space-y-14">
      <div className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">{copy.home.whyLabel}</p>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
          style={{ textWrap: 'balance' }}
        >
          {copy.home.whyTitle}
        </h1>
        <p className="text-base text-slate-300 leading-relaxed">{copy.home.whySub}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {copy.whyPoints.map((item) => (
          <div key={item.title} className="rounded-xl border border-slate-800 bg-[#0B1322] p-7 space-y-3">
            <h2 className="text-lg font-semibold text-white">{item.title}</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#08101E] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white">{copy.home.ctaTitle}</h2>
          <p className="text-sm text-slate-300">{copy.home.ctaBody}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('contact')}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>{copy.home.ctaButton}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
