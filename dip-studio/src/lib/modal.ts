/**
 * One dialog behaviour, used by both the booking form and the effect preview:
 * open/close, scrim and Escape, a focus trap, and focus restored to whatever
 * opened it.
 */

import { qsa } from './dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

export interface ModalOptions {
  /** Selector for elements that close the dialog from inside it. */
  closeSelector: string;
  /** Runs after the panel is visible — the moment focus can actually land. */
  onOpened?(trigger?: HTMLElement): void;
  onClosed?(): void;
}

export interface ModalController {
  readonly isOpen: boolean;
  open(trigger?: HTMLElement): void;
  /** `restoreFocus: false` when handing over to another dialog. */
  close(options?: { restoreFocus?: boolean }): void;
  /** Focus the first sensible control inside the panel. */
  focusFirst(preferred?: HTMLElement | null): void;
}

export function createModal(root: HTMLElement, options: ModalOptions): ModalController {
  const panel = root.querySelector<HTMLElement>('.modal__panel');
  let lastFocused: HTMLElement | null = null;
  let open = false;

  const focusable = (): HTMLElement[] =>
    panel ? qsa<HTMLElement>(FOCUSABLE, panel).filter((el) => el.offsetParent !== null) : [];

  const controller: ModalController = {
    get isOpen() {
      return open;
    },

    open(trigger) {
      if (open) return;
      open = true;
      lastFocused = (trigger ?? document.activeElement) as HTMLElement;
      root.hidden = false;
      document.documentElement.classList.add('lenis-stopped');

      // Two frames: the panel is visibility:hidden until .is-open lands, and
      // focus() is a no-op while an ancestor is hidden.
      requestAnimationFrame(() => {
        root.classList.add('is-open');
        requestAnimationFrame(() => options.onOpened?.(trigger));
      });
    },

    close(closeOptions) {
      if (!open) return;
      open = false;
      root.classList.remove('is-open');
      document.documentElement.classList.remove('lenis-stopped');
      window.setTimeout(() => {
        if (!open) root.hidden = true;
      }, 320);
      options.onClosed?.();
      if (closeOptions?.restoreFocus !== false) lastFocused?.focus();
    },

    focusFirst(preferred) {
      (preferred ?? focusable()[0])?.focus();
    },
  };

  qsa(options.closeSelector, root).forEach((el) =>
    el.addEventListener('click', () => controller.close()),
  );

  document.addEventListener('keydown', (event) => {
    if (!open) return;

    if (event.key === 'Escape') {
      controller.close();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  });

  return controller;
}
