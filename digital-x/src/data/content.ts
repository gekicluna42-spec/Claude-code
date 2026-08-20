/**
 * Every word on this page.
 *
 * PROVENANCE RULE: nothing lands in this file that was not read off
 * digital-x-marketing.com. Each block carries the page it came from. There are
 * no testimonials, awards, certifications, client counts, team sizes, office
 * addresses, revenue figures or performance statistics anywhere in here,
 * because none of those could be verified — and a cinematic homepage is exactly
 * the place where an invented number would do the most damage.
 *
 * Captured 2026-08-20 from:
 *   /           the homepage
 *   /projekti   the work index
 *   /blog       the guide index
 *   /shop       the productised-services catalogue
 *   /robots.txt
 */

export interface Discipline {
  /** Roman numeral, as the live site numbers them. */
  numeral: string;
  /** Zero-padded index used by the System Explorer. */
  index: string;
  id: string;
  name: string;
  /** The homepage one-liner, verbatim. */
  tagline: string;
  /** The "Vizualni pregled" description, verbatim. */
  detail: string;
  /** Bullets drawn from the live pricing and shop entries for this discipline. */
  points: string[];
  /** Verified starting price for this discipline, or '' where the site quotes on request. */
  from: string;
  /**
   * Where the X is looking when this discipline is selected, as a position in
   * THE SYSTEM's orbit (0..1). The film orbits the structure once, so each
   * discipline gets its own face of it.
   */
  orbit: number;
}

/** Source: homepage "Šest disciplina. Jedan tim." + "Vizualni pregled" + /shop. */
export const DISCIPLINES: Discipline[] = [
  {
    numeral: 'I.',
    index: '01',
    id: 'web',
    name: 'Web & E-commerce',
    tagline: 'Stranice i trgovine koje se učitavaju ispod dvije sekunde — i prodaju.',
    detail: 'Stranice i trgovine s jasnim putem do upita ili kupovine.',
    points: [
      'Landing stranica — copy, dizajn i forma, gotova za 3–5 dana',
      'Prezentacijska stranica do 5 stranica, osnovni SEO i Google Business',
      'E-commerce do 50 proizvoda, plaćanje i dostava, obuka i podrška',
    ],
    from: 'od 199 KM',
    orbit: 0.06,
  },
  {
    numeral: 'II.',
    index: '02',
    id: 'aplikacije',
    name: 'Aplikacije',
    tagline: 'Rješenja po mjeri vaših procesa. iOS, Android, web.',
    detail: 'Portali, booking, dashboardi i alati prilagođeni procesu.',
    points: [
      'Jedno mjesto za klijente, zadatke i dokumente',
      'Mobilni i desktop prikaz',
      'Faze razvoja prema prioritetu',
    ],
    from: 'Procjena po zahtjevu',
    orbit: 0.22,
  },
  {
    numeral: 'III.',
    index: '03',
    id: 'seo',
    name: 'SEO / GEO / AEO',
    tagline: 'Google. Mape. AI pretraživači. Prva AEO agencija u BiH.',
    detail: 'Google, mape i AI odgovori na jednoj tehničkoj osnovi.',
    points: [
      'Tehnički SEO i sadržaj',
      'Google Business i mape',
      'AEO standardno uključen — schema, llms.txt',
      'Izvještaj ljudskim jezikom',
    ],
    from: 'od 249 KM/mj',
    orbit: 0.38,
  },
  {
    numeral: 'IV.',
    index: '04',
    id: 'oglasavanje',
    name: 'Oglašavanje',
    tagline: 'Meta i Google kampanje mjerene jednim brojem: povratom.',
    detail: 'Kampanje povezane s landing stranicom i stvarnim ciljem.',
    points: [
      'Meta i Google kampanje',
      'Remarketing uključen',
      'Izvještaj uloženo → zarađeno',
    ],
    from: 'od 249 KM/mj + budžet',
    orbit: 0.54,
  },
  {
    numeral: 'V.',
    index: '05',
    id: 'sadrzaj',
    name: 'Sadržaj & Produkcija',
    tagline: 'Copy, mreže, foto i video koji zaustavljaju palac.',
    detail: 'Copy, fotografija, video i društveni sadržaj kao jedan brend.',
    points: [
      '12 objava i 4 Reels mjesečno',
      'Odgovaranje na poruke',
      'Mjesečna analiza',
    ],
    from: 'od 249 KM/mj',
    orbit: 0.7,
  },
  {
    numeral: 'VI.',
    index: '06',
    id: 'automatizacija',
    name: 'AI Automatizacija',
    tagline: 'Chatbot, podsjetnici, recenzije. Radnik koji ne spava.',
    detail: 'Upiti, CRM, termini, podsjetnici i izvještaji bez prepisivanja.',
    points: [
      'Web, Instagram, Facebook i WhatsApp',
      'Vaši podaci, vaš ton',
      'Besplatan demo prije kupovine',
    ],
    from: 'od 490 KM + 39 KM/mj',
    orbit: 0.86,
  },
];

/** Source: homepage hero. */
export const HERO = {
  eyebrow: 'Digitalna agencija · MMXXVI',
  /** The verified brand message. */
  title: ['Prisustvo', 'koje se pamti.'],
  lede: 'Web. Marketing. Inteligencija.',
  /**
   * Supporting positioning, assembled from the homepage's own two sentences:
   * the "Anatomija rasta" intro and the sequence of the six disciplines.
   */
  support:
    'Digital X povezuje web, aplikacije, vidljivost u pretrazi, oglašavanje, sadržaj i AI automatizaciju u jedan sistem rasta.',
  primaryCta: 'Besplatne konzultacije',
  secondaryCta: 'Analiza sajta',
  scrollHint: 'Skrolaj',
} as const;

/** Source: homepage, the section under the hero. */
export const POSITIONING = {
  kicker: 'Anatomija rasta',
  title: ['Ne pravimo web stranice.', 'Gradimo digitalna prisustva', 'koja prodaju.'],
  body:
    'Web iskustva, AI aplikacije, automatizacija i vidljivost — jedan povezani sistem koji pretvara pažnju u upite.',
} as const;

/** Source: homepage "Pretvorite pažnju u novi upit." Gated by OFFER_ACTIVE. */
export const OFFER = {
  kicker: 'Akcijska ponuda',
  name: 'Smart Website Launch',
  title: ['Pretvorite pažnju', 'u novi upit.'],
  body:
    'Akcijska ponuda za samo pet projekata. Ako vam je cinematic iznad pokazao kako vaš brend treba da se osjeća, Smart Website Launch je prvi korak: profesionalna web stranica do pet stranica i AI Lead Assistant uključen prva tri mjeseca.',
  priceWas: '995 KM',
  priceNow: '499 KM',
  saving: 'Ušteda 496 KM',
  includes: ['Web do 5 stranica', 'AI Lead Assistant · 3 mjeseca', 'Isporuka 7–14 radnih dana'],
  limit: 'Ponuda je ograničena na ukupno pet projekata.',
  cta: 'Pogledaj akcijsku ponudu',
} as const;

/**
 * Source: homepage "Digital X sistem" + "Besplatne konzultacije" + the
 * Aplikacije and SEO blocks. Nothing here is a step the site does not describe.
 */
export const PROCESS = {
  kicker: 'Digital X sistem',
  title: ['Vaš ulaz', 'u sistem.'],
  body:
    'Dijagnoza postojećeg stanja, jasan plan i izvedba — sve počinje jednim razgovorom, bez obaveze.',
  steps: [
    {
      index: '01',
      name: 'Razgovor',
      body: 'Kratak razgovor bez obaveze. Odgovor obično u roku od 24 sata.',
    },
    {
      index: '02',
      name: 'Dijagnoza',
      body: 'Dijagnoza postojećeg stanja — šta radi, šta ne radi i gdje se gubi upit.',
    },
    {
      index: '03',
      name: 'Plan i procjena',
      body: 'Predlažemo faze, funkcije i realnu cijenu. Konačna ponuda nakon razgovora, bez skrivenih stavki.',
    },
    {
      index: '04',
      name: 'Izvedba',
      body: 'Faze razvoja prema prioritetu, pa izvještaj ljudskim jezikom.',
    },
  ],
} as const;

/**
 * The GROWTH PATH. Five stages, each described only in the live site's own
 * words about that capability.
 */
export const GROWTH_PATH = {
  kicker: 'Growth path',
  title: ['Jedan signal.', 'Pet koraka.'],
  body: 'Pratite jedan upit kroz sistem — od trenutka kada vas neko traži do trenutka kada postane klijent.',
  stages: [
    {
      index: '01',
      name: 'Otkrivanje',
      en: 'Discovery',
      body: 'Google, mape i AI odgovori na jednoj tehničkoj osnovi.',
      discipline: 'seo',
    },
    {
      index: '02',
      name: 'Web',
      en: 'Website',
      body: 'Stranice i trgovine koje se učitavaju ispod dvije sekunde — i prodaju.',
      discipline: 'web',
    },
    {
      index: '03',
      name: 'Interakcija',
      en: 'Interaction',
      body: 'Asistent koji odgovara, kvalifikuje i prikuplja upite — na webu, Instagramu, Facebooku i WhatsAppu.',
      discipline: 'automatizacija',
    },
    {
      index: '04',
      name: 'Automatizacija',
      en: 'Automation',
      body: 'Upiti, CRM, termini, podsjetnici i izvještaji bez prepisivanja.',
      discipline: 'automatizacija',
    },
    {
      index: '05',
      name: 'Konverzija',
      en: 'Conversion',
      body: 'Kampanje povezane s landing stranicom i stvarnim ciljem.',
      discipline: 'oglasavanje',
    },
  ],
} as const;

/** Source: homepage "Automatizacije — Od upita do izvršenja, bez praznog hoda." */
export const AUTOMATION = {
  kicker: 'Automatizacije',
  title: ['Od upita do izvršenja,', 'bez praznog hoda.'],
  body:
    'Vizualni workflow povezuje forme, email, CRM, kalendar, dokumente i izvještaje. Svaki korak ima vlasnika, uslov i trag.',
  points: ['Leadovi i CRM unos', 'Termini, podsjetnici i recenzije', 'Dokumenti, obavijesti i izvještaji'],
  /** The chain the brief asks to show, named with the site's own vocabulary. */
  chain: [
    { name: 'Upit', body: 'Forma, poruka ili poziv stiže u jedan tok.' },
    { name: 'Kvalifikacija', body: 'Asistent odgovara, kvalifikuje i prikuplja podatke.' },
    { name: 'CRM', body: 'Lead se upisuje bez prepisivanja iz Excela.' },
    { name: 'Termin', body: 'Kalendar, potvrda i automatski podsjetnik.' },
    { name: 'Follow-up', body: 'Obavijesti, zahtjev za recenziju i izvještaj.' },
  ],
} as const;

/** Source: homepage "Aplikacije — Vaš proces kao jednostavan alat." */
export const APPS = {
  kicker: 'Aplikacije',
  title: ['Vaš proces', 'kao jednostavan alat.'],
  body:
    'Klijentski portali, booking sistemi, operativni dashboardi i interne aplikacije koje uklanjaju Excel prepisivanje i statusne sastanke.',
  points: ['Jedno mjesto za klijente, zadatke i dokumente', 'Mobilni i desktop prikaz', 'Faze razvoja prema prioritetu'],
} as const;

export interface PriceItem {
  name: string;
  note: string;
  price: string;
  cadence: string;
  points: string[];
  badge?: string;
}

/** Source: homepage "Cjenovnik — Javan. Pošten." Prices copied exactly. */
export const PRICING = {
  kicker: 'Cjenovnik',
  title: ['Javan.', 'Pošten.'],
  body: 'Cijene su „od" — konačna ponuda nakon razgovora, bez skrivenih stavki.',
  groups: [
    {
      name: 'Web',
      items: [
        {
          name: 'Landing stranica',
          note: 'Jedna stranica, jedan cilj. Spremna za oglase.',
          price: 'od 199 KM',
          cadence: 'jednokratno',
          points: ['Copy + dizajn + forma', 'Gotova za 3–5 dana', 'Spojena na vaš CRM/email'],
        },
        {
          name: 'Prezentacijska',
          note: 'Advokati, ordinacije, obrti, saloni.',
          price: 'od 449 KM',
          cadence: 'jednokratno',
          points: ['Do 5 stranica + forma', 'Osnovni SEO + Google Business', 'SSL · 30 dana podrške'],
        },
        {
          name: 'E-commerce',
          note: 'Trgovina spremna za prodaju.',
          price: 'od 2.490 KM',
          cadence: 'jednokratno',
          points: ['Do 50 proizvoda', 'Plaćanje + dostava', 'Obuka · 60 dana podrške'],
          badge: 'Najtraženije',
        },
        {
          name: 'E-commerce + SEO/AEO',
          note: 'Trgovina + 3 mjeseca optimizacije.',
          price: 'od 3.490 KM',
          cadence: 'jednokratno',
          points: ['Sve iz e-commerce paketa', 'SEO struktura + mape', 'AEO: schema, llms.txt'],
          badge: 'Ponuda',
        },
      ] as PriceItem[],
    },
    {
      name: 'Rast — mjesečno',
      items: [
        {
          name: 'SEO / GEO / AEO',
          note: '',
          price: 'od 249 KM',
          cadence: '/mj',
          points: ['Tehnički SEO + sadržaj', 'Google Business + mape', 'AEO standardno uključen', 'Izvještaj ljudskim jezikom'],
        },
        {
          name: 'Oglašavanje',
          note: '',
          price: 'od 249 KM',
          cadence: '/mj + budžet',
          points: ['Meta + Google kampanje', 'Remarketing uključen', 'Uloženo → zarađeno izvještaj'],
        },
        {
          name: 'Društvene mreže',
          note: '',
          price: 'od 249 KM',
          cadence: '/mj',
          points: ['12 objava + 4 Reels', 'Odgovaranje na poruke', 'Mjesečna analiza'],
        },
      ] as PriceItem[],
    },
    {
      name: 'Automatizacija & briga',
      items: [
        {
          name: 'AI chatbot 24/7',
          note: '',
          price: 'od 490 KM',
          cadence: '+ 39 KM/mj',
          points: ['Web + IG + FB + WhatsApp', 'Vaši podaci, vaš ton', 'Besplatan demo prije kupovine'],
        },
        {
          name: 'Speed optimizacija',
          note: '',
          price: 'od 99 KM',
          cadence: 'jednokratno',
          points: ['Google ocjena 90+ ili radimo dalje', 'Prije/poslije izvještaj'],
        },
        {
          name: 'Održavanje',
          note: '',
          price: 'od 29 KM',
          cadence: '/mj',
          points: ['Ažuriranja + dnevni backup', 'Monitoring + sitne izmjene'],
        },
        {
          name: 'Redizajn',
          note: '',
          price: 'od 349 KM',
          cadence: 'jednokratno',
          points: ['Moderan izgled, isti sadržaj', 'Brzina i SEO usput'],
        },
      ] as PriceItem[],
    },
  ],
  bundle: {
    badge: 'Bundle',
    name: 'Digitalni partner — sve u jednom',
    body: 'Web + SEO/GEO/AEO + mreže + oglasi + AI chatbot + održavanje. Jedan tim. Jedna faktura.',
    price: 'od 899 KM/mj',
    note: 'pojedinačno 1.500+ KM/mj · bez obaveze duže od 3 mjeseca',
    cta: 'Razgovor o bundle paketu',
  },
} as const;

export interface Project {
  kind: 'client' | 'product' | 'demo';
  /** The badge the live site puts on this item, verbatim. */
  label: string;
  name: string;
  meta: string;
  body: string;
  /** Detail lines shown on the panel. */
  points: string[];
  /** Chapter poster used as the panel's cinematic backdrop. */
  still: string;
}

/** Source: /projekti and the homepage "Radovi" section. */
export const PROJECTS: Project[] = [
  {
    kind: 'client',
    label: 'Završeni projekat',
    name: 'Eynna Hair — Dizajner perika',
    meta: 'Web aplikacija · E-commerce · AI vizualizacija',
    body:
      'Digital X je za Eynna Hair razvio interaktivni proces personalizacije perike koji složen izbor pretvara u jasan, vizuelan i mobilno prilagođen korisnički put.',
    points: ['Kvalitet', 'Dužina', 'Tekstura', 'Boja', 'Gustoća', 'Čipka', 'AI preview'],
    still: 'inside-close',
  },
  {
    kind: 'product',
    label: 'Digital X proizvod',
    name: 'GrowthOS',
    meta: 'Poslovni operativni sistem',
    body:
      'Prilagodljiv poslovni operativni sistem za prodaju, klijente, projekte, termine, sadržaj i izvještaje. Javni demo koristi izmišljene podatke.',
    points: ['Prodaja i klijenti', 'Projekti i termini', 'Sadržaj i izvještaji'],
    still: 'system-close',
  },
  {
    kind: 'product',
    label: 'Digital X proizvod',
    name: 'AI Second Brain OS',
    meta: 'Poslovna memorija · Co-Pilot',
    body:
      'Privatna poslovna memorija i Co-Pilot koji pronalazi kontekst, prikazuje izvore i izvršava samo odobrene komande.',
    points: ['Pronalazi kontekst', 'Prikazuje izvore', 'Izvršava samo odobrene komande'],
    still: 'reveal-close',
  },
];

/** Source: /projekti and the homepage. Labelled exactly as the live site labels them. */
export const DEMOS = [
  {
    label: 'Demo koncept',
    name: 'Advokatska kancelarija',
    body: 'Brzina 34 → 96. Autoritet umjesto sajta iz 2012.',
    detail: 'Koncept redizajna sa naglaskom na autoritet, brzinu i jasan put do upita.',
  },
  {
    label: 'Demo koncept',
    name: 'Stomatološka ordinacija',
    body: 'Online zakazivanje + automatski podsjetnici.',
    detail: 'Koncept online zakazivanja i automatskih podsjetnika.',
  },
  {
    label: 'Demo koncept',
    name: 'Web shop — moda',
    body: 'Struktura koja vodi do korpe, ne od nje.',
    detail: 'Koncept strukture koja vodi kupca do korpe.',
  },
] as const;

/** Source: homepage "Cinematic showcase — Brandovi koje gledate." */
export const SHOWCASE = {
  kicker: 'Cinematic showcase',
  title: ['Brandovi', 'koje gledate.'],
  body:
    'Demo koncepti premium web doživljaja po branšama — svaki sa vlastitom filmskom pričom.',
  items: [
    { name: 'Cinematic Watch', category: 'Luxury', body: 'Macro video, precision storytelling, premium UI za watch brendove.' },
    { name: 'Cinematic Penthouse', category: 'Real Estate', body: 'Virtual tours, panoramski snimci, premium storytelling za nekretnine.' },
    { name: 'Cinematic Clothes', category: 'Fashion', body: 'Runway-style video, product storytelling, elegantan e-commerce UI.' },
    { name: 'Cinematic Dentist', category: 'Healthcare', body: 'Before/after galerije, pacijent priče, trust-building dizajn za ordinacije.' },
    { name: 'Cinematic Deepsea', category: 'Ocean', body: '360° virtual dives, underwater storytelling, WebGL 3D doživljaj.' },
    { name: 'Digital X System', category: 'Agency', body: 'Film-quality web, SEO/GEO/AEO, AI automatizacija — jedan sistem.' },
  ],
} as const;

/** Source: homepage "Besplatno · 60 sekundi". */
export const AUDIT = {
  kicker: 'Besplatno · 60 sekundi',
  title: ['Koliko vrijedi', 'vaša trenutna stranica?'],
  body:
    'Brzina. SEO. I ono što niko drugi ne mjeri — vidljivost u AI pretraživačima. Stvarni Google podaci, bez uljepšavanja.',
  /** The three axes the live copy names. */
  axes: [
    { name: 'Brzina', body: 'Koliko dugo posjetilac čeka prije nego odustane.' },
    { name: 'SEO', body: 'Da li vas Google uopšte može pročitati i rangirati.' },
    { name: 'AEO', body: 'Da li vas ChatGPT, Gemini i Perplexity mogu preporučiti.' },
  ],
  cta: 'Zatraži analizu',
  placeholder: 'vasa-stranica.ba',
} as const;

/** Source: /blog. Titles, categories and reading times as published. */
export const GUIDES = {
  kicker: 'Vodiči',
  title: ['Naučite', 'prije nego platite.'],
  body:
    'Po jedan vodič za svaku uslugu — šta je, kako izgleda i šta donosi. Ako nakon čitanja sve uradite sami: odlično. Ako želite da mi to uradimo: tu smo.',
  featured: [
    { name: 'Koliko košta web stranica u BiH u 2026?', category: 'Web', read: '6 min', body: 'Realan vodič kroz cijene — i kako ne platiti dvaput.' },
    { name: 'Kako da vas ChatGPT preporuči', category: 'AEO', read: '6 min', body: 'Novo bojno polje vidljivosti.' },
    { name: 'AI chatbot za male biznise', category: 'AI', read: '5 min', body: 'Radnik koji ne spava — šta je i koliko košta.' },
    { name: 'Kako biti prvi na Google mapi', category: 'Lokalni SEO', read: '5 min', body: 'Top 3 na mapi dobijaju većinu poziva.' },
    { name: 'Zašto spor sajt tiho ubija prodaju', category: 'Performanse', read: '4 min', body: 'Svaki sekund čekanja košta do 20% posjetilaca.' },
    { name: 'Šta se sve može automatizovati', category: 'Automatizacija', read: '5 min', body: 'Šest automatizacija koje se najbrže isplate.' },
  ],
  total: 15,
} as const;

/** Source: /shop. */
export const SHOP = {
  kicker: 'Digital X Shop',
  title: ['Usluge kao jasni', 'digitalni proizvodi.'],
  body:
    'Odaberite web, AI, automatizaciju, rast ili sadržaj kao jasan digitalni proizvod. Za složenije zahtjeve tražite procjenu po mjeri.',
  items: [
    { name: 'Premium web prisustvo', category: 'Web & E-commerce', price: 'od 449 KM' },
    { name: 'E-commerce Launch', category: 'Web & E-commerce', price: 'od 2.490 KM' },
    { name: 'Aplikacija po mjeri', category: 'Web & E-commerce', price: 'Procjena po zahtjevu' },
    { name: 'AI Second Brain OS', category: 'AI sistemi', price: 'Procjena po zahtjevu' },
    { name: 'AI prodajni asistent', category: 'AI sistemi', price: 'od 490 KM' },
    { name: 'Automation Starter', category: 'Automatizacija', price: 'od 349 KM' },
    { name: 'Sistem recenzija', category: 'Automatizacija', price: 'od 199 KM' },
    { name: 'SEO · GEO · AEO', category: 'Vidljivost & rast', price: 'od 249 KM/mj' },
    { name: 'Kampanje za rast', category: 'Vidljivost & rast', price: 'od 249 KM/mj' },
    { name: 'Speed optimizacija', category: 'Vidljivost & rast', price: 'od 99 KM' },
    { name: 'Sistem sadržaja', category: 'Sadržaj & brend', price: 'od 249 KM' },
    { name: 'Digitalni partner', category: 'Sadržaj & brend', price: 'od 899 KM' },
  ],
} as const;

/** Source: homepage "Vaš zahtjev" form. */
export const BRIEF_NEEDS = [
  'Web / e-commerce',
  'Aplikacija',
  'SEO / GEO / AEO',
  'Oglašavanje i sadržaj',
  'Automatizacija',
  'AI Second Brain OS',
  'Kombinacija po mjeri',
  'Dogovor i procjena',
] as const;

/** Source: homepage "Besplatne konzultacije" + the urgent-contact line. */
export const CONTACT = {
  kicker: 'Besplatne konzultacije',
  title: ['Recite nam cilj.', 'Dobijete plan i procjenu.'],
  body:
    'Kratak razgovor bez obaveze — predlažemo faze, funkcije i realnu cijenu. Odgovor obično u roku od 24 sata.',
  cta: 'Zatražite besplatne konzultacije',
  urgent: 'Hitno?',
  email: 'digital.x.agency.ba@gmail.com',
  phoneLabel: '+387 64 438 3566',
  phoneHref: '+387644383566',
  whatsappLabel: 'WhatsApp',
  reply: 'odgovor u roku 24h',
  briefTitle: ['Ne uklapate se', 'u gotov paket?'],
  briefBody:
    'Recite nam šta želite postići i koje usluge su vam potrebne. Zajedno definišemo obim, faze, način saradnje i realnu procjenu cijene.',
} as const;

/** Source: the live <title> and the site's own naming. */
export const META = {
  brand: 'Digital X',
  siteName: 'Digital X Sarajevo',
  title: 'Digital X Sarajevo | Web stranice, SEO i AI automatizacija',
  description:
    'Digital X povezuje web, aplikacije, SEO/GEO/AEO, oglašavanje, sadržaj i AI automatizaciju u jedan sistem rasta. Prisustvo koje se pamti.',
  locale: 'bs_BA',
  lang: 'bs',
} as const;
