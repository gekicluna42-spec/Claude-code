/**
 * 08 — About, and the footer's contact column.
 *
 * The about copy is DIP Studio's own text, verbatim. The contact column
 * renders only the channels that have been verified; unset ones simply do
 * not appear.
 */

import { aboutParagraphs, site, has } from '../data/site.config';
import { esc, qs } from '../lib/dom';

export function initAbout(): void {
  const copy = qs('#about-copy');
  if (copy) {
    copy.innerHTML = aboutParagraphs.map((p) => `<p>${esc(p)}</p>`).join('');
  }

  const year = qs('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  const list = qs('#footer-contact-list');
  const column = qs('#footer-contact');
  if (!list || !column) return;

  const items: string[] = [];
  const { phone, email, instagramHandle, facebookUrl, tiktokUrl } = site.contact;

  if (has(phone)) items.push(`<li><a href="tel:${esc(phone.replace(/\s+/g, ''))}">${esc(phone)}</a></li>`);
  if (has(email)) items.push(`<li><a href="mailto:${esc(email)}">${esc(email)}</a></li>`);
  if (has(instagramHandle)) {
    const handle = instagramHandle.replace(/^@/, '');
    items.push(
      `<li><a href="https://www.instagram.com/${encodeURIComponent(handle)}/" target="_blank" rel="noopener noreferrer">Instagram</a></li>`,
    );
  }
  if (has(facebookUrl)) items.push(`<li><a href="${esc(facebookUrl)}" target="_blank" rel="noopener noreferrer">Facebook</a></li>`);
  if (has(tiktokUrl)) items.push(`<li><a href="${esc(tiktokUrl)}" target="_blank" rel="noopener noreferrer">TikTok</a></li>`);

  items.push('<li><button class="link-underline" data-open-booking>Rezerviši datum</button></li>');
  list.innerHTML = items.join('');
}
