import React from 'react';
import { BrandLogo } from '../BrandLogo';
import { useLanguage } from '../../contexts/LanguageContext';
import { CORPORATE_TRANSLATIONS } from '../../i18n/corporateTranslations';
import { AppLanguage } from '../../types/astasecure';
import { CorporatePageId } from '../../types/corporate';

interface CorporateFooterProps {
  onNavigate: (page: CorporatePageId) => void;
}

export const CorporateFooter: React.FC<CorporateFooterProps> = ({ onNavigate }) => {
  const { lang, setLang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];

  return (
    <footer className="border-t border-slate-800/80 bg-[#050911] text-slate-300">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
          <div className="md:col-span-4 space-y-4">
            <BrandLogo />
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              {copy.tagline} · {copy.positioning}.
            </p>
            <p className="text-xs text-slate-500">contact@astasecure.com</p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h2 className="text-xs font-semibold tracking-wider text-slate-400">
              {copy.footer.companyCol}
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.home}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.about}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('why-us')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.whyUs}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('pricing')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.pricing}
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h2 className="text-xs font-semibold tracking-wider text-slate-400">
              {copy.footer.offeringsCol}
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.services}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('solutions')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.solutions}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('monitor')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  AstaSecure {copy.nav.monitor}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.contact}
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h2 className="text-xs font-semibold tracking-wider text-slate-400">
              {copy.footer.legalCol}
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('faq')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.faq}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.privacy}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('terms')}
                  className="hover:text-[#22D3EE] transition-colors cursor-pointer"
                >
                  {copy.nav.terms}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>© {new Date().getFullYear()} {copy.footer.copyright}</span>
            <span aria-hidden="true">·</span>
            <span>{copy.footer.locationNote}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">{copy.footer.languageLabel}</span>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0B1322] border border-slate-800">
              {(['en', 'fr', 'ar'] as AppLanguage[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`min-h-[32px] px-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    lang === code ? 'bg-[#00C8E8] text-[#060B14] font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
