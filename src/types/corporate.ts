export type CorporatePageId =
  | 'home'
  | 'about'
  | 'services'
  | 'solutions'
  | 'monitor'
  | 'why-us'
  | 'pricing'
  | 'contact'
  | 'faq'
  | 'privacy'
  | 'terms';

export const CORPORATE_ROUTES: Record<CorporatePageId, string> = {
  home: '/',
  about: '/about',
  services: '/services',
  solutions: '/solutions',
  monitor: '/monitor',
  'why-us': '/why-choose-us',
  pricing: '/pricing',
  contact: '/contact',
  faq: '/faq',
  privacy: '/privacy-policy',
  terms: '/terms-and-conditions',
};

export function resolvePageFromPath(pathname: string): CorporatePageId {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const match = (Object.entries(CORPORATE_ROUTES) as [CorporatePageId, string][]).find(
    ([, route]) => route === clean
  );
  return match ? match[0] : 'home';
}
