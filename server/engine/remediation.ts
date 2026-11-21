import type {
  AppLanguage,
  CheckId,
  DnsProviderId,
  RemediationGuidePayload,
} from '../../src/types/astasecure.ts';
import { PROVIDER_LABELS } from './scanner.ts';

interface CheckCopy {
  title: Record<AppLanguage, string>;
  problemSummary: Record<AppLanguage, string>;
  whyItMatters: Record<AppLanguage, string>;
  buildRecord: (domain: string) => { type: string; name: string; value: string; ttl: string };
}

const CHECK_GUIDES: Record<Exclude<CheckId, 'tls'>, CheckCopy> = {
  dmarc: {
    title: {
      en: 'Add or Enforce a DMARC Record',
      fr: 'Ajouter ou renforcer l\'enregistrement DMARC',
      ar: 'إضافة سجل DMARC أو تفعيله',
    },
    problemSummary: {
      en: 'Your domain lacks an enforced DMARC policy (_dmarc), allowing attackers to forge emails using your exact company address.',
      fr: 'Votre domaine ne dispose pas d\'une politique DMARC appliquée (_dmarc), permettant l\'usurpation de votre adresse exacte.',
      ar: 'نطاقك لا يملك سياسة DMARC مفعّلة (_dmarc)، مما يسمح للمهاجمين بتزوير رسائل بريد باسم شركتك.',
    },
    whyItMatters: {
      en: 'DMARC instructs Gmail, Microsoft 365, and Yahoo how to treat forged emails. Start safely in monitoring mode (p=none) so zero legitimate mail is blocked, review reports for 14 days, then advance to p=quarantine and p=reject.',
      fr: 'DMARC indique à Gmail, Microsoft 365 et Yahoo comment traiter les e-mails usurpés. Commencez sans risque en mode observation (p=none) pendant 14 jours, puis passez à p=quarantine et p=reject.',
      ar: 'توجّه سياسة DMARC مزودي البريد مثل Gmail وMicrosoft 365 حول كيفية التعامل مع الرسائل المزوّرة. ابدأ بأمان في وضع المراقبة (p=none) لمدة 14 يوماً ثم انتقل إلى p=quarantine وp=reject.',
    },
    buildRecord: (domain) => ({
      type: 'TXT',
      name: '_dmarc',
      value: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}; fo=1`,
      ttl: '3600',
    }),
  },
  spf: {
    title: {
      en: 'Publish or Tighten Your SPF Record',
      fr: 'Publier ou corriger votre enregistrement SPF',
      ar: 'نشر سجل SPF أو تصحيحه',
    },
    problemSummary: {
      en: 'Your SPF TXT record is missing, duplicated, uses +all, or exceeds the 10-DNS-lookup limit.',
      fr: 'Votre enregistrement TXT SPF est absent, dupliqué, utilise +all ou dépasse la limite de 10 requêtes DNS.',
      ar: 'سجل SPF مفقود أو مكرر أو يستخدم +all أو يتجاوز حد 10 استعلامات DNS.',
    },
    whyItMatters: {
      en: 'SPF declares the exact servers authorized to send email for your domain. Replacing +all with ~all or -all and keeping lookups <= 10 prevents unauthorized senders from passing validation.',
      fr: 'SPF déclare les serveurs autorisés à envoyer des e-mails pour votre domaine. Remplacer +all par ~all ou -all et limiter à 10 requêtes DNS empêche les envois non autorisés.',
      ar: 'يحدد سجل SPF الخوادم المخوّلة بإرسال البريد باسم نطاقك. استبدال +all بـ ~all أو -all والبقاء ضمن 10 استعلامات يمنع المرسلين غير المصرح لهم.',
    },
    buildRecord: () => ({
      type: 'TXT',
      name: '@',
      value: 'v=spf1 include:_spf.google.com ~all',
      ttl: '3600',
    }),
  },
  dkim: {
    title: {
      en: 'Configure & Verify DKIM Signing',
      fr: 'Configurer et vérifier la signature DKIM',
      ar: 'إعداد توقيع DKIM والتحقق منه',
    },
    problemSummary: {
      en: 'No known DKIM selector returned an active cryptographic public key for your domain.',
      fr: 'Aucun sélecteur DKIM connu n\'a renvoyé de clé publique active pour votre domaine.',
      ar: 'لم يتم العثور على مفتاح DKIM عام نشط للمحدّدات المعروفة لنطاقك.',
    },
    whyItMatters: {
      en: 'DKIM cryptographically signs outgoing messages so recipients verify emails were not altered in transit and genuinely came from your organization.',
      fr: 'DKIM signe cryptographiquement les e-mails sortants pour garantir qu\'ils n\'ont pas été modifiés et proviennent bien de votre organisation.',
      ar: 'يوقّع DKIM الرسائل الصادرة تشفيرياً لضمان عدم تعديلها وأنها صادرة فعلياً عن مؤسستك.',
    },
    buildRecord: (domain) => ({
      type: 'TXT',
      name: 'selector1._domainkey',
      value: `v=DKIM1; k=rsa; p=<PASTE_PUBLIC_KEY_FROM_EMAIL_PROVIDER_FOR_${domain.toUpperCase()}>`,
      ttl: '3600',
    }),
  },
  mx: {
    title: {
      en: 'Verify Incoming Mail Servers (MX)',
      fr: 'Vérifier les serveurs de réception (MX)',
      ar: 'التحقق من خوادم البريد الوارد (MX)',
    },
    problemSummary: {
      en: 'MX records are missing or point to hostnames without valid IP resolution.',
      fr: 'Les enregistrements MX sont absents ou pointent vers des hôtes sans résolution IP.',
      ar: 'سجلات MX مفقودة أو تشير إلى مضيفات لا تملك عنوان IP صالحاً.',
    },
    whyItMatters: {
      en: 'Valid MX records ensure clients, partners, and bounce/DMARC reports can reach your mail infrastructure reliably.',
      fr: 'Des enregistrements MX valides assurent la réception fiable des e-mails et des retours techniques.',
      ar: 'تضمن سجلات MX الصحيحة وصول البريد الوارد وتقارير الأمان إلى خوادمكم دون انقطاع.',
    },
    buildRecord: (domain) => ({
      type: 'MX',
      name: '@',
      value: `10 mail.${domain}`,
      ttl: '3600',
    }),
  },
  ns: {
    title: {
      en: 'Ensure Redundant Authoritative Nameservers (NS)',
      fr: 'Assurer la redondance des serveurs DNS (NS)',
      ar: 'ضمان تعدد خوادم الأسماء الموثوقة (NS)',
    },
    problemSummary: {
      en: 'Your domain has fewer than two distinct authoritative nameservers.',
      fr: 'Votre domaine dispose de moins de deux serveurs de noms faisant autorité distincts.',
      ar: 'نطاقك يعتمد على أقل من خادمي أسماء موثوقين مستقلين.',
    },
    whyItMatters: {
      en: 'Redundant NS servers protect your website and business email from total outage if one DNS node goes offline.',
      fr: 'Des serveurs NS redondants évitent une interruption totale de votre site et de vos e-mails en cas de panne.',
      ar: 'يحمي تعدد خوادم NS موقعك وبريدك الإلكتروني من التوقف الكامل عند تعطل أحد الخوادم.',
    },
    buildRecord: () => ({
      type: 'NS',
      name: '@',
      value: 'ns1.your-dns-provider.net / ns2.your-dns-provider.net',
      ttl: '86400',
    }),
  },
  soa: {
    title: {
      en: 'Validate DNS Zone Authority (SOA)',
      fr: 'Valider l\'enregistrement d\'autorité de zone (SOA)',
      ar: 'التحقق من سجل سلطة النطاق (SOA)',
    },
    problemSummary: {
      en: 'The zone Start of Authority (SOA) record could not be retrieved cleanly.',
      fr: 'L\'enregistrement Start of Authority (SOA) de la zone n\'a pas pu être récupéré.',
      ar: 'تعذر استرجاع سجل سلطة البداية (SOA) لمنطقة DNS.',
    },
    whyItMatters: {
      en: 'SOA governs primary zone authority, serial numbers, and negative caching TTL across global resolvers.',
      fr: 'Le SOA définit l\'autorité principale de la zone, le numéro de série et les délais de mise en cache.',
      ar: 'ينظم سجل SOA السلطة الأساسية للنطاق وأوقات التحديث والتخزين المؤقت.',
    },
    buildRecord: (domain) => ({
      type: 'SOA',
      name: '@',
      value: `ns1.provider.net hostmaster.${domain} 2026112001 7200 900 1209600 300`,
      ttl: '3600',
    }),
  },
  dnssec: {
    title: {
      en: 'Enable DNSSEC Signing',
      fr: 'Activer la signature DNSSEC',
      ar: 'تفعيل توقيع DNSSEC',
    },
    problemSummary: {
      en: 'DNSSEC DS/DNSKEY cryptographic signatures are not published on your domain.',
      fr: 'Les signatures cryptographiques DNSSEC (DS/DNSKEY) ne sont pas activées sur votre domaine.',
      ar: 'التوقيع التشفيري DNSSEC غير مفعّل على نطاقك.',
    },
    whyItMatters: {
      en: 'DNSSEC prevents attackers from forging DNS answers or redirecting your visitors and mail servers via cache poisoning.',
      fr: 'DNSSEC empêche la falsification des réponses DNS et l\'empoisonnement de cache vers de faux serveurs.',
      ar: 'يمنع DNSSEC تزوير استجابات DNS وتسميم الذاكرة المؤقتة لإعادة توجيه الزوار أو البريد.',
    },
    buildRecord: () => ({
      type: 'DS',
      name: '@ (at Registrar)',
      value: 'Enable DNSSEC in your DNS host panel and copy the generated DS record to your registrar.',
      ttl: '3600',
    }),
  },
  caa: {
    title: {
      en: 'Restrict Certificate Issuance with CAA',
      fr: 'Restreindre l\'émission de certificats avec CAA',
      ar: 'تقييد إصدار الشهادات عبر سجل CAA',
    },
    problemSummary: {
      en: 'No CAA record restricts which Certificate Authorities may issue SSL/TLS certificates for your domain.',
      fr: 'Aucun enregistrement CAA ne restreint les autorités autorisées à émettre des certificats TLS pour votre domaine.',
      ar: 'لا يوجد سجل CAA يحدد الجهات المخوّلة بإصدار شهادات SSL/TLS لنطاقك.',
    },
    whyItMatters: {
      en: 'CAA prevents unauthorized Certificate Authorities from issuing valid HTTPS certificates in your company name.',
      fr: 'CAA empêche toute autorité de certification non autorisée d\'émettre un certificat HTTPS pour votre domaine.',
      ar: 'يمنع سجل CAA أي جهة تصديق غير مخوّلة من إصدار شهادات HTTPS باسم نطاقك.',
    },
    buildRecord: () => ({
      type: 'CAA',
      name: '@',
      value: '0 issue "letsencrypt.org"',
      ttl: '3600',
    }),
  },
};

function getProviderSteps(
  provider: DnsProviderId,
  checkId: Exclude<CheckId, 'tls'>,
  lang: AppLanguage,
  record: { type: string; name: string; value: string; ttl: string }
): string[] {
  const recDesc = `${record.type} · ${record.name} · ${record.value}`;

  if (checkId === 'dnssec') {
    const dnssecByProvider: Record<DnsProviderId, Record<AppLanguage, string[]>> = {
      cloudflare: {
        en: ['Sign in to Cloudflare Dashboard and select your domain.', 'Open DNS -> Settings.', 'Click "Enable DNSSEC". If Cloudflare is also your registrar, DS propagation is automatic; otherwise copy the DS record to your domain registrar.'],
        fr: ['Connectez-vous à Cloudflare et sélectionnez votre domaine.', 'Ouvrez DNS -> Settings (Paramètres).', 'Cliquez sur « Enable DNSSEC ». Si votre domaine est enregistré ailleurs, copiez l\'enregistrement DS chez votre bureau d\'enregistrement.'],
        ar: ['سجّل الدخول إلى لوحة Cloudflare واختر نطاقك.', 'افتح DNS ثم Settings.', 'اضغط Enable DNSSEC، وانسخ سجل DS إلى مسجل النطاق إن كان خارجياً.'],
      },
      ovhcloud: {
        en: ['Log in to the OVHcloud Control Panel -> Web Cloud -> Domains.', 'Select your domain and open the "DNSSEC" tab.', 'Click "Enable DNSSEC" and wait 15–30 minutes for DS propagation.'],
        fr: ['Connectez-vous à l\'espace client OVHcloud -> Web Cloud -> Noms de domaine.', 'Sélectionnez votre domaine et ouvrez l\'onglet « DNSSEC ».', 'Cliquez sur « Activer DNSSEC » et attendez 15 à 30 minutes.'],
        ar: ['ادخل إلى لوحة OVHcloud ثم Web Cloud ثم Noms de domaine.', 'اختر النطاق وافتح تبويب DNSSEC.', 'اضغط Activer DNSSEC وانتظر من 15 إلى 30 دقيقة.'],
      },
      godaddy: {
        en: ['Open GoDaddy Domain Portfolio -> select domain -> DNS -> DNSSEC.', 'Click "Turn On DNSSEC" and save the DS record.'],
        fr: ['Ouvrez GoDaddy Domain Portfolio -> domaine -> DNS -> DNSSEC.', 'Activez DNSSEC et enregistrez l\'entrée DS.'],
        ar: ['افتح GoDaddy ثم اختر النطاق ثم DNS ثم DNSSEC وقم بتفعيله.'],
      },
      aws_route53: {
        en: ['Open AWS Route 53 -> Hosted Zones -> select domain.', 'Go to the DNSSEC signing tab, create a KSK using AWS KMS, and enable signing.', 'Copy the DS record to Route 53 Registered Domains or your external registrar.'],
        fr: ['Ouvrez AWS Route 53 -> Hosted Zones -> votre domaine.', 'Dans l\'onglet DNSSEC signing, créez une clé KSK puis activez la signature.', 'Ajoutez l\'enregistrement DS auprès de votre registrar.'],
        ar: ['افتح AWS Route 53 ثم Hosted Zones.', 'من تبويب DNSSEC signing أنشئ KSK وفعّل التوقيع ثم أضف سجل DS عند مسجل النطاق.'],
      },
      azure_dns: {
        en: ['Note: Standard Azure Public DNS zones require verifying current DNSSEC availability in your Azure region or delegating DNSSEC-capable NS.', 'Check DNS Zone -> DNSSEC blade in Azure Portal and publish the DS record at your registrar if enabled.'],
        fr: ['Vérifiez l\'onglet DNSSEC de votre zone DNS dans le portail Azure et publiez l\'enregistrement DS chez votre registrar si disponible.'],
        ar: ['تحقق من تبويب DNSSEC في Azure Portal وانشر سجل DS عند مسجل النطاق.'],
      },
      namecheap: {
        en: ['Log in to Namecheap -> Domain List -> Manage -> Advanced DNS.', 'Toggle the DNSSEC switch to ON. Namecheap automatically publishes the DS record when using BasicDNS.'],
        fr: ['Connectez-vous à Namecheap -> Domain List -> Manage -> Advanced DNS.', 'Activez l\'interrupteur DNSSEC (ON).'],
        ar: ['ادخل إلى Namecheap ثم Domain List -> Manage -> Advanced DNS وفعّل خيار DNSSEC.'],
      },
      gandi: {
        en: ['Open Gandi Admin -> Domains -> select domain -> DNSSEC.', 'Enable DNSSEC signing in one click (LiveDNS).'],
        fr: ['Ouvrez votre tableau de bord Gandi -> Domaines -> DNSSEC.', 'Activez la signature DNSSEC en un clic.'],
        ar: ['افتح لوحة Gandi واختر النطاق ثم DNSSEC وفعّل التوقيع.'],
      },
      ionos: {
        en: ['Log in to IONOS -> Domains & SSL -> select domain -> DNS -> DNSSEC.', 'Toggle DNSSEC enabled and save.'],
        fr: ['Connectez-vous à IONOS -> Domaines & SSL -> DNS -> DNSSEC.', 'Activez DNSSEC et enregistrez.'],
        ar: ['ادخل إلى IONOS ثم Domains & SSL -> DNS -> DNSSEC وفعّل الخدمة.'],
      },
      hostinger: {
        en: ['Log in to Hostinger hPanel -> Domains -> select domain -> DNS / Nameservers -> DNSSEC.', 'Click Enable DNSSEC or paste the DS record from your external DNS provider.'],
        fr: ['Connectez-vous à Hostinger hPanel -> Domaines -> DNS / Serveurs de noms -> DNSSEC.', 'Activez DNSSEC ou ajoutez l\'enregistrement DS.'],
        ar: ['ادخل إلى Hostinger hPanel ثم Domains -> DNSSEC وقم بالتفعيل.'],
      },
      generic: {
        en: ['Sign in to your DNS hosting provider and enable DNSSEC signing in DNS Zone settings.', 'Copy the generated DS record (Key Tag, Algorithm, Digest Type, Digest) into your domain registrar control panel.'],
        fr: ['Connectez-vous à votre hébergeur DNS et activez DNSSEC dans la zone DNS.', 'Copiez l\'enregistrement DS généré dans l\'interface de votre bureau d\'enregistrement.'],
        ar: ['ادخل إلى لوحة مزود DNS وفعّل DNSSEC ثم انسخ سجل DS إلى لوحة مسجل النطاق.'],
      },
    };
    return dnssecByProvider[provider][lang];
  }

  const map: Record<DnsProviderId, Record<AppLanguage, string[]>> = {
    cloudflare: {
      en: [
        'Log in to Cloudflare Dashboard and choose your domain.',
        'Open DNS -> Records in the left sidebar and click "Add record".',
        `Select Type "${record.type}", set Name to "${record.name}", paste Content "${record.value}", and set TTL to Auto or ${record.ttl}.`,
        'Click Save. Cloudflare propagates TXT/MX/CAA updates globally within seconds.',
      ],
      fr: [
        'Connectez-vous au tableau de bord Cloudflare et sélectionnez votre domaine.',
        'Ouvrez DNS -> Records (Enregistrements) et cliquez sur « Add record ».',
        `Choisissez le type « ${record.type} », Nom « ${record.name} », Valeur « ${record.value} », TTL Auto ou ${record.ttl}.`,
        'Cliquez sur Save. La propagation Cloudflare prend quelques secondes.',
      ],
      ar: [
        'سجّل الدخول إلى لوحة Cloudflare واختر نطاقك.',
        'افتح DNS ثم Records واضغط Add record.',
        `اختر النوع "${record.type}" والاسم "${record.name}" والقيمة "${record.value}" ثم احفظ.`,
        'تنتشر تحديثات Cloudflare عالمياً خلال ثوانٍ.',
      ],
    },
    ovhcloud: {
      en: [
        'Log in to your OVHcloud Control Panel and go to Web Cloud -> Domain names -> your domain.',
        'Open the "DNS Zone" tab and click "Add an entry".',
        `Choose "${record.type}", enter Sub-domain "${record.name === '@' ? '(leave blank)' : record.name}", paste Value "${record.value}", and confirm.`,
        'Wait 5 to 30 minutes for OVHcloud zone propagation.',
      ],
      fr: [
        'Connectez-vous à votre espace client OVHcloud -> Web Cloud -> Noms de domaine -> votre domaine.',
        'Ouvrez l\'onglet « Zone DNS » puis cliquez sur « Ajouter une entrée ».',
        `Sélectionnez « ${record.type} », Sous-domaine « ${record.name === '@' ? '(laisser vide)' : record.name} », Valeur « ${record.value} », puis validez.`,
        'Patientez 5 à 30 minutes pour la propagation DNS OVHcloud.',
      ],
      ar: [
        'سجّل الدخول إلى OVHcloud ثم Web Cloud -> Noms de domaine -> اختر نطاقك.',
        'افتح تبويب Zone DNS واضغط Ajouter une entrée.',
        `اختر "${record.type}" والنطاق الفرعي "${record.name === '@' ? '(اتركه فارغاً)' : record.name}" وألصق القيمة "${record.value}".`,
        'انتظر من 5 إلى 30 دقيقة حتى يكتمل الانتشار.',
      ],
    },
    godaddy: {
      en: [
        'Sign in to GoDaddy Domain Portfolio and select your domain.',
        'Click DNS -> DNS Records -> Add New Record.',
        `Set Type "${record.type}", Name "${record.name}", Value "${record.value}", TTL ${record.ttl} seconds, and click Save.`,
      ],
      fr: [
        'Connectez-vous à GoDaddy Domain Portfolio et sélectionnez votre domaine.',
        'Cliquez sur DNS -> Add New Record.',
        `Renseignez Type « ${record.type} », Nom « ${record.name} », Valeur « ${record.value} », TTL ${record.ttl}, puis enregistrez.`,
      ],
      ar: [
        'سجّل الدخول إلى GoDaddy واختر النطاق ثم DNS -> Add New Record.',
        `أدخل النوع "${record.type}" والاسم "${record.name}" والقيمة "${record.value}" واضغط Save.`,
      ],
    },
    aws_route53: {
      en: [
        'Open the AWS Route 53 Console -> Hosted zones -> select your domain.',
        'Click "Create record" (Simple routing).',
        `Set Record name "${record.name === '@' ? '(blank for apex)' : record.name}", Record type "${record.type}", Value "${record.value}" (keep quotes for TXT if needed), and click Create records.`,
      ],
      fr: [
        'Ouvrez la console AWS Route 53 -> Hosted zones -> votre domaine.',
        'Cliquez sur « Create record ».',
        `Définissez Record name « ${record.name === '@' ? '(vide pour la racine)' : record.name} », Type « ${record.type} », Valeur « ${record.value} » puis créez.`,
      ],
      ar: [
        'افتح وحدة تحكم AWS Route 53 ثم Hosted zones واختر النطاق.',
        `اضغط Create record وأدخل "${recDesc}" ثم احفظ.`,
      ],
    },
    azure_dns: {
      en: [
        'Open Azure Portal -> DNS zones -> select your domain zone.',
        'Click "+ Record set" at the top.',
        `Enter Name "${record.name}", Type "${record.type}", TTL ${record.ttl}, paste Value "${record.value}", and click OK.`,
      ],
      fr: [
        'Ouvrez le portail Azure -> Zones DNS -> votre domaine.',
        'Cliquez sur « + Jeu d\'enregistrements ».',
        `Saisissez Nom « ${record.name} », Type « ${record.type} », Valeur « ${record.value} », puis validez.`,
      ],
      ar: [
        'افتح Azure Portal ثم DNS zones واختر منطقة النطاق.',
        `اضغط + Record set وأدخل "${recDesc}" ثم اضغط OK.`,
      ],
    },
    namecheap: {
      en: [
        'Log in to Namecheap -> Domain List -> Manage -> Advanced DNS.',
        'Click "Add New Record" under Host Records.',
        `Select "${record.type} Record", Host "${record.name}", Value "${record.value}", TTL Automatic, and click the green checkmark.`,
      ],
      fr: [
        'Connectez-vous à Namecheap -> Domain List -> Manage -> Advanced DNS.',
        'Cliquez sur « Add New Record ».',
        `Choisissez « ${record.type} », Host « ${record.name} », Valeur « ${record.value} », puis validez.`,
      ],
      ar: [
        'سجّل الدخول إلى Namecheap ثم Manage -> Advanced DNS.',
        `اضغط Add New Record وأدخل "${recDesc}" واحفظ التغيير.`,
      ],
    },
    gandi: {
      en: [
        'Sign in to Gandi -> Domains -> select your domain -> DNS Records.',
        'Click "Add Record".',
        `Choose Type "${record.type}", Name "${record.name}", Value "${record.value}", TTL ${record.ttl}, and click Create.`,
      ],
      fr: [
        'Connectez-vous à Gandi -> Domaines -> Enregistrements DNS.',
        'Cliquez sur « Ajouter un enregistrement ».',
        `Type « ${record.type} », Nom « ${record.name} », Valeur « ${record.value} », puis créez.`,
      ],
      ar: [
        'سجّل الدخول إلى Gandi واختر النطاق ثم DNS Records.',
        `أضف السجل "${recDesc}" ثم احفظ.`,
      ],
    },
    ionos: {
      en: [
        'Log in to IONOS -> Domains & SSL -> click the gear icon -> DNS.',
        'Click "Add Record".',
        `Select "${record.type}", Host Name "${record.name}", Value "${record.value}", and click Save.`,
      ],
      fr: [
        'Connectez-vous à IONOS -> Domaines & SSL -> DNS -> Ajouter un enregistrement.',
        `Choisissez « ${record.type} », Nom d'hôte « ${record.name} », Valeur « ${record.value} », puis enregistrez.`,
      ],
      ar: [
        'سجّل الدخول إلى IONOS ثم Domains & SSL -> DNS -> Add Record.',
        `أدخل "${recDesc}" واضغط Save.`,
      ],
    },
    hostinger: {
      en: [
        'Open Hostinger hPanel -> Domains -> select your domain -> DNS / Nameservers.',
        'Scroll to Manage DNS records.',
        `Select Type "${record.type}", Name "${record.name}", TXT/Content "${record.value}", TTL ${record.ttl}, and click Add Record.`,
      ],
      fr: [
        'Ouvrez Hostinger hPanel -> Domaines -> DNS / Serveurs de noms.',
        'Dans Gérer les enregistrements DNS, choisissez le type « ' + record.type + ' ».',
        `Nom « ${record.name} », Contenu « ${record.value} », TTL ${record.ttl}, puis cliquez sur Ajouter.`,
      ],
      ar: [
        'افتح Hostinger hPanel ثم Domains -> DNS / Nameservers.',
        `أضف سجلاً جديداً بالبيانات "${recDesc}" واضغط Add Record.`,
      ],
    },
    generic: {
      en: [
        'Log in to your DNS provider or cPanel Zone Editor (e.g. local Tunisian registrar or hosting cPanel).',
        'Open DNS Zone Management -> Add Record.',
        `Create a ${record.type} record with Host/Name "${record.name}", Value "${record.value}", and TTL ${record.ttl}.`,
        'Save the zone and allow 5 to 60 minutes for public DNS propagation.',
      ],
      fr: [
        'Connectez-vous à votre hébergeur DNS ou éditeur de zone cPanel (registrar tunisien ou hébergeur).',
        'Ouvrez la gestion de zone DNS -> Ajouter un enregistrement.',
        `Ajoutez un enregistrement ${record.type} avec Nom « ${record.name} », Valeur « ${record.value} » et TTL ${record.ttl}.`,
        'Enregistrez et patientez 5 à 60 minutes pour la propagation.',
      ],
      ar: [
        'سجّل الدخول إلى لوحة مزود الاستضافة أو محرر منطقة DNS في cPanel.',
        'افتح إدارة سجلات DNS واختر إضافة سجل جديد.',
        `أضف سجل ${record.type} بالاسم "${record.name}" والقيمة "${record.value}" ومدة TTL ${record.ttl}.`,
        'احفظ التعديل وانتظر من 5 إلى 60 دقيقة حتى ينتشر التحديث.',
      ],
    },
  };

  return map[provider][lang];
}

export function buildRemediationGuide(params: {
  domain: string;
  checkId: CheckId;
  provider: DnsProviderId;
  lang: AppLanguage;
  customProposedRecord?: { type: string; name: string; value: string; ttl: string };
}): RemediationGuidePayload {
  const effectiveCheckId: Exclude<CheckId, 'tls'> = params.checkId === 'tls' ? 'caa' : params.checkId;
  const copy = CHECK_GUIDES[effectiveCheckId];
  const requiredRecord = params.customProposedRecord || copy.buildRecord(params.domain);
  const steps = getProviderSteps(params.provider, effectiveCheckId, params.lang, requiredRecord);

  const verificationStepsByLang: Record<AppLanguage, string[]> = {
    en: [
      'Wait 5–30 minutes after saving the DNS record at your provider.',
      'Click "Re-check now" below so AstaSecure Monitor queries public DNS resolvers directly.',
      'Confirm the check switches to Confirmed and your security score updates automatically.',
    ],
    fr: [
      'Patientez 5 à 30 minutes après l\'enregistrement dans votre zone DNS.',
      'Cliquez sur « Revérifier maintenant » ci-dessous pour interroger les résolveurs publics.',
      'Vérifiez que le statut passe à Confirmé et que votre score est recalculé.',
    ],
    ar: [
      'انتظر من 5 إلى 30 دقيقة بعد حفظ السجل لدى مزود النطاق.',
      'اضغط على "إعادة الفحص الآن" ليقوم AstaSecure Monitor بالتحقق من خوادم DNS العامة.',
      'تأكد من تحوّل الحالة إلى مؤكد وتحديث النتيجة تلقائياً.',
    ],
  };

  return {
    checkId: effectiveCheckId,
    provider: params.provider,
    providerLabel: PROVIDER_LABELS[params.provider],
    title: copy.title[params.lang],
    problemSummary: copy.problemSummary[params.lang],
    whyItMatters: copy.whyItMatters[params.lang],
    requiredRecord,
    steps,
    verificationSteps: verificationStepsByLang[params.lang],
  };
}
