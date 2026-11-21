import { AppLanguage } from '../types/astasecure';

export interface CorporateCopy {
  brand: string;
  tagline: string;
  positioning: string;
  nav: {
    services: string;
    solutions: string;
    monitor: string;
    about: string;
    pricing: string;
    whyUs: string;
    faq: string;
    contact: string;
    privacy: string;
    terms: string;
    home: string;
  };
  hero: {
    kicker: string;
    headline: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  home: {
    introLabel: string;
    introTitle: string;
    introBody: string;
    introPoint1: string;
    introPoint2: string;
    introPoint3: string;
    introLink: string;
    servicesLabel: string;
    servicesTitle: string;
    servicesSub: string;
    servicesAllLink: string;
    solutionsLabel: string;
    solutionsTitle: string;
    solutionsSub: string;
    solutionsLink: string;
    monitorLabel: string;
    monitorTitle: string;
    monitorSub: string;
    monitorBullets: string[];
    monitorLink: string;
    whyLabel: string;
    whyTitle: string;
    whySub: string;
    whyLink: string;
    pricingLabel: string;
    pricingTitle: string;
    pricingSub: string;
    pricingLink: string;
    ctaTitle: string;
    ctaBody: string;
    ctaButton: string;
  };
  servicesList: {
    number: string;
    title: string;
    summary: string;
    deliverables: string[];
  }[];
  solutionsList: {
    title: string;
    audience: string;
    description: string;
    outcomes: string[];
  }[];
  whyPoints: {
    title: string;
    description: string;
  }[];
  about: {
    kicker: string;
    title: string;
    lead: string;
    missionTitle: string;
    missionBody: string;
    visionTitle: string;
    visionBody: string;
    principlesTitle: string;
    principles: { title: string; body: string }[];
  };
  monitorPage: {
    kicker: string;
    title: string;
    lead: string;
    ctaButton: string;
    architectureTitle: string;
    architectureSub: string;
    checks: { code: string; name: string; desc: string }[];
    workflowTitle: string;
    workflowSteps: { step: string; title: string; desc: string }[];
    scoringTitle: string;
    scoringSub: string;
    scoringTiers: { label: string; points: string; desc: string }[];
  };
  pricingPage: {
    kicker: string;
    title: string;
    lead: string;
    perMonth: string;
    freeLabel: string;
    domainsUnit: string;
    domainSingular: string;
    dailyScansLabel: string;
    scheduleLabel: string;
    pdfIncluded: string;
    pdfExcluded: string;
    selectPlanCta: string;
    note: string;
  };
  contactPage: {
    kicker: string;
    title: string;
    lead: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    companyLabel: string;
    companyPlaceholder: string;
    topicLabel: string;
    topics: string[];
    messageLabel: string;
    messagePlaceholder: string;
    submitBtn: string;
    sendingBtn: string;
    successTitle: string;
    successBody: string;
    sendAnother: string;
    errRequired: string;
    errEmail: string;
    directTitle: string;
    directEmail: string;
    directScope: string;
    directResponse: string;
  };
  faqPage: {
    kicker: string;
    title: string;
    lead: string;
    items: { q: string; a: string }[];
  };
  legal: {
    privacyTitle: string;
    privacyUpdated: string;
    privacySections: { heading: string; body: string }[];
    termsTitle: string;
    termsUpdated: string;
    termsSections: { heading: string; body: string }[];
  };
  footer: {
    companyCol: string;
    offeringsCol: string;
    legalCol: string;
    languageLabel: string;
    copyright: string;
    locationNote: string;
  };
}

export const CORPORATE_TRANSLATIONS: Record<AppLanguage, CorporateCopy> = {
  en: {
    brand: 'ASTASECURE',
    tagline: 'Protecting Businesses. Empowering Growth.',
    positioning: 'Affordable Cybersecurity for SMEs',
    nav: {
      home: 'Home',
      services: 'Services',
      solutions: 'Solutions',
      monitor: 'Monitor',
      about: 'About',
      pricing: 'Pricing',
      whyUs: 'Why Choose Us',
      faq: 'FAQ',
      contact: 'Contact Us',
      privacy: 'Privacy Policy',
      terms: 'Terms & Conditions',
    },
    hero: {
      kicker: 'ASTASECURE · CYBERSECURITY FOR SMES',
      headline: 'Defend your business domain, email reputation, and digital trust.',
      subheadline:
        'AstaSecure delivers practical cybersecurity assessments, domain and DNS protection, executive advisory, and AstaSecure Monitor—helping small and mid-sized businesses prevent phishing, spoofing, and configuration exposure without enterprise complexity.',
      ctaPrimary: 'Contact Us',
      ctaSecondary: 'Explore AstaSecure Monitor',
    },
    home: {
      introLabel: 'Who We Are',
      introTitle: 'Built to make institutional cybersecurity accessible to growing companies.',
      introBody:
        'Small and mid-sized businesses face the same domain spoofing, business email compromise, and DNS misconfiguration risks as large enterprises, yet traditional security consultancies and tools remain priced out of reach. AstaSecure bridges that gap with honest, evidence-based technical services and clear guidance.',
      introPoint1: 'Plain-language findings designed for business leaders and lean IT teams.',
      introPoint2: 'Strict ethical scope grounded in verified domain ownership and passive telemetry.',
      introPoint3: 'Transparent pricing in Tunisian Dinars with international delivery standards.',
      introLink: 'Read our company story',
      servicesLabel: 'Our Services',
      servicesTitle: 'Focused cybersecurity services for essential business infrastructure.',
      servicesSub:
        'Every engagement prioritizes measurable risk reduction across domain ownership, business email authentication, and public DNS resilience.',
      servicesAllLink: 'View all services',
      solutionsLabel: 'Cybersecurity Solutions',
      solutionsTitle: 'Structured protection tailored to how SMEs and agencies operate.',
      solutionsSub:
        'From single-domain growing companies to agencies managing dozens of client brands, our solutions combine technical defense with actionable oversight.',
      solutionsLink: 'Explore business solutions',
      monitorLabel: 'Flagship Product',
      monitorTitle: 'AstaSecure Monitor: clarity over your public DNS and email posture.',
      monitorSub:
        'Designed by our engineering team, AstaSecure Monitor pairs passive checks across SPF, DKIM, DMARC, MX, NS, SOA, DNSSEC, CAA, and TLS with provider-specific fix guides and bilingual PDF reports.',
      monitorBullets: [
        'Two-resolver DNS TXT ownership verification before any scan runs.',
        'Weighted /100 evidence scoring without fabricated failures or false DKIM penalties.',
        'Copy-ready DNS remediation instructions across 10+ major registrars and hosts.',
      ],
      monitorLink: 'Inspect AstaSecure Monitor',
      whyLabel: 'Why Choose AstaSecure',
      whyTitle: 'Honest security engineering over noise and fear.',
      whySub:
        'We publish exact scoring logic, separate unverified checks from confirmed weaknesses, and communicate cleanly across English, French, and Arabic.',
      whyLink: 'See what sets us apart',
      pricingLabel: 'Transparent Plans',
      pricingTitle: 'Predictable protection starting at 49 TND per month.',
      pricingSub:
        'Clear tier limits with zero hidden fees. Speak with our team to select the right service scope or product tier.',
      pricingLink: 'Compare full pricing',
      ctaTitle: 'Ready to strengthen your company’s domain and email defenses?',
      ctaBody:
        'Tell us about your domains, email infrastructure, or advisory needs. Our team responds promptly with a clear scope.',
      ctaButton: 'Schedule a Consultation',
    },
    servicesList: [
      {
        number: '01. Domain Security Assessment',
        title: 'Comprehensive External Domain Posture Review',
        summary:
          'Deep passive inspection of your public DNS footprint, nameserver delegation, zone authority parameters, CAA certificate restrictions, and HTTPS/TLS expiration readiness.',
        deliverables: [
          'Verified baseline /100 risk posture score',
          'Subdomain delegation & registrar lock recommendations',
          'Prioritized corrective action roadmap',
        ],
      },
      {
        number: '02. Business Email Security',
        title: 'Anti-Spoofing & Executive Impersonation Defense',
        summary:
          'End-to-end alignment across SPF lookup budgets, cryptographic DKIM key validation, DMARC enforcement progression, and MX routing integrity to stop exact-domain phishing.',
        deliverables: [
          'SPF 10-lookup ceiling & +all elimination',
          'Safe phased rollout from p=none to p=quarantine and p=reject',
          'Accurate DKIM selector verification without false positives',
        ],
      },
      {
        number: '03. DNS Security Monitoring',
        title: 'Continuous Passive Integrity & Drift Detection',
        summary:
          'Ongoing scheduled verification across authoritative nameservers, DNSSEC chain signatures, and TLS certificate validity so accidental record edits or expiring certificates are caught early.',
        deliverables: [
          'Independent multi-resolver consistency checks',
          'DNSSEC DS & DNSKEY verification tracking',
          'Bilingual executive reports with SHA-256 checksums',
        ],
      },
      {
        number: '04. Cybersecurity Consulting',
        title: 'Practical Advisory for SMEs & Lean IT Teams',
        summary:
          'Hands-on guidance helping management and technical staff implement hardening fixes, prepare for regulatory expectations (including pre-assessment readiness aligned with ANCS Decree-Law No. 2023-17), and build security hygiene.',
        deliverables: [
          'Hosting-specific configuration walkthroughs',
          'Pre-audit gap readiness & executive briefings',
          'Multi-domain governance frameworks for agencies',
        ],
      },
    ],
    solutionsList: [
      {
        title: 'Growing SME Defense',
        audience: 'Small & Medium Enterprises · 1–3 Primary Domains',
        description:
          'Protects customer trust, invoice correspondence, and executive email accounts from domain impersonation and avoidable DNS outages.',
        outcomes: [
          'Prevent attackers from sending spoofed invoices under your domain',
          'Eliminate silent email deliverability drops caused by SPF errors',
          'Plain-language guidance any IT administrator can execute',
        ],
      },
      {
        title: 'E-Commerce & Financial Trust',
        audience: 'Online Merchants, Fintech & Service Platforms',
        description:
          'Hardens transactional email authentication, certificate issuer controls (CAA), and DNSSEC integrity across customer-facing domains.',
        outcomes: [
          'Restrict unauthorized TLS certificate issuance via CAA policy',
          'Track certificate renewal windows before browser outages occur',
          'Generate shareable compliance summaries for partners and insurers',
        ],
      },
      {
        title: 'Agency & Multi-Brand Governance',
        audience: 'Digital Agencies, MSPs & Holding Groups',
        description:
          'Standardizes domain and email security baselines across up to 25+ client or subsidiary domains with centralized oversight and exportable client deliverables.',
        outcomes: [
          'Consistent evaluation standard across every managed domain',
          'Hosting-tailored instructions for Cloudflare, OVHcloud, GoDaddy, AWS, and more',
          'Bilingual EN / FR PDF documentation ready for client reviews',
        ],
      },
      {
        title: 'Pre-Audit Readiness Support',
        audience: 'Organizations Preparing for Regulatory Audits',
        description:
          'Structured external hygiene assessment and technical evidence collection ahead of formal reviews conducted by ANCS-certified auditors.',
        outcomes: [
          'Close obvious public DNS and email gaps prior to formal audit dates',
          'Maintain time-stamped evidence logs of configuration improvements',
          'Clear distinction between passive readiness and formal statutory audits',
        ],
      },
    ],
    whyPoints: [
      {
        title: 'Strict Ownership-First Ethics',
        description:
          'We never run scans without explicit technical proof of domain control via two independent public DNS resolvers (1.1.1.1 and 8.8.8.8).',
      },
      {
        title: 'Zero Scareware or False Failures',
        description:
          'If a DKIM selector is custom or undisclosed, or a resolver times out temporarily, it is honestly labeled Not Verified or Technical Error—never billed as a false vulnerability.',
      },
      {
        title: 'Provider-Tailored Remediation',
        description:
          'Rather than dumping generic RFC excerpts, our guidance maps fixes to the DNS host your domain actually uses, saving hours of trial and error.',
      },
      {
        title: 'Accessible Local & International Pricing',
        description:
          'Built in Tunisia with international engineering rigor, our TND tiers remove currency and budget barriers that keep SMEs exposed.',
      },
      {
        title: 'Trilingual Business Clarity',
        description:
          'Clear communication across English, French, and Arabic (including RTL layout support) empowers leadership, legal teams, and IT providers to stay aligned.',
      },
      {
        title: 'Verifiable Evidence & Reporting',
        description:
          'Every score deduction is tied directly to raw observed records and severity weights, backed by EN/FR PDF summaries with SHA-256 integrity hashes.',
      },
    ],
    about: {
      kicker: 'ABOUT ASTASECURE',
      title: 'Protecting Businesses. Empowering Growth.',
      lead:
        'AstaSecure is an international-ambition cybersecurity company dedicated to closing the protection gap for small and mid-sized businesses.',
      missionTitle: 'Our Mission',
      missionBody:
        'Modern organizations rely on domain names and business email for nearly every commercial transaction, yet basic DNS and email authentication defenses remain widely misconfigured. AstaSecure exists to turn opaque external security risks into clear, affordable, and measurable action.',
      visionTitle: 'Where We Are Going',
      visionBody:
        'Founded to serve SMEs, digital agencies, and regional businesses in Tunisia and across international markets, AstaSecure combines disciplined cybersecurity consulting with reliable software engineering—proving that rigorous protection does not require an enterprise security budget.',
      principlesTitle: 'Operating Principles',
      principles: [
        {
          title: 'Evidence Over Assumptions',
          body: 'Every finding and recommendation originates from observable records and deterministic evaluation rules.',
        },
        {
          title: 'Authorized & Passive Always',
          body: 'Our assessments inspect public DNS and TLS infrastructure only after verifiable domain authorization.',
        },
        {
          title: 'Built for Non-Specialists',
          body: 'Technical rigor under the hood; plain human language for executives, operations leads, and IT contractors.',
        },
      ],
    },
    monitorPage: {
      kicker: 'PRODUCT PRESENTATION · ASTASECURE MONITOR',
      title: 'AstaSecure Monitor: Purpose-built domain & email security visibility.',
      lead:
        'One of AstaSecure’s core cybersecurity products, AstaSecure Monitor translates complex DNS and email authentication telemetry into an evidence-based /100 score, copy-ready remediation guides, and executive reports.',
      ctaButton: 'Request a Product Walkthrough',
      architectureTitle: 'Nine Core Technical Checks',
      architectureSub:
        'Eight passive DNS and email authentication controls plus HTTPS/TLS certificate inspection, evaluated against clear technical rules.',
      checks: [
        { code: 'DMARC', name: 'Anti-Spoofing Policy', desc: 'Inspects p=, sp=, pct=, and rua= aggregate reporting tags at _dmarc.' },
        { code: 'SPF', name: 'Authorized Mail Senders', desc: 'Validates v=spf1 syntax, rejects multi-record conflicts, checks +all exposure, and counts 10-lookup limits.' },
        { code: 'DKIM', name: 'Cryptographic Signatures', desc: 'Evaluates custom and standard selectors accurately without falsely penalizing unknown selectors.' },
        { code: 'MX', name: 'Mail Routing & Alignment', desc: 'Checks MX priority resolution, A/AAAA targets, Null MX support, and SPF alignment.' },
        { code: 'NS', name: 'Nameserver Redundancy', desc: 'Verifies distributed authoritative nameservers and identifies the active DNS hosting provider.' },
        { code: 'SOA', name: 'Zone Authority Hygiene', desc: 'Audits primary nameserver, hostmaster configuration, serial conventions, and TTL timers.' },
        { code: 'DNSSEC', name: 'Cryptographic DNS Integrity', desc: 'Confirms DS delegation and DNSKEY signing with Authenticated Data verification.' },
        { code: 'CAA', name: 'Certificate Authority Locks', desc: 'Checks CAA policies controlling which Certificate Authorities may issue domain TLS certificates.' },
        { code: 'TLS', name: 'HTTPS Certificate Health', desc: 'Monitors chain validity, handshake security, and upcoming expiration thresholds.' },
      ],
      workflowTitle: 'How AstaSecure Monitor Works',
      workflowSteps: [
        {
          step: '01',
          title: 'Domain Validation',
          desc: 'Strict syntax validation blocks raw IP addresses and internal hostnames before issuing a 7-day verification token.',
        },
        {
          step: '02',
          title: 'Dual-Resolver TXT Proof',
          desc: 'Two independent public resolvers (1.1.1.1 and 8.8.8.8) must confirm the astasecure-verify TXT record.',
        },
        {
          step: '03',
          title: 'Server-Side Evaluation',
          desc: 'All checks execute server-side and compute a deterministic /100 posture score backed by raw record snapshots.',
        },
        {
          step: '04',
          title: 'Guided Remediation & PDF',
          desc: 'Teams follow provider-specific DNS steps and export EN or FR executive PDF briefs with SHA-256 verification.',
        },
      ],
      scoringTitle: 'Transparent Deduction Model',
      scoringSub:
        'Every verified domain begins at 100/100. Deductions apply exclusively to confirmed configuration risks.',
      scoringTiers: [
        { label: 'Critical Weakness', points: '-25 pts', desc: 'Exposed SPF +all or absent DMARC enforcement on active mail domains.' },
        { label: 'High Risk', points: '-15 pts', desc: 'Missing SPF, unvalidated DNSSEC signing, or critical mail routing failure.' },
        { label: 'Medium Risk', points: '-8 pts', desc: 'Missing CAA restriction, DMARC monitoring-only (p=none), or weak TTL hygiene.' },
        { label: 'Low / Advisory', points: '-3 pts', desc: 'Minor metadata or secondary best-practice refinements.' },
      ],
    },
    pricingPage: {
      kicker: 'PRICING & PLANS',
      title: 'Affordable cybersecurity plans in Tunisian Dinars.',
      lead:
        'Start with an initial domain verification scope or equip your organization or agency with continuous monitoring and executive PDF deliverables.',
      perMonth: '/ month',
      freeLabel: 'Free',
      domainsUnit: 'verified domains',
      domainSingular: 'verified domain',
      dailyScansLabel: 'Daily check quota',
      scheduleLabel: 'Cadence',
      pdfIncluded: 'EN / FR Executive PDF reports included',
      pdfExcluded: 'Summary web overview only',
      selectPlanCta: 'Inquire About This Plan',
      note: 'All plans operate strictly under authorized, passive DNS verification policies. Custom consulting retainers are quoted separately.',
    },
    contactPage: {
      kicker: 'CONTACT ASTASECURE',
      title: 'Speak with our cybersecurity team.',
      lead:
        'Whether you want a domain & business email security assessment, consulting advice, or a walkthrough of AstaSecure Monitor, send us a message below.',
      nameLabel: 'Full Name',
      namePlaceholder: 'Amira Ben Salem',
      emailLabel: 'Business Email',
      emailPlaceholder: 'amira@company.tn',
      companyLabel: 'Company / Organization',
      companyPlaceholder: 'Company Name SARL',
      topicLabel: 'Area of Interest',
      topics: [
        'Domain Security Assessment',
        'Business Email Security (SPF / DKIM / DMARC)',
        'DNS Security Monitoring',
        'Cybersecurity Consulting',
        'AstaSecure Monitor Product Inquiry',
      ],
      messageLabel: 'How can we help?',
      messagePlaceholder: 'Share your domain count, current email/DNS setup, or timeline...',
      submitBtn: 'Send Inquiry',
      sendingBtn: 'Sending...',
      successTitle: 'Inquiry Received',
      successBody:
        'Thank you for contacting AstaSecure. Your inquiry has been recorded securely and our team will reply to your business email.',
      sendAnother: 'Send another message',
      errRequired: 'Please complete your name, valid business email, and message.',
      errEmail: 'Please enter a valid business email address.',
      directTitle: 'Engagement Scope & Response',
      directEmail: 'contact@astasecure.com',
      directScope: 'SMEs, Mid-Market Organizations & Digital Agencies (Tunisia & International)',
      directResponse: 'Standard inquiry response within 1 business day.',
    },
    faqPage: {
      kicker: 'FREQUENTLY ASKED QUESTIONS',
      title: 'Clear answers about our services, methodology, and product.',
      lead:
        'Everything business leaders and IT teams commonly ask before starting an assessment with AstaSecure.',
      items: [
        {
          q: 'Why does AstaSecure verify domain ownership before scanning?',
          a: 'Running security checks without verified authorization blurs ethical and legal boundaries. Publishing a temporary DNS TXT record (verified independently on 1.1.1.1 and 8.8.8.8) proves your business controls the domain before any assessment runs.',
        },
        {
          q: 'How does AstaSecure calculate domain security scores out of 100?',
          a: 'Each verified domain starts at 100. Points are deducted strictly for confirmed technical weaknesses weighted by severity: Critical (-25), High (-15), Medium (-8), and Low (-3). Unverified checks or temporary resolver timeouts never deduct points.',
        },
        {
          q: 'Why is DKIM sometimes marked Not Verified instead of Missing?',
          a: 'DKIM keys reside under provider-defined selectors (such as google, selector1, or custom values). Rather than guessing and inventing false defects when a selector is unknown, AstaSecure Monitor marks the check Not Verified until the active selector is supplied.',
        },
        {
          q: 'Does AstaSecure replace an ANCS-certified statutory audit under Decree-Law No. 2023-17?',
          a: 'No. Under Tunisian Decree-Law No. 2023-17, regulated statutory audits are legally reserved for ANCS-certified auditors. AstaSecure provides passive external technical monitoring, readiness preparation, and remediation guidance to help businesses strengthen security ahead of formal obligations.',
        },
        {
          q: 'Which DNS hosting providers do your remediation guides support?',
          a: 'Our structured remediation instructions cover Cloudflare, OVHcloud, GoDaddy, AWS Route 53, Microsoft Azure DNS, Namecheap, Gandi, IONOS, Hostinger, and standard cPanel / regional registrar control panels.',
        },
        {
          q: 'Do you require intrusive agents or mail server credentials?',
          a: 'Never. All domain and email posture checks inspect strictly public DNS records and public TLS certificates passively—zero mailbox access, zero agents, and zero production downtime.',
        },
      ],
    },
    legal: {
      privacyTitle: 'Privacy Policy',
      privacyUpdated: 'Effective Date: 2025 · AstaSecure Corporate Website',
      privacySections: [
        {
          heading: '1. Scope & Data Minimization',
          body: 'AstaSecure collects only the personal and corporate details you voluntarily submit through our Contact Us inquiry form (name, business email address, company name, and inquiry message). We do not sell, rent, or broker visitor data to third parties.',
        },
        {
          heading: '2. Purpose of Processing',
          body: 'Submitted inquiry details are used strictly to respond to consultation requests, scope cybersecurity services, provide information about AstaSecure Monitor, and maintain legitimate business records.',
        },
        {
          heading: '3. Passive Technical Assessment Principles',
          body: 'All AstaSecure technical assessments rely strictly on publicly resolvable DNS records and TLS handshakes after explicit domain ownership confirmation. We never inspect private mailbox contents or internal private networks.',
        },
        {
          heading: '4. Storage, Security & Rights',
          body: 'Website inquiry records are stored securely with strict access controls limited to authorized AstaSecure personnel. You may request access, correction, or deletion of your inquiry data at any time by writing to contact@astasecure.com.',
        },
      ],
      termsTitle: 'Terms & Conditions',
      termsUpdated: 'Effective Date: 2025 · AstaSecure Corporate Website',
      termsSections: [
        {
          heading: '1. Website Information & Scope',
          body: 'This website presents AstaSecure’s corporate cybersecurity services, consulting capabilities, pricing structure, and information regarding AstaSecure Monitor. Formal commercial engagements are governed by written service agreements.',
        },
        {
          heading: '2. Authorized Security Assessments Only',
          body: 'AstaSecure performs technical domain assessments solely for domains owned or explicitly authorized by the commissioning organization via verified DNS TXT proof or formal written authorization.',
        },
        {
          heading: '3. Regulatory & Audit Distinction',
          body: 'AstaSecure’s passive domain checks, posture scores, and readiness consulting support ongoing cybersecurity hygiene and do not substitute for mandatory statutory audits reserved for ANCS-certified auditors under applicable Tunisian law (Decree-Law No. 2023-17) or equivalent statutory bodies.',
        },
        {
          heading: '4. Intellectual Property & Limitation of Liability',
          body: 'All AstaSecure trademarks, logos, remediation materials, and report structures remain the intellectual property of AstaSecure. Information on this site is provided in good faith without warranty of uninterrupted external DNS network availability.',
        },
      ],
    },
    footer: {
      companyCol: 'Company',
      offeringsCol: 'Services & Product',
      legalCol: 'Support & Legal',
      languageLabel: 'Language',
      copyright: 'AstaSecure. All rights reserved.',
      locationNote: 'Protecting Businesses. Empowering Growth.',
    },
  },
  fr: {
    brand: 'ASTASECURE',
    tagline: 'Protéger les entreprises. Accélérer leur croissance.',
    positioning: 'Cybersécurité accessible pour les PME',
    nav: {
      home: 'Accueil',
      services: 'Services',
      solutions: 'Solutions',
      monitor: 'Monitor',
      about: 'À propos',
      pricing: 'Tarifs',
      whyUs: 'Pourquoi nous choisir',
      faq: 'FAQ',
      contact: 'Contact',
      privacy: 'Confidentialité',
      terms: 'Conditions générales',
    },
    hero: {
      kicker: 'ASTASECURE · CYBERSÉCURITÉ POUR PME',
      headline: 'Protégez votre domaine, vos e-mails professionnels et la confiance de vos clients.',
      subheadline:
        'AstaSecure propose des audits de sécurité de domaine, la protection des e-mails professionnels, la surveillance DNS, du conseil et le produit AstaSecure Monitor pour aider les PME à prévenir l’usurpation et le phishing sans complexité inutile.',
      ctaPrimary: 'Contactez-nous',
      ctaSecondary: 'Découvrir AstaSecure Monitor',
    },
    home: {
      introLabel: 'Qui sommes-nous',
      introTitle: 'Rendre la cybersécurité rigoureuse accessible aux entreprises en croissance.',
      introBody:
        'Les PME sont exposées aux mêmes attaques par usurpation de domaine et fraude au président que les grands groupes, mais disposent rarement de budgets dédiés. AstaSecure comble cet écart grâce à une ingénierie défensive claire, vérifiable et adaptée aux équipes dirigeantes et IT.',
      introPoint1: 'Explications accessibles en français, anglais et arabe pour dirigeants et équipes IT.',
      introPoint2: 'Approche éthique strictement passive après preuve de propriété du domaine.',
      introPoint3: 'Tarification transparente en Dinars Tunisiens aux standards internationaux.',
      introLink: 'Découvrir notre entreprise',
      servicesLabel: 'Nos Services',
      servicesTitle: 'Des services ciblés sur vos fondations numériques critiques.',
      servicesSub:
        'Chaque mission vise une réduction mesurable des risques sur vos noms de domaine, votre messagerie professionnelle et votre infrastructure DNS.',
      servicesAllLink: 'Voir tous nos services',
      solutionsLabel: 'Solutions Cybersécurité',
      solutionsTitle: 'Des réponses adaptées aux réalités des PME et des agences.',
      solutionsSub:
        'De la PME gérant un domaine unique à l’agence supervisant plusieurs dizaines de marques, nos solutions structurent la défense durablement.',
      solutionsLink: 'Explorer nos solutions',
      monitorLabel: 'Produit Phare',
      monitorTitle: 'AstaSecure Monitor : visibilité complète sur votre posture DNS et e-mail.',
      monitorSub:
        'Conçu par nos ingénieurs, AstaSecure Monitor associe des vérifications passives sur SPF, DKIM, DMARC, MX, NS, SOA, DNSSEC, CAA et TLS à des guides de correction par hébergeur et des rapports PDF bilingues.',
      monitorBullets: [
        'Validation de propriété DNS TXT sur deux résolveurs indépendants avant toute analyse.',
        'Indice sur 100 fondé sur les preuves observées, sans pénalité injustifiée sur DKIM.',
        'Instructions prêtes à copier pour plus de 10 bureaux d’enregistrement et hébergeurs.',
      ],
      monitorLink: 'Présentation d’AstaSecure Monitor',
      whyLabel: 'Pourquoi AstaSecure',
      whyTitle: 'Une cybersécurité honnête, loin des discours alarmistes.',
      whySub:
        'Nous documentons chaque règle de notation, distinguons clairement les contrôles non vérifiés des défauts confirmés et communiquons sans jargon opaque.',
      whyLink: 'Nos engagements',
      pricingLabel: 'Tarifs Transparents',
      pricingTitle: 'Une protection prévisible à partir de 49 TND par mois.',
      pricingSub:
        'Des formules lisibles sans frais cachés. Échangez avec notre équipe pour choisir le périmètre adapté à votre entreprise.',
      pricingLink: 'Comparer les offres',
      ctaTitle: 'Prêt à renforcer la sécurité de votre domaine et de vos e-mails ?',
      ctaBody:
        'Présentez-nous vos domaines, votre messagerie ou vos besoins de conseil. Notre équipe vous répond rapidement avec une proposition claire.',
      ctaButton: 'Planifier un échange',
    },
    servicesList: [
      {
        number: '01. Évaluation de sécurité de domaine',
        title: 'Audit externe complet de votre surface DNS',
        summary:
          'Inspection passive approfondie de votre empreinte DNS publique, redondance des serveurs de noms, paramètres SOA, restrictions CAA et validité des certificats HTTPS/TLS.',
        deliverables: [
          'Score de posture vérifié sur 100 avec preuves brutes',
          'Recommandations de verrouillage et de délégation DNS',
          'Plan d’action hiérarchisé par gravité',
        ],
      },
      {
        number: '02. Sécurité des e-mails professionnels',
        title: 'Protection contre l’usurpation et le phishing ciblé',
        summary:
          'Mise en conformité complète de vos enregistrements SPF, signatures cryptographiques DKIM, politiques DMARC et routage MX afin de bloquer l’usurpation de votre nom de domaine.',
        deliverables: [
          'Maîtrise du plafond de 10 requêtes SPF et suppression de +all',
          'Transition sécurisée de p=none vers p=quarantine et p=reject',
          'Vérification exacte des sélecteurs DKIM sans faux négatifs',
        ],
      },
      {
        number: '03. Surveillance de sécurité DNS',
        title: 'Détection continue des dérives de configuration',
        summary:
          'Contrôles planifiés sur vos serveurs faisant autorité, signatures DNSSEC et échéances TLS pour détecter rapidement toute erreur humaine ou expiration imminente.',
        deliverables: [
          'Contrôles croisés sur résolveurs publics indépendants',
          'Suivi des enregistrements DS et DNSKEY',
          'Rapports exécutifs PDF EN/FR horodatés avec empreinte SHA-256',
        ],
      },
      {
        number: '04. Conseil en cybersécurité',
        title: 'Accompagnement pragmatique pour PME et équipes IT',
        summary:
          'Assistance opérationnelle pour déployer les correctifs DNS, sensibiliser les équipes et préparer vos systèmes en amont des audits réglementaires (y compris le cadre ANCS, Décret-loi n° 2023-17).',
        deliverables: [
          'Accompagnement pas à pas selon votre hébergeur DNS',
          'Pré-évaluation de maturité avant audit officiel',
          'Gouvernance multi-domaines pour groupes et agences',
        ],
      },
    ],
    solutionsList: [
      {
        title: 'Protection des PME en croissance',
        audience: 'Entreprises · 1 à 3 domaines principaux',
        description:
          'Protège vos échanges financiers, factures et boîtes de direction contre l’usurpation d’identité numérique et les pertes de délivrabilité.',
        outcomes: [
          'Réduit drastiquement le risque de faux ordres de virement usurpant votre domaine',
          'Stabilise la délivrabilité de vos e-mails clients et fournisseurs',
          'Instructions compréhensibles par tout prestataire informatique',
        ],
      },
      {
        title: 'Confiance E-Commerce & Services Financiers',
        audience: 'Boutiques en ligne, Fintech & Plateformes',
        description:
          'Verrouille l’authentification des e-mails transactionnels, les autorités de certification autorisées (CAA) et l’intégrité DNSSEC.',
        outcomes: [
          'Empêche l’émission non autorisée de certificats TLS via CAA',
          'Anticipe les renouvellements de certificats avant toute coupure',
          'Documentation claire pour partenaires bancaires et assureurs',
        ],
      },
      {
        title: 'Gouvernance Agences & Multi-Marques',
        audience: 'Agences digitales, ESN & Groupes',
        description:
          'Unifie les contrôles de sécurité sur 25 domaines clients ou filiales et produit des livrables professionnels bilingues.',
        outcomes: [
          'Référentiel unique d’évaluation sur l’ensemble de votre portefeuille',
          'Guides dédiés Cloudflare, OVHcloud, GoDaddy, AWS, Gandi et cPanel',
          'Rapports PDF en français et anglais prêts pour comités clients',
        ],
      },
      {
        title: 'Préparation pré-audit réglementaire',
        audience: 'Organisations soumises au cadre d’audit ANCS',
        description:
          'Assainissement préalable de la surface publique DNS et constitution de preuves techniques avant l’intervention d’un auditeur certifié.',
        outcomes: [
          'Résolution des écarts visibles avant la date d’audit officiel',
          'Historique horodaté des améliorations apportées',
          'Distinction claire entre préparation passive et audit légal ANCS',
        ],
      },
    ],
    whyPoints: [
      {
        title: 'Autorisation vérifiée avant toute action',
        description:
          'Aucun contrôle n’est engagé sans preuve technique préalable confirmée par deux résolveurs publics indépendants (1.1.1.1 et 8.8.8.8).',
      },
      {
        title: 'Zéro faux positif commercial',
        description:
          'Un sélecteur DKIM non communiqué ou un délai réseau ponctuel est indiqué honnêtement comme « Non vérifié » ou « Erreur technique », jamais comme une faille fictive.',
      },
      {
        title: 'Guides adaptés à votre hébergeur réel',
        description:
          'Nos procédures de remédiation ciblent directement le fournisseur DNS utilisé par votre entreprise pour accélérer la mise en conformité.',
      },
      {
        title: 'Tarifs maîtrisés en Dinars Tunisiens',
        description:
          'Conçue avec une exigence internationale et ancrée dans l’économie tunisienne, notre offre supprime les barrières financières des solutions étrangères.',
      },
      {
        title: 'Clarté trilingue FR / EN / AR',
        description:
          'Direction générale, juridique et support technique partagent la même lecture des priorités en français, anglais ou arabe.',
      },
      {
        title: 'Traçabilité et rapports signés SHA-256',
        description:
          'Chaque déduction de score repose sur une règle explicite et un enregistrement brut conservé dans les rapports PDF bilingues.',
      },
    ],
    about: {
      kicker: 'À PROPOS D’ASTASECURE',
      title: 'Protéger les entreprises. Accélérer leur croissance.',
      lead:
        'AstaSecure est une entreprise de cybersécurité à vocation internationale dédiée à la protection concrète des PME et agences.',
      missionTitle: 'Notre mission',
      missionBody:
        'Chaque entreprise dépend de son nom de domaine et de sa messagerie professionnelle, pourtant ces actifs restent fréquemment exposés faute d’accompagnement lisible. AstaSecure transforme ces angles morts techniques en décisions simples, abordables et mesurables.',
      visionTitle: 'Notre ambition',
      visionBody:
        'Née pour accompagner les PME tunisiennes comme les organisations internationales, AstaSecure réunit expertise en cybersécurité défensive et ingénierie logicielle fiable afin d’offrir une protection sérieuse sans budget démesuré.',
      principlesTitle: 'Nos principes d’action',
      principles: [
        {
          title: 'Des preuves avant les suppositions',
          body: 'Chaque constat s’appuie exclusivement sur des enregistrements techniques observables et des règles déterministes.',
        },
        {
          title: 'Contrôles passifs et autorisés',
          body: 'Nos vérifications portent uniquement sur les données DNS et TLS publiques après confirmation de propriété.',
        },
        {
          title: 'Pédagogie orientée action',
          body: 'Une rigueur technique complète traduite en étapes claires pour dirigeants et équipes informatiques.',
        },
      ],
    },
    monitorPage: {
      kicker: 'PRÉSENTATION PRODUIT · ASTASECURE MONITOR',
      title: 'AstaSecure Monitor : la maîtrise de votre posture domaine et e-mail.',
      lead:
        'Produit développé par AstaSecure, AstaSecure Monitor transforme les contrôles DNS et e-mail en un score transparent sur 100, des procédures de correction par hébergeur et des rapports exécutifs.',
      ctaButton: 'Demander une présentation produit',
      architectureTitle: 'Neuf contrôles techniques fondamentaux',
      architectureSub:
        'Huit standards DNS et messagerie ainsi que la surveillance des certificats HTTPS/TLS, analysés selon des règles déterministes.',
      checks: [
        { code: 'DMARC', name: 'Politique anti-usurpation', desc: 'Analyse p=, sp=, pct= et les rapports rua= sur _dmarc.' },
        { code: 'SPF', name: 'Expéditeurs autorisés', desc: 'Contrôle la syntaxe v=spf1, l’unicité du record, le risque +all et le seuil des 10 requêtes DNS.' },
        { code: 'DKIM', name: 'Signatures cryptographiques', desc: 'Vérifie les sélecteurs standards et personnalisés sans jamais inventer de faux manquements.' },
        { code: 'MX', name: 'Routage des e-mails', desc: 'Contrôle la priorité MX, la résolution A/AAAA, le Null MX et l’alignement SPF.' },
        { code: 'NS', name: 'Redondance des serveurs DNS', desc: 'Vérifie la résilience des serveurs faisant autorité et identifie votre hébergeur.' },
        { code: 'SOA', name: 'Autorité de zone DNS', desc: 'Audite le serveur primaire, le hostmaster, le numéro de série et les temporisateurs.' },
        { code: 'DNSSEC', name: 'Intégrité DNS cryptographique', desc: 'Valide les délégations DS, DNSKEY et l’indicateur Authenticated Data.' },
        { code: 'CAA', name: 'Contrôle des émetteurs TLS', desc: 'Vérifie les autorisations CAA limitant les autorités habilitées à émettre vos certificats.' },
        { code: 'TLS', name: 'Santé HTTPS & certificats', desc: 'Surveille la chaîne de confiance et les délais d’expiration avant incident.' },
      ],
      workflowTitle: 'Fonctionnement d’AstaSecure Monitor',
      workflowSteps: [
        {
          step: '01',
          title: 'Validation syntaxique',
          desc: 'Le moteur rejette les adresses IP et hôtes internes avant de générer un jeton TXT valable 7 jours.',
        },
        {
          step: '02',
          title: 'Preuve sur deux résolveurs',
          desc: 'Les résolveurs indépendants 1.1.1.1 et 8.8.8.8 confirment la présence de l’enregistrement astasecure-verify.',
        },
        {
          step: '03',
          title: 'Évaluation côté serveur',
          desc: 'Les contrôles s’exécutent côté serveur et établissent un score sur 100 avec preuves brutes archivées.',
        },
        {
          step: '04',
          title: 'Remédiation & PDF',
          desc: 'Suivez les guides propres à votre hébergeur et générez des rapports PDF EN ou FR vérifiés SHA-256.',
        },
      ],
      scoringTitle: 'Barème de notation transparent',
      scoringSub:
        'Chaque domaine vérifié démarre à 100/100. Seuls les risques techniques confirmés entraînent une déduction.',
      scoringTiers: [
        { label: 'Risque Critique', points: '-25 pts', desc: 'Exposition SPF +all ou absence critique de protection sur domaine actif.' },
        { label: 'Risque Élevé', points: '-15 pts', desc: 'Absence de SPF, DNSSEC non signé ou anomalie de routage mail.' },
        { label: 'Risque Moyen', points: '-8 pts', desc: 'Absence de CAA, politique DMARC en observation (p=none) ou hygiène SOA/TTL.' },
        { label: 'Risque Faible', points: '-3 pts', desc: 'Optimisations mineures et bonnes pratiques complémentaires.' },
      ],
    },
    pricingPage: {
      kicker: 'TARIFS & FORMULES',
      title: 'Des offres de cybersécurité lisibles en Dinars Tunisiens.',
      lead:
        'Démarrez avec un contrôle initial vérifié ou équipez votre entreprise et vos agences d’une surveillance continue avec rapports PDF.',
      perMonth: '/ mois',
      freeLabel: 'Gratuit',
      domainsUnit: 'domaines vérifiés',
      domainSingular: 'domaine vérifié',
      dailyScansLabel: 'Quota quotidien',
      scheduleLabel: 'Fréquence',
      pdfIncluded: 'Rapports PDF exécutifs EN / FR inclus',
      pdfExcluded: 'Synthèse web uniquement',
      selectPlanCta: 'Demander cette offre',
      note: 'Toutes les offres respectent strictement la vérification préalable de propriété DNS. Les missions de conseil sur mesure font l’objet d’un devis distinct.',
    },
    contactPage: {
      kicker: 'CONTACTER ASTASECURE',
      title: 'Échangez avec notre équipe cybersécurité.',
      lead:
        'Pour une évaluation de domaine, la sécurisation de votre messagerie professionnelle, du conseil ou une démonstration d’AstaSecure Monitor, écrivez-nous ci-dessous.',
      nameLabel: 'Nom complet',
      namePlaceholder: 'Amira Ben Salem',
      emailLabel: 'E-mail professionnel',
      emailPlaceholder: 'amira@entreprise.tn',
      companyLabel: 'Entreprise / Organisation',
      companyPlaceholder: 'Nom de la société',
      topicLabel: 'Objet de la demande',
      topics: [
        'Évaluation de sécurité de domaine',
        'Sécurité des e-mails professionnels (SPF / DKIM / DMARC)',
        'Surveillance DNS continue',
        'Conseil en cybersécurité',
        'Présentation d’AstaSecure Monitor',
      ],
      messageLabel: 'Votre besoin',
      messagePlaceholder: 'Précisez le nombre de domaines, votre hébergeur ou vos délais...',
      submitBtn: 'Envoyer la demande',
      sendingBtn: 'Envoi en cours...',
      successTitle: 'Demande enregistrée',
      successBody:
        'Merci pour votre message. Notre équipe a bien reçu votre demande et vous répondra prochainement par e-mail.',
      sendAnother: 'Envoyer un autre message',
      errRequired: 'Veuillez renseigner votre nom, une adresse e-mail valide et votre message.',
      errEmail: 'Veuillez saisir une adresse e-mail professionnelle valide.',
      directTitle: 'Périmètre & Délais',
      directEmail: 'contact@astasecure.com',
      directScope: 'PME, ETI et Agences digitales (Tunisie & International)',
      directResponse: 'Réponse sous 1 jour ouvré.',
    },
    faqPage: {
      kicker: 'QUESTIONS FRÉQUENTES',
      title: 'Réponses claires sur nos services, notre méthode et notre produit.',
      lead:
        'Les questions les plus fréquentes des dirigeants et équipes IT avant de collaborer avec AstaSecure.',
      items: [
        {
          q: 'Pourquoi vérifier la propriété DNS avant toute analyse ?',
          a: 'Inspecter un domaine sans autorisation vérifiable franchit une limite éthique et légale. La publication temporaire d’un enregistrement TXT confirmé par 1.1.1.1 et 8.8.8.8 garantit que votre entreprise contrôle effectivement le domaine.',
        },
        {
          q: 'Comment est calculé le score sur 100 ?',
          a: 'Tout domaine vérifié part de 100. Chaque anomalie confirmée déduit des points selon sa gravité : Critique (-25), Élevée (-15), Moyenne (-8), Faible (-3). Un élément non vérifié ou un délai DNS ne retire jamais de points.',
        },
        {
          q: 'Pourquoi DKIM apparaît-il parfois comme « Non vérifié » plutôt que « Manquant » ?',
          a: 'Les clés DKIM reposent sur un sélecteur choisi par l’expéditeur (google, selector1 ou personnalisé). Si aucun sélecteur connu n’est fourni, AstaSecure Monitor affiche honnêtement « Non vérifié » au lieu d’inventer une erreur.',
        },
        {
          q: 'AstaSecure remplace-t-il un audit réglementaire ANCS (Décret-loi n° 2023-17) ?',
          a: 'Non. En Tunisie, le Décret-loi n° 2023-17 réserve les audits réglementaires obligatoires aux auditeurs certifiés par l’ANCS. AstaSecure propose des contrôles techniques passifs, un accompagnement de préparation et une remédiation guidée.',
        },
        {
          q: 'Quels hébergeurs DNS sont couverts dans vos guides ?',
          a: 'Cloudflare, OVHcloud, GoDaddy, AWS Route 53, Microsoft Azure DNS, Namecheap, Gandi, IONOS, Hostinger ainsi que cPanel et les bureaux d’enregistrement régionaux.',
        },
        {
          q: 'Faut-il installer un agent ou partager des mots de passe messagerie ?',
          a: 'Jamais. L’ensemble des contrôles repose exclusivement sur les enregistrements DNS publics et les certificats TLS exposés : aucun accès aux boîtes mail ni perturbation serveur.',
        },
      ],
    },
    legal: {
      privacyTitle: 'Politique de confidentialité',
      privacyUpdated: 'Entrée en vigueur : 2025 · Site institutionnel AstaSecure',
      privacySections: [
        {
          heading: '1. Minimisation des données',
          body: 'AstaSecure collecte uniquement les informations saisies volontairement dans le formulaire de contact (nom, e-mail professionnel, société et message). Aucune donnée n’est vendue ni cédée à des tiers commerciaux.',
        },
        {
          heading: '2. Finalité du traitement',
          body: 'Vos coordonnées servent exclusivement à traiter votre demande de contact, préparer une proposition de service ou planifier une présentation d’AstaSecure Monitor.',
        },
        {
          heading: '3. Contrôles passifs respectueux de la vie privée',
          body: 'Nos évaluations techniques s’appuient uniquement sur les enregistrements DNS publics et certificats TLS après autorisation vérifiable, sans jamais accéder aux contenus privés des e-mails.',
        },
        {
          heading: '4. Conservation & droits',
          body: 'Les messages sont conservés de manière sécurisée avec accès restreint au personnel habilité. Pour exercer vos droits d’accès ou de suppression, écrivez à contact@astasecure.com.',
        },
      ],
      termsTitle: 'Conditions générales',
      termsUpdated: 'Entrée en vigueur : 2025 · Site institutionnel AstaSecure',
      termsSections: [
        {
          heading: '1. Objet du site',
          body: 'Ce site présente les services de cybersécurité, l’activité de conseil, les offres tarifaires et le produit AstaSecure Monitor. Toute prestation commerciale fait l’objet d’un accord écrit spécifique.',
        },
        {
          heading: '2. Périmètre d’analyse autorisé',
          body: 'AstaSecure n’effectue aucune vérification technique sans autorisation préalable prouvée via enregistrement DNS TXT ou mandat écrit du titulaire légitime du domaine.',
        },
        {
          heading: '3. Distinction réglementaire',
          body: 'Les évaluations passives et conseils de préparation fournis par AstaSecure renforcent l’hygiène numérique mais ne constituent pas un audit légal au sens du Décret-loi n° 2023-17 réservé aux experts certifiés ANCS.',
        },
        {
          heading: '4. Propriété intellectuelle',
          body: 'La marque AstaSecure, ses logos officiels, contenus et modèles de rapports sont protégés et demeurent la propriété exclusive d’AstaSecure.',
        },
      ],
    },
    footer: {
      companyCol: 'Entreprise',
      offeringsCol: 'Services & Produit',
      legalCol: 'Support & Légal',
      languageLabel: 'Langue',
      copyright: 'AstaSecure. Tous droits réservés.',
      locationNote: 'Protéger les entreprises. Accélérer leur croissance.',
    },
  },
  ar: {
    brand: 'ASTASECURE',
    tagline: 'نحمي الشركات، ونُمكّن نموّها.',
    positioning: 'الأمن السيبراني الميسّر للمؤسسات الصغرى والمتوسطة',
    nav: {
      home: 'الرئيسية',
      services: 'خدماتنا',
      solutions: 'الحلول',
      monitor: 'Monitor',
      about: 'من نحن',
      pricing: 'الأسعار',
      whyUs: 'لماذا أستاسيكيور',
      faq: 'الأسئلة الشائعة',
      contact: 'اتصل بنا',
      privacy: 'سياسة الخصوصية',
      terms: 'الشروط والأحكام',
    },
    hero: {
      kicker: 'ASTASECURE · الأمن السيبراني للشركات',
      headline: 'احمِ نطاق شركتك وبريدك الإلكتروني وثقة عملائك الرقمية.',
      subheadline:
        'تقدّم AstaSecure تقييمات أمنية للنطاقات، وحماية البريد الإلكتروني المهني، ومراقبة DNS، والاستشارات السيبرانية، إلى جانب منتج AstaSecure Monitor لمساعدة المؤسسات الصغرى والمتوسطة على التصدي للانتحال والتصيّد بتكلفة معقولة.',
      ctaPrimary: 'تواصل معنا',
      ctaSecondary: 'تعرّف على AstaSecure Monitor',
    },
    home: {
      introLabel: 'من نحن',
      introTitle: 'جعل الحماية السيبرانية الاحترافية في متناول الشركات النامية.',
      introBody:
        'تواجه المؤسسات الصغرى والمتوسطة نفس مخاطر انتحال النطاقات واختراق البريد الإلكتروني وأخطاء DNS التي تتعرّض لها الشركات الكبرى، بينما تبقى خدمات الأمن التقليدية باهظة التكلفة. تسدّ AstaSecure هذه الفجوة بخدمات عملية شفافة وإرشادات واضحة.',
      introPoint1: 'شروحات واضحة باللغات العربية والفرنسية والإنجليزية للإدارة وفرق التقنية.',
      introPoint2: 'منهجية سلبية وأخلاقية تبدأ دائماً بإثبات ملكية النطاق.',
      introPoint3: 'أسعار شفافة بالدينار التونسي ومعايير هندسية دولية.',
      introLink: 'اقرأ قصتنا ورؤيتنا',
      servicesLabel: 'خدماتنا',
      servicesTitle: 'خدمات أمنية مركّزة على البنية الرقمية الأساسية لشركتك.',
      servicesSub:
        'يركّز كل تدخّل على خفض المخاطر القابل للقياس عبر حماية النطاقات، وتوثيق البريد الإلكتروني، واستقرار DNS.',
      servicesAllLink: 'عرض جميع الخدمات',
      solutionsLabel: 'حلول الأمن السيبراني',
      solutionsTitle: 'حلول مصمّمة وفق طبيعة عمل المؤسسات والوكالات الرقمية.',
      solutionsSub:
        'سواء كنت تدير نطاقاً واحداً لشركتك أو تدير عشرات النطاقات لعملائك، توفّر حلولنا إطار حماية عملياً ومتكاملاً.',
      solutionsLink: 'استكشاف الحلول',
      monitorLabel: 'منتجنا الرائد',
      monitorTitle: 'AstaSecure Monitor: رؤية واضحة لجاهزية نطاقك وبريدك.',
      monitorSub:
        'يجمع منتج AstaSecure Monitor بين الفحص السلبي لإعدادات SPF وDKIM وDMARC وMX وNS وSOA وDNSSEC وCAA وTLS مع إرشادات إصلاح حسب مزوّد الاستضافة وتقارير PDF ثنائية اللغة.',
      monitorBullets: [
        'التحقّق المسبق من ملكية النطاق عبر سجل TXT في خادمي 1.1.1.1 و8.8.8.8.',
        'احتساب نتيجة من 100 مبنية على الأدلة الفعلية دون أخطاء DKIM وهمية.',
        'خطوات إصلاح جاهزة للنسخ لأكثر من 10 مزوّدي استضافة عالميين.',
      ],
      monitorLink: 'استعراض منتج AstaSecure Monitor',
      whyLabel: 'لماذا تختار AstaSecure',
      whyTitle: 'هندسة أمنية صادقة بعيداً عن المبالغة.',
      whySub:
        'نوضح قواعد احتساب النتيجة بدقة، ونميّز بين العناصر غير المتحقّق منها والمشاكل المؤكّدة، ونخاطبك بلغة واضحة.',
      whyLink: 'اكتشف مزايانا',
      pricingLabel: 'خطط واضحة',
      pricingTitle: 'حماية متوقّعة التكلفة ابتداءً من 49 ديناراً شهرياً.',
      pricingSub:
        'باقات واضحة بدون رسوم خفية. تواصل مع فريقنا لتحديد نطاق الخدمة أو الخطة المناسبة لمؤسستك.',
      pricingLink: 'مقارنة الأسعار كاملة',
      ctaTitle: 'هل أنت مستعد لتعزيز حماية نطاقك وبريد شركتك؟',
      ctaBody:
        'شاركنا احتياجات مؤسستك وعدد نطاقاتك، وسيعود إليك فريقنا بسرعة بخطة واضحة.',
      ctaButton: 'طلب استشارة',
    },
    servicesList: [
      {
        number: '01. تقييم أمان النطاقات',
        title: 'مراجعة شاملة للواجهة الخارجية للنطاق',
        summary:
          'فحص سلبي متعمّق لبنية DNS العامة، وتوزيع خوادم الأسماء، ومعايير SOA، وقيود إصدار الشهادات CAA، وصلاحية شهادات HTTPS/TLS.',
        deliverables: [
          'تقييم جاهزية موثّق من 100 بالأدلة التقنية',
          'توصيات تأمين النطاق وخوادم الأسماء',
          'خارطة طريق واضحة حسب أولوية الخطورة',
        ],
      },
      {
        number: '02. أمان البريد الإلكتروني المهني',
        title: 'الحماية من انتحال النطاق والتصيّد الموجّه',
        summary:
          'مواءمة شاملة لإعدادات SPF وتواقيع DKIM وسياسات DMARC وتوجيه MX لمنع المهاجمين من إرسال رسائل احتيالية باسم شركتك.',
        deliverables: [
          'ضبط حد 10 استعلامات SPF وإزالة ثغرة +all',
          'خطة تدرّج آمنة من المراقبة p=none إلى الحظر p=reject',
          'التحقّق الدقيق من محدّدات DKIM دون اتهامات خاطئة',
        ],
      },
      {
        number: '03. مراقبة أمان DNS',
        title: 'رصد مستمر للتغييرات والأعطال المحتملة',
        summary:
          'متابعة دورية لخوادم DNS المعتمدة وتواقيع DNSSEC ومواعيد انتهاء شهادات TLS لاكتشاف الأخطاء العرضية قبل أن تؤثّر على أعمالك.',
        deliverables: [
          'اختبارات تطابق عبر خوادم DNS عامة مستقلة',
          'متابعة سجلات DS وDNSKEY',
          'تقارير تنفيذية PDF بالإنجليزية والفرنسية مع بصمة SHA-256',
        ],
      },
      {
        number: '04. الاستشارات السيبرانية',
        title: 'مرافقة عملية للمؤسسات وفرق تقنية المعلومات',
        summary:
          'توجيه عملي لتطبيق التحسينات التقنية، ورفع جاهزية المؤسسة قبل التدقيق الرسمي (بما يتماشى مع متطلبات المرسوم عدد 17 لسنة 2023 والوكالة الوطنية للسلامة السيبرانية ANCS).',
        deliverables: [
          'إرشادات تنفيذية مخصّصة لمزوّد الاستضافة الفعلي',
          'تقييم جاهزية مسبق قبل التدقيق القانوني',
          'حوكمة موحّدة لعدة نطاقات وشركات تابعة',
        ],
      },
    ],
    solutionsList: [
      {
        title: 'حماية المؤسسات الصغرى والمتوسطة',
        audience: 'الشركات النامية · 1 إلى 3 نطاقات',
        description:
          'تحمي سمعة الشركة وفواتيرها ومراسلات الإدارة من محاولات الانتحال وتوقف وصول البريد الإلكتروني.',
        outcomes: [
          'منع استغلال اسم نطاقك في إرسال فواتير مزوّرة',
          'تفادي وصول رسائل شركتك إلى البريد المزعج بسبب أخطاء SPF',
          'خطوات تنفيذية واضحة يفهمها أي مسؤول تقني',
        ],
      },
      {
        title: 'التجارة الإلكترونية والمنصات المالية',
        audience: 'المتاجر الإلكترونية وشركات التكنولوجيا المالية',
        description:
          'تعزّز موثوقية البريد الآلي وتضبط جهات إصدار الشهادات عبر CAA وتؤمّن سلامة DNSSEC.',
        outcomes: [
          'تقييد الجهات المسموح لها بإصدار شهادات TLS لنطاقك',
          'متابعة مواعيد تجديد الشهادات لتفادي انقطاع الموقع',
          'ملخصات جاهزة للمشاركة مع الشركاء وشركات التأمين',
        ],
      },
      {
        title: 'حوكمة الوكالات والشركات القابضة',
        audience: 'الوكالات الرقمية ومقدّمو الخدمات المدارة',
        description:
          'معايير موحّدة لمراقبة حتى 25 نطاقاً وأكثر ضمن إطار واضح وتقارير احترافية قابلة للتسليم.',
        outcomes: [
          'منهجية تقييم موحّدة لجميع نطاقات العملاء',
          'أدلة إصلاح مخصّصة لـ Cloudflare وOVHcloud وGoDaddy وAWS وغيرها',
          'تقارير PDF ثنائية اللغة جاهزة للاجتماعات الدورية',
        ],
      },
      {
        title: 'دعم الجاهزية قبل التدقيق التنظيمي',
        audience: 'المؤسسات المستعدة للتدقيق السيبراني',
        description:
          'معالجة الفجوات الظاهرة في DNS والبريد وتجميع الأدلة التقنية قبل حلول موعد التدقيق المعتمد.',
        outcomes: [
          'إغلاق الثغرات المكشوفة قبل حضور المدقق الرسمي',
          'حفظ سجل زمني للتحسينات المنفّذة',
          'وضوح تام بأن الفحص السلبي يكمّل ولا يعوّض المدقق المرخّص من ANCS',
        ],
      },
    ],
    whyPoints: [
      {
        title: 'أخلاقيات إثبات الملكية أولاً',
        description:
          'لا يتم أي فحص تقني إلا بعد التحقّق المزدوج من ملكية النطاق عبر خادمي DNS مستقلّين (1.1.1.1 و8.8.8.8).',
      },
      {
        title: 'دون إنذارات كاذبة أو تهويل',
        description:
          'عند غياب محدّد DKIM أو حدوث تعذّر مؤقت في الاتصال، نعرض الحالة بصدق كـ«غير متحقق منه» أو «خطأ تقني» دون خصم نقاط.',
      },
      {
        title: 'أدلة تنفيذ حسب مزوّدك الفعلي',
        description:
          'بدلاً من الاكتفاء بشروحات عامة، نوفّر خطوات دقيقة متوافقة مع لوحة تحكّم مزوّد DNS الخاص بك.',
      },
      {
        title: 'أسعار مناسبة بالدينار التونسي',
        description:
          'صُمّمت باقاتنا لتجاوز عوائق التكلفة والعملة الأجنبية التي تجعل المؤسسات عرضة للمخاطر.',
      },
      {
        title: 'وضوح باللغات العربية والفرنسية والإنجليزية',
        description:
          'تسهّل على الإدارة والفرق التقنية والمستشارين العمل وفق لغة واحدة مفهومة للجميع.',
      },
      {
        title: 'تقارير موثّقة ببصمة SHA-256',
        description:
          'كل نتيجة مرتبطة بسجل DNS الفعلي ويمكن تصديرها في تقارير PDF معتمدة.',
      },
    ],
    about: {
      kicker: 'عن أستاسيكيور',
      title: 'نحمي الشركات، ونُمكّن نموّها.',
      lead:
        'AstaSecure شركة أمن سيبراني ذات طموح دولي متخصّصة في تمكين المؤسسات الصغرى والمتوسطة والوكالات من حماية أصولها الرقمية.',
      missionTitle: 'رسالتنا',
      missionBody:
        'تعتمد الشركات اليوم على النطاق والبريد الإلكتروني في كل معاملاتها، ومع ذلك تبقى إعدادات DNS الأساسية مهملة بسبب التعقيد والتكلفة. تعمل AstaSecure على تحويل المخاطر التقنية غير المرئية إلى خطوات عملية واضحة.',
      visionTitle: 'رؤيتنا المستقبلية',
      visionBody:
        'تنطلق AstaSecure لخدمة السوق التونسية والأسواق الدولية عبر الجمع بين الخبرة الاستشارية والبرمجيات الدفاعية الدقيقة، لتثبت أن الحماية الموثوقة حق متاح لكل شركة نامية.',
      principlesTitle: 'مبادئ العمل لدينا',
      principles: [
        {
          title: 'الدليل التقني قبل الافتراض',
          body: 'كل توصية مبنية على سجلات حقيقية قابلة للتحقق ومعايير تقييم ثابتة.',
        },
        {
          title: 'فحص سلبي ومصرّح به دائماً',
          body: 'نكتفي بفحص الواجهة العامة لنطاقاتك الموثّقة دون المساس بالأنظمة الداخلية.',
        },
        {
          title: 'بساطة تخدم صناع القرار',
          body: 'دقة تقنية عالية مع عرض واضح يمكن للإدارة وفرق التقنية تنفيذه فوراً.',
        },
      ],
    },
    monitorPage: {
      kicker: 'تقديم المنتج · ASTASECURE MONITOR',
      title: 'AstaSecure Monitor: وضوح كامل لأمان نطاقك وبريدك.',
      lead:
        'أحد المنتجات الأمنية الرئيسية لشركة AstaSecure، يحوّل فحوصات DNS والبريد المعقّدة إلى مؤشر موثّق من 100 وأدلة إصلاح جاهزة وتقارير تنفيذية.',
      ctaButton: 'اطلب عرضاً تعريفياً للمنتج',
      architectureTitle: 'تسعة فحوصات تقنية أساسية',
      architectureSub:
        'ثمانية معايير أساسية لـ DNS وتوثيق البريد إضافة إلى مراقبة شهادات HTTPS/TLS.',
      checks: [
        { code: 'DMARC', name: 'سياسة منع الانتحال', desc: 'فحص وسوم p= وsp= وpct= وتقارير rua= في سجل _dmarc.' },
        { code: 'SPF', name: 'المرسلون المصرّح لهم', desc: 'التدقيق في صيغة v=spf1 وتفادي +all وحساب سقف 10 استعلامات DNS.' },
        { code: 'DKIM', name: 'التوقيع التشفيري للبريد', desc: 'فحص المحدّدات المعروفة والمخصّصة بدقة دون تسجيل أخطاء كاذبة.' },
        { code: 'MX', name: 'توجيه البريد الوارد', desc: 'التحقق من أولويات MX وحلّ عناوين A/AAAA والتوافق مع SPF.' },
        { code: 'NS', name: 'تكرار خوادم الأسماء', desc: 'فحص موثوقية خوادم DNS المعتمدة وتحديد مزوّد الاستضافة.' },
        { code: 'SOA', name: 'صحة منطقة DNS', desc: 'تدقيق الخادم الأساسي وبريد المسؤول والأرقام التسلسلية.' },
        { code: 'DNSSEC', name: 'سلامة التوقيع التشفيري', desc: 'التحقّق من سجلات DS وDNSKEY وعلامة Authenticated Data.' },
        { code: 'CAA', name: 'قيود إصدار الشهادات', desc: 'مراجعة الجهات المصرّح لها بإصدار شهادات TLS لنطاقك.' },
        { code: 'TLS', name: 'صلاحية شهادات HTTPS', desc: 'مراقبة سلسلة الشهادة والتنبيه قبل انتهاء الصلاحية.' },
      ],
      workflowTitle: 'آلية عمل AstaSecure Monitor',
      workflowSteps: [
        {
          step: '01',
          title: 'التحقّق من صيغة النطاق',
          desc: 'رفض عناوين IP والنطاقات الداخلية قبل إنشاء رمز ملكية TXT صالح لـ 7 أيام.',
        },
        {
          step: '02',
          title: 'إثبات الملكية عبر خادمين',
          desc: 'تأكيد وجود سجل astasecure-verify عبر خادمي 1.1.1.1 و8.8.8.8 المستقلّين.',
        },
        {
          step: '03',
          title: 'تقييم الخادم الموثّق',
          desc: 'تنفيذ كافة الفحوصات على الخادم وحساب نتيجة من 100 مرفقة بالسجلات الخام.',
        },
        {
          step: '04',
          title: 'الإصلاح والتقارير',
          desc: 'تطبيق الإرشادات حسب مزوّدك وتصدير تقارير PDF بالفرنسية أو الإنجليزية مع SHA-256.',
        },
      ],
      scoringTitle: 'منهجية الخصم الشفافة',
      scoringSub:
        'يبدأ كل نطاق موثّق برصيد 100/100 وتُخصم النقاط فقط عند تأكّد وجود خلل تقني.',
      scoringTiers: [
        { label: 'خلل حرج', points: '-25 نقطة', desc: 'وجود ثغرة +all في SPF أو انعدام الحماية على نطاق بريد نشط.' },
        { label: 'خطورة مرتفعة', points: '-15 نقطة', desc: 'غياب سجل SPF أو عدم تفعيل DNSSEC أو خلل جوهري في MX.' },
        { label: 'خطورة متوسطة', points: '-8 نقاط', desc: 'غياب سجل CAA أو بقاء DMARC في وضع المراقبة فقط p=none.' },
        { label: 'تحسينات طفيفة', points: '-3 نقاط', desc: 'توصيات إضافية لتحسين المعايير الثانوية.' },
      ],
    },
    pricingPage: {
      kicker: 'الأسعار والباقات',
      title: 'خطط أمن سيبراني واضحة بالدينار التونسي.',
      lead:
        'ابدأ بتقييم أولي موثّق أو زوّد مؤسستك أو وكالتك بمراقبة مستمرة وتقارير PDF تنفيذية.',
      perMonth: '/ شهرياً',
      freeLabel: 'مجاني',
      domainsUnit: 'نطاقات موثّقة',
      domainSingular: 'نطاق موثّق',
      dailyScansLabel: 'الحصة اليومية',
      scheduleLabel: 'الوتيرة',
      pdfIncluded: 'تقارير PDF تنفيذية بالفرنسية والإنجليزية',
      pdfExcluded: 'ملخص عرض فقط',
      selectPlanCta: 'الاستفسار عن الباقة',
      note: 'تخضع كافة الباقات لإثبات ملكية النطاق المسبق. تخضع مهام الاستشارة المخصّصة لعرض سعر مستقل.',
    },
    contactPage: {
      kicker: 'اتصل بـ ASTASECURE',
      title: 'تحدّث مع فريق الأمن السيبراني لدينا.',
      lead:
        'سواء كنت ترغب في تقييم نطاق شركتك، أو تأمين البريد المهني، أو استشارة تقنية، أو عرض تعريفي لـ AstaSecure Monitor، أرسل لنا رسالتك.',
      nameLabel: 'الاسم الكامل',
      namePlaceholder: 'أميرة بن سالم',
      emailLabel: 'البريد الإلكتروني المهني',
      emailPlaceholder: 'amira@company.tn',
      companyLabel: 'اسم الشركة / المؤسسة',
      companyPlaceholder: 'اسم المؤسسة',
      topicLabel: 'مجال الاستفسار',
      topics: [
        'تقييم أمان النطاق',
        'أمان البريد الإلكتروني المهني (SPF / DKIM / DMARC)',
        'مراقبة أمان DNS',
        'استشارات الأمن السيبراني',
        'استفسار حول منتج AstaSecure Monitor',
      ],
      messageLabel: 'تفاصيل طلبك',
      messagePlaceholder: 'اذكر عدد النطاقات أو مزوّد البريد والاستضافة أو الجدول الزمني المطلوب...',
      submitBtn: 'إرسال الطلب',
      sendingBtn: 'جارٍ الإرسال...',
      successTitle: 'تم استلام طلبك بنجاح',
      successBody:
        'شكراً لتواصلك مع AstaSecure. تم تسجيل رسالتك وسيتواصل معك فريقنا عبر بريدك الإلكتروني المهني.',
      sendAnother: 'إرسال رسالة أخرى',
      errRequired: 'يرجى إدخال الاسم والبريد الإلكتروني الصالح ونص الرسالة.',
      errEmail: 'يرجى إدخال عنوان بريد إلكتروني صالح.',
      directTitle: 'نطاق الخدمة وسرعة الاستجابة',
      directEmail: 'contact@astasecure.com',
      directScope: 'المؤسسات الصغرى والمتوسطة والوكالات الرقمية (تونس والدولي)',
      directResponse: 'الرد خلال يوم عمل واحد.',
    },
    faqPage: {
      kicker: 'الأسئلة الشائعة',
      title: 'إجابات دقيقة حول خدماتنا ومنهجيتنا ومنتجنا.',
      lead:
        'أبرز الاستفسارات التي يطرحها مدراء الشركات وفرق تقنية المعلومات قبل البدء مع AstaSecure.',
      items: [
        {
          q: 'لماذا تشترط AstaSecure إثبات ملكية النطاق قبل أي فحص؟',
          a: 'فحص النطاقات دون إذن صريح يتعارض مع الحدود الأخلاقية والقانونية. نشر سجل TXT مؤقت يتم التحقق منه عبر 1.1.1.1 و8.8.8.8 يؤكد تحكّم مؤسستك الفعلي في النطاق.',
        },
        {
          q: 'كيف تُحسب النتيجة من 100؟',
          a: 'يبدأ كل نطاق موثّق بـ 100 نقطة، وتُخصم النقاط حصراً عند تأكّد الخلل: حرج (-25)، مرتفع (-15)، متوسط (-8)، منخفض (-3). لا تُخصم أي نقاط عند تعذّر التحقّق أو غياب المحدّد.',
        },
        {
          q: 'لماذا قد يظهر DKIM بحالة «غير متحقق منه» بدلاً من «مفقود»؟',
          a: 'يعتمد DKIM على محدّد خاص بمزوّد البريد. إذا لم يتم تزويدنا بالمحدّد ولم يتطابق مع المحدّدات الشائعة، نعرضه بأمانة كـ«غير متحقق منه» دون اختلاق خطأ غير موجود.',
        },
        {
          q: 'هل تغني خدمات AstaSecure عن التدقيق الإلزامي المعتمد من ANCS؟',
          a: 'لا. وفق المرسوم التونسي عدد 17 لسنة 2023، يقتصر التدقيق التنظيمي الإلزامي على الخبراء المرخّصين من الوكالة الوطنية للسلامة السيبرانية ANCS. توفّر AstaSecure فحوصات تقنية سلبية واستشارات لرفع الجاهزية قبل التدقيق الرسمي.',
        },
        {
          q: 'ما هي مزوّدات DNS المدعومة في أدلة المعالجة؟',
          a: 'تشمل الإرشادات Cloudflare وOVHcloud وGoDaddy وAWS Route 53 وMicrosoft Azure DNS وNamecheap وGandi وIONOS وHostinger ولوحات cPanel.',
        },
        {
          q: 'هل يتطلب الفحص تثبيت برامج أو مشاركة كلمات مرور البريد؟',
          a: 'إطلاقاً. تعتمد جميع الفحوصات حصراً على السجلات العامة لـ DNS وشهادات TLS دون أي وصول إلى محتوى الرسائل أو الخوادم الداخلية.',
        },
      ],
    },
    legal: {
      privacyTitle: 'سياسة الخصوصية',
      privacyUpdated: 'تاريخ السريان: 2025 · الموقع المؤسسي لشركة AstaSecure',
      privacySections: [
        {
          heading: '١. جمع البيانات بالحد الأدنى',
          body: 'تجمع AstaSecure فقط المعلومات التي تقدّمها طوعاً عبر نموذج الاتصال (الاسم، البريد المهني، اسم الشركة، ونص الرسالة)، ولا تبيع بيانات الزوار أو تشاركها لأغراض تسويقية خارجية.',
        },
        {
          heading: '٢. غرض المعالجة',
          body: 'تُستخدم البيانات حصراً للرد على استفساراتك وتقديم عروض الخدمات السيبرانية أو تنسيق عروض AstaSecure Monitor.',
        },
        {
          heading: '٣. مبادئ الفحص السلبي',
          body: 'تستند جميع الفحوصات التقنية إلى سجلات DNS وشهادات TLS المتاحة للعموم بعد تأكيد ملكية النطاق، دون الاطلاع على المراسلات الخاصة.',
        },
        {
          heading: '٤. التخزين والحقوق',
          body: 'تُحفظ طلبات التواصل بأمان مع تقييد الوصول للموظفين المخوّلين فقط، ويمكنك طلب تعديل بياناتك أو حذفها عبر contact@astasecure.com.',
        },
      ],
      termsTitle: 'الشروط والأحكام',
      termsUpdated: 'تاريخ السريان: 2025 · الموقع المؤسسي لشركة AstaSecure',
      termsSections: [
        {
          heading: '١. نطاق الموقع الإلكتروني',
          body: 'يعرض هذا الموقع خدمات شركة AstaSecure في الأمن السيبراني والاستشارات والأسعار ومعلومات منتج AstaSecure Monitor، وتخضع التعاقدات التجارية لاتفاقيات مكتوبة مستقلة.',
        },
        {
          heading: '٢. الفحص المصرّح به فقط',
          body: 'لا تجري AstaSecure أي فحص تقني إلا للنطاقات المملوكة للجهة الطالبة أو المصرح بها رسمياً عبر إثبات DNS TXT أو تفويض خطي.',
        },
        {
          heading: '٣. التوضيح القانوني للتدقيق',
          body: 'تدعم تقييمات AstaSecure الجاهزية السيبرانية المستمرة ولا تحل محل التدقيق القانوني الإلزامي المخصّص للمدققين المعتمدين من ANCS.',
        },
        {
          heading: '٤. الملكية الفكرية',
          body: 'تظل علامة AstaSecure والشعار الرسمي والمحتويات ونماذج التقارير ملكية فكرية حصرية لشركة AstaSecure.',
        },
      ],
    },
    footer: {
      companyCol: 'الشركة',
      offeringsCol: 'الخدمات والمنتج',
      legalCol: 'الدعم والقانونية',
      languageLabel: 'اللغة',
      copyright: 'AstaSecure. جميع الحقوق محفوظة.',
      locationNote: 'نحمي الشركات، ونُمكّن نموّها.',
    },
  },
};
