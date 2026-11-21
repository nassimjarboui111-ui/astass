import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { useLanguage } from '../../contexts/LanguageContext';
import { CORPORATE_TRANSLATIONS } from '../../i18n/corporateTranslations';
import { AppLanguage } from '../../types/astasecure';
import { CorporatePageId } from '../../types/corporate';

interface CorporateHeaderProps {
  activePage: CorporatePageId;
  onNavigate: (page: CorporatePageId) => void;
}

export const CorporateHeader: React.FC<CorporateHeaderProps> = ({ activePage, onNavigate }) => {
  const { lang, setLang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];
  const [mobileOpen, setMobileOpen] = useState(false);

  const primaryLinks: { id: CorporatePageId; label: string }[] = [
    { id: 'services', label: copy.nav.services },
    { id: 'solutions', label: copy.nav.solutions },
    { id: 'monitor', label: copy.nav.monitor },
    { id: 'about', label: copy.nav.about },
    { id: 'pricing', label: copy.nav.pricing },
  ];

  const allDrawerLinks: { id: CorporatePageId; label: string }[] = [
    { id: 'home', label: copy.nav.home },
    { id: 'services', label: copy.nav.services },
    { id: 'solutions', label: copy.nav.solutions },
    { id: 'monitor', label: `AstaSecure ${copy.nav.monitor}` },
    { id: 'about', label: copy.nav.about },
    { id: 'why-us', label: copy.nav.whyUs },
    { id: 'pricing', label: copy.nav.pricing },
    { id: 'faq', label: copy.nav.faq },
    { id: 'contact', label: copy.nav.contact },
  ];

  const handleNavClick = (page: CorporatePageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#060B14]/92 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-8">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('home');
          }}
          className="inline-flex items-center whitespace-nowrap shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C8E8]"
        >
          <BrandLogo compact />
        </a>

        <nav
          aria-label="Primary"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          {primaryLinks.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`py-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C8E8] rounded ${
                  isActive ? 'text-[#22D3EE] font-semibold' : 'hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('contact')}
            className="hidden sm:inline-flex items-center justify-center min-h-[40px] px-5 py-2 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {copy.nav.contact}
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center justify-center h-11 w-11 rounded-lg border border-slate-800 bg-[#0D1628] text-slate-200 hover:text-white hover:border-slate-700 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C8E8]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="lg:hidden border-t border-slate-800 bg-[#070E1A] px-6 py-5 space-y-4">
          <nav aria-label="Mobile navigation" className="grid sm:grid-cols-2 gap-1.5">
            {allDrawerLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`min-h-[44px] px-3 py-2 text-start text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  activePage === item.id
                    ? 'bg-[#00C8E8]/15 text-[#22D3EE] font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">{copy.footer.languageLabel}</span>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0D1628] border border-slate-800">
              {(['en', 'fr', 'ar'] as AppLanguage[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`min-h-[36px] px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    lang === code ? 'bg-[#00C8E8] text-[#060B14] font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};
