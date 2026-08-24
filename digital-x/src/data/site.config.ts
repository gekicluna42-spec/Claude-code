/**
 * Canonical site URLs and CTA destinations for Digital X.
 *
 * Keep all homepage and button links on routes that are known to exist. Where
 * a dedicated detail page does not exist, link to the relevant homepage
 * section instead of sending visitors to a 404.
 */

/** Production host. */
export const ORIGIN = 'https://digital-x-marketing.com';

/** Verified live destinations. */
export const LIVE = {
  home: `${ORIGIN}/`,
  /** There is no standalone /projekti route; portfolio lives on the homepage. */
  projekti: `${ORIGIN}/#radovi`,
  blog: `${ORIGIN}/blog/`,
  shop: `${ORIGIN}/shop/`,
} as const;

/**
 * Real destinations for homepage CTAs. If a dedicated page is not available,
 * keep the visitor in the appropriate homepage flow.
 */
export const UNRESOLVED = {
  /** Free website audit. */
  auditPage: `${ORIGIN}/audit.html`,
  /** Smart Website Launch offer currently converts through the contact section. */
  offerPage: `${ORIGIN}/#kontakt`,
  /** Portfolio items currently live in the homepage portfolio section. */
  eynnaCaseStudy: `${ORIGIN}/#radovi`,
  eynnaApp: `${ORIGIN}/#radovi`,
  secondBrainOs: `${ORIGIN}/#radovi`,
  growthOs: `${ORIGIN}/#radovi`,
  /** Dedicated contact page is the safe booking/contact destination. */
  bookingUrl: `${ORIGIN}/kontakt.html`,
  privacyPolicy: `${ORIGIN}/privatnost.html`,
  termsOfService: `${ORIGIN}/uslovi.html`,
  /** Social URLs are omitted until verified. */
  instagram: '',
  facebook: '',
  linkedin: '',
} as const;

/**
 * Where the contact and audit forms POST. Any endpoint accepting a JSON body
 * works (Formspree, Netlify Forms, your own handler). Blank → both forms fall
 * back to a pre-filled e-mail and say so plainly rather than pretending to send.
 */
export const FORM_ENDPOINT = '';

/**
 * Google PageSpeed Insights API key. Blank → the audit collects the URL and
 * submits it as an enquiry. It never renders an invented score either way.
 */
export const PAGESPEED_API_KEY = '';

/** Smart Website Launch promotion switch. */
export const OFFER_ACTIVE = true;
