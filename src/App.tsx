import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppWorkspace } from './pages/AppWorkspace';
import { AuthScreen, EmailVerificationGate, TotpChallengeGate } from './pages/AuthViews';
import { PublicPageId, PublicSite } from './pages/PublicSite';

type ViewMode = 'public' | 'auth' | 'workspace';

const ROUTE_TO_PUBLIC: Record<string, PublicPageId> = {
  '/': 'home',
  '/features': 'features',
  '/how-it-works': 'how-it-works',
  '/pricing': 'pricing',
  '/about': 'about',
  '/contact': 'contact',
  '/faq': 'faq',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/scanning': 'scanning',
  // Legacy corporate route aliases preserved cleanly
  '/services': 'features',
  '/solutions': 'features',
  '/monitor': 'how-it-works',
  '/why-us': 'about',
};

const PUBLIC_TO_ROUTE: Record<PublicPageId, string> = {
  home: '/',
  features: '/features',
  'how-it-works': '/how-it-works',
  pricing: '/pricing',
  about: '/about',
  contact: '/contact',
  faq: '/faq',
  privacy: '/privacy',
  terms: '/terms',
  scanning: '/scanning',
};

const AppRouter: React.FC = () => {
  const { user, loading, emailVerified, totpRequired, totpVerified } = useAuth();

  const [view, setView] = useState<ViewMode>(() => {
    const p = window.location.pathname;
    if (p === '/login' || p === '/register') return 'auth';
    if (p === '/app' || p.startsWith('/app/')) return 'workspace';
    return 'public';
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    window.location.pathname === '/register' ? 'register' : 'login'
  );
  const [publicPage, setPublicPage] = useState<PublicPageId>(
    () => ROUTE_TO_PUBLIC[window.location.pathname] || 'home'
  );

  // Sync browser back/forward navigation
  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname;
      if (p === '/login') {
        setAuthMode('login');
        setView('auth');
      } else if (p === '/register') {
        setAuthMode('register');
        setView('auth');
      } else if (p === '/app' || p.startsWith('/app/')) {
        setView('workspace');
      } else {
        setPublicPage(ROUTE_TO_PUBLIC[p] || 'home');
        setView('public');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Automatically enter workspace once signed in from Auth screen
  useEffect(() => {
    if (user && view === 'auth') {
      setView('workspace');
      if (window.location.pathname !== '/app') {
        window.history.replaceState({}, '', '/app');
      }
    }
  }, [user, view]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060B14] text-slate-200 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#00C8E8] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading AstaSecure Monitor...</p>
        </div>
      </div>
    );
  }

  // Verified signed-in users visiting Auth or Workspace pass through mandatory verification & 2FA gates
  if (user && (view === 'workspace' || !emailVerified || (totpRequired && !totpVerified))) {
    if (!emailVerified) {
      return <EmailVerificationGate />;
    }
    if (totpRequired && !totpVerified) {
      return <TotpChallengeGate />;
    }
    return (
      <AppWorkspace
        onOpenPublicSite={() => {
          setPublicPage('home');
          setView('public');
          window.history.pushState({}, '', '/');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  if (view === 'auth' && !user) {
    return (
      <AuthScreen
        initialMode={authMode}
        onBackHome={() => {
          setPublicPage('home');
          setView('public');
          window.history.pushState({}, '', '/');
        }}
        onOpenLegal={(doc) => {
          setPublicPage(doc);
          setView('public');
          window.history.pushState({}, '', PUBLIC_TO_ROUTE[doc]);
        }}
      />
    );
  }

  return (
    <PublicSite
      activePage={publicPage}
      onNavigate={(page) => {
        setPublicPage(page);
        setView('public');
        const targetPath = PUBLIC_TO_ROUTE[page];
        if (window.location.pathname !== targetPath) {
          window.history.pushState({}, '', targetPath);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onOpenAuth={(mode, prefillDomain) => {
        if (prefillDomain) {
          localStorage.setItem('astasecure_prefill_domain', prefillDomain);
        }
        setAuthMode(mode);
        setView('auth');
        window.history.pushState({}, '', mode === 'register' ? '/register' : '/login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onOpenWorkspace={() => {
        if (user) {
          setView('workspace');
          window.history.pushState({}, '', '/app');
        } else {
          setAuthMode('login');
          setView('auth');
          window.history.pushState({}, '', '/login');
        }
      }}
    />
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
