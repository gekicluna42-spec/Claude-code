import { CONTACT } from '../data/content';
import { $ } from '../lib/dom';
import { wireForm } from '../lib/forms';

export function initContact(): void {
  const form = $<HTMLFormElement>('[data-contact]');
  if (!form) return;
  wireForm(form, {
    subject: 'Zahtjev za besplatne konzultacije — Digital X',
    sentMessage: `Hvala. Javljamo se — ${CONTACT.reply}.`,
    fallbackMessage: `Otvaramo pripremljeni email na ${CONTACT.email}. Pošaljite ga i javljamo se — ${CONTACT.reply}.`,
  });
}
