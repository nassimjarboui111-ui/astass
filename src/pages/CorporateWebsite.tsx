import React, { useEffect, useState } from 'react';
import { CorporateFooter } from '../components/corporate/CorporateFooter';
import { CorporateHeader } from '../components/corporate/CorporateHeader';
import { useLanguage } from '../contexts/LanguageContext';
import { CORPORATE_TRANSLATIONS } from '../i18n/corporateTranslations';
import { DEFAULT_PLANS, listPlans } from '../services/firestoreService';
import { SubscriptionPlanDoc } from '../types/astasecure';
import { CORPORATE_ROUTES, CorporatePageId, resolvePageFromPath } from '../types/corporate';
import { ContactPage, FaqPage, LegalDocumentPage, PricingPage } from './corporate/CommercialAndLegalPages';
import {
  AboutPage,
  MonitorProductPage,
  ServicesPage,
  SolutionsPage,
  WhyChooseUsPage,
} from './corporate/CorePages';
import { HomeView } from './corporate/HomeView';

export const CorporateWebsite: React.FC = () => {
  const { lang } = useLanguage();
  const copy = CORPORATE_TRANSLATIONS[lang];

  const [activePage, setActivePage] = useState<CorporatePageId>(() =>
    resolvePageFromPath(window.location.pathname)
  );
  const [contactTopic, setContactTopic] = useState<string | undefined>(undefined);
  const [plans, setPlans] = useState<SubscriptionPlanDoc[]>(DEFAULT_PLANS);

  useEffect(() => {
    let active = true;
    listPlans()
      .then((loaded) => {
        if (active && loaded && loaded.length > 0) {
          setPlans(loaded);
        }
      })
      .catch(() => {
        // Keep DEFAULT_PLANS fallback cleanly if Firestore read is unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handlePop = () => {
      setActivePage(resolvePageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  useEffect(() => {
    const titles: Record<CorporatePageId, string> = {
      home: `AstaSecure — ${copy.tagline}`,
      about: `${copy.nav.about} — AstaSecure`,
      services: `${copy.nav.services} — AstaSecure`,
      solutions: `${copy.nav.solutions} — AstaSecure`,
      monitor: `AstaSecure Monitor — ${copy.tagline}`,
      'why-us': `${copy.nav.whyUs} — AstaSecure`,
      pricing: `${copy.nav.pricing} — AstaSecure`,
      contact: `${copy.nav.contact} — AstaSecure`,
      faq: `${copy.nav.faq} — AstaSecure`,
      privacy: `${copy.nav.privacy} — AstaSecure`,
      terms: `${copy.nav.terms} — AstaSecure`,
    };
    document.title = titles[activePage];
  }, [activePage, copy]);

  const navigate = (page: CorporatePageId, prefillTopic?: string) => {
    setContactTopic(prefillTopic);
    setActivePage(page);
    const nextPath = CORPORATE_ROUTES[page];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col">
      <CorporateHeader activePage={activePage} onNavigate={(page) => navigate(page)} />

      <main className="flex-1">
        {activePage === 'home' && <HomeView plans={plans} onNavigate={navigate} />}
        {activePage === 'about' && <AboutPage onNavigate={navigate} />}
        {activePage === 'services' && <ServicesPage onNavigate={navigate} />}
        {activePage === 'solutions' && <SolutionsPage onNavigate={navigate} />}
        {activePage === 'monitor' && <MonitorProductPage onNavigate={navigate} />}
        {activePage === 'why-us' && <WhyChooseUsPage onNavigate={navigate} />}
        {activePage === 'pricing' && (
          <PricingPage plans={plans} onSelectPlan={(planName) => navigate('contact', planName)} />
        )}
        {activePage === 'contact' && (
          <ContactPage prefillTopic={contactTopic} onNavigate={(page) => navigate(page)} />
        )}
        {activePage === 'faq' && <FaqPage onNavigate={(page) => navigate(page)} />}
        {activePage === 'privacy' && <LegalDocumentPage docType="privacy" />}
        {activePage === 'terms' && <LegalDocumentPage docType="terms" />}
      </main>

      <CorporateFooter onNavigate={(page) => navigate(page)} />
    </div>
  );
};
