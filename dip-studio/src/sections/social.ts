/**
 * 07 — Life at DIP Studio.
 *
 * Renders only if a real Instagram handle is configured. No follower counts,
 * no engagement claims, no invented posts.
 */

import { site, has } from '../data/site.config';
import { esc, qs } from '../lib/dom';

export function initSocial(): void {
  const section = qs('#instagram');
  const root = qs('#social');
  if (!section || !root) return;

  if (!has(site.contact.instagramHandle)) {
    section.hidden = true;
    return;
  }

  const handle = site.contact.instagramHandle.replace(/^@/, '');
  const profile = `https://www.instagram.com/${encodeURIComponent(handle)}/`;

  const cards = site.instagramPosts
    .map(
      (post) => `
        <a class="social__card" href="${esc(post.permalink)}" target="_blank" rel="noopener noreferrer">
          <img src="${esc(post.image)}" alt="${esc(post.alt)}" loading="lazy" decoding="async" />
        </a>
      `,
    )
    .join('');

  root.innerHTML = `
    ${cards ? `<div class="social__rail">${cards}</div>` : ''}
    <p style="margin-top:1.5rem">
      <a class="btn" href="${profile}" target="_blank" rel="noopener noreferrer">Prati DIP Studio</a>
    </p>
  `;
}
