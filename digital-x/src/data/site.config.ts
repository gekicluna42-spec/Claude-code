/**
 * Everything about this site that could NOT be verified against the live
 * digital-x-marketing.com, plus the switches Digital X controls.
 *
 * The rule this file exists to enforce: an empty value is never rendered as a
 * broken link. Every consumer checks for '' and falls back to the verified
 * consultation path instead. Fill a value in and the corresponding CTA starts
 * pointing at the real destination — no other change needed.
 *
 * See README.md for the table of what each blank does.
 */

/** Verified: the live site's own canonical host (robots.txt points at www). */
export const ORIGIN = 'https://www.digital-x-marketing.com';

/** Verified live pages. These already exist and must keep receiving traffic. */
export const LIVE = {
  home: `${ORIGIN}/`,
  projekti: `${ORIGIN}/projekti`,
  blog: `${ORIGIN}/blog`,
  shop: `${ORIGIN}/shop`,
} as const;

/**
 * Destinations referenced by the live homepage whose URLs could not be
 * resolved. Left blank on purpose — see the fallbacks below each one.
 */
export const UNRESOLVED = {
  /** "Analiza sajta" / the free 60-second audit. Blank → the on-page audit flow. */
  auditPage: '',
  /** "Pogledaj akcijsku ponudu" for Smart Website Launch. Blank → the offer block scrolls to contact. */
  offerPage: '',
  /** Eynna Hair case study. Blank → the card links to /projekti. */
  eynnaCaseStudy: '',
  /** The live Eynna Hair wig designer app. Blank → the card links to /projekti. */
  eynnaApp: '',
  /** AI Second Brain OS detail page. Blank → the card links to /projekti. */
  secondBrainOs: '',
  /** GrowthOS demo. Blank → the card links to /projekti. */
  growthOs: '',
  /** Consultation booking (Calendly or similar). Blank → the on-page form. */
  bookingUrl: '',
  /** Privacy policy / terms. Blank → the footer link is not rendered. */
  privacyPolicy: '',
  termsOfService: '',
  /** Social profiles. Blank → not rendered. */
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

/**
 * The Smart Website Launch promotion was live on digital-x-marketing.com when
 * this page was built. It is capped at five projects in total, so it will end.
 * Set to false the day it does and the whole block disappears.
 */
export const OFFER_ACTIVE = true;
