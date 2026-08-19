/**
 * DIP STUDIO — single source of truth for business facts.
 *
 * RULE: every value here must be verifiable from dipstudio.ba or supplied by
 * DIP Studio directly. Empty string = not yet verified. Sections and links
 * bound to an empty value do not render — nothing is ever invented.
 *
 * TODO(DIP Studio): fill the fields marked TODO below.
 */

export interface ContactChannels {
  /** TODO: e.g. "+387 6x xxx xxx" — leave empty until confirmed. */
  phone: string;
  /** TODO: public inquiry e-mail. */
  email: string;
  /** TODO: Instagram handle without the "@". */
  instagramHandle: string;
  /** TODO: Facebook page URL. */
  facebookUrl: string;
  /** TODO: TikTok profile URL. */
  tiktokUrl: string;
  /** TODO: street address, if DIP Studio publishes one. */
  streetAddress: string;
}

export interface SiteConfig {
  name: string;
  legalName: string;
  tagline: string;
  city: string;
  country: string;
  countryCode: string;
  foundedYear: number;
  locale: string;
  canonicalOrigin: string;
  contact: ContactChannels;
  /**
   * TODO: POST endpoint for the booking/inquiry form (Formspree, Netlify
   * Forms, own backend...). While empty the form falls back to opening a
   * pre-filled e-mail, and tells the visitor that is what it is doing.
   */
  formEndpoint: string;
  /**
   * Real DIP Studio event photography. Empty until DIP Studio supplies it;
   * the gallery then labels its cinematic renders as renders instead.
   * Only fields that are actually known should be filled per entry.
   */
  realProjects: RealProject[];
  /** Real Instagram posts, once supplied. No follower or engagement counts. */
  instagramPosts: InstagramPost[];
}

export interface RealProject {
  image: string;
  alt: string;
  /** Optional — omit when unknown rather than guessing. */
  event?: string;
  location?: string;
  effects?: string[];
  videoUrl?: string;
}

export interface InstagramPost {
  image: string;
  alt: string;
  permalink: string;
}

export const site: SiteConfig = {
  name: 'DIP Studio',
  legalName: 'DIP Studio',
  tagline: 'Magija koja oživljava vaše trenutke',
  city: 'Sarajevo',
  country: 'Bosna i Hercegovina',
  countryCode: 'BA',
  foundedYear: 2022,
  locale: 'bs-BA',
  canonicalOrigin: 'https://www.dipstudio.ba',

  contact: {
    phone: '',
    email: '',
    instagramHandle: '',
    facebookUrl: '',
    tiktokUrl: '',
    streetAddress: '',
  },

  formEndpoint: '',
  realProjects: [],
  instagramPosts: [],
};

/** True when a contact channel has been verified and may be rendered. */
export const has = (value: string): boolean => value.trim().length > 0;

/** Verbatim "O nama" copy from dipstudio.ba. Do not paraphrase. */
export const aboutParagraphs: readonly string[] = [
  'DIP Studio nastao je u Sarajevu 2022. godine s ciljem da najvažnije životne trenutke pretvori u nezaboravno iskustvo. Specijalizovani smo za kreiranje jedinstvenih efekata i atrakcija za vjenčanja, svadbe, rođendane, korporativne događaje i sve vrste proslava.',
  'U našoj ponudi nalaze se hladne prskalice, niski dim za prvi ples, photobooth, 360 video booth, vatrometi u boji, balonske eksplozije i brojni drugi efekti koji svakom događaju daju poseban doživljaj.',
  'Kroz profesionalan pristup, pouzdanu uslugu i vrhunsku opremu, stvaramo atmosferu koja ostavlja snažan utisak na mladence, goste i organizatore događaja.',
  'Ako tražite provjerena rješenja za vjenčanje ili proslavu, DIP Studio je partner kojem možete vjerovati.',
];
