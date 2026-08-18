/**
 * Media manifest.
 *
 * Keys are named for the act they belong to, so that when DIP Studio's
 * generated act keyframes land in /public/media they replace the crops here
 * one line at a time — no component needs to change.
 *
 * Everything currently resolves to a region of the master cinematic frame
 * produced by scripts/media.mjs.
 */

export interface MediaEntry {
  /** File base name in /media, without width suffix or extension. */
  base: string;
  alt: string;
  /** Intrinsic aspect of the generated crop, used to reserve space. */
  ratio: number;
}

export const media: Record<string, MediaEntry> = {
  'act-01-anticipation-a': {
    base: 'crop-entrance-arch',
    alt: 'Osvijetljen ulaz u salu prije početka slavlja.',
    ratio: 3 / 4,
  },
  'act-01-anticipation-b': {
    base: 'crop-tables-guests',
    alt: 'Postavljeni stolovi i gosti u toploj ambijentalnoj rasvjeti.',
    ratio: 4 / 3,
  },
  'act-01-anticipation-c': {
    base: 'crop-floral-arch',
    alt: 'Visoki cvjetni aranžman uz rub plesnog podija.',
    ratio: 3 / 4,
  },
  'act-02-first-dance-a': {
    base: 'crop-couple-close',
    alt: 'Mladenci u zagrljaju na plesnom podiju.',
    ratio: 1,
  },
  'act-02-first-dance-c': {
    base: 'crop-couple-wide',
    alt: 'Prvi ples mladenaca u prigušenoj sali.',
    ratio: 16 / 9,
  },
  'act-03-cloud-b': {
    base: 'crop-fog-floor',
    alt: 'Niski dim koji prekriva plesni podij oko mladenaca.',
    ratio: 16 / 9,
  },
  'act-04-spark-a': {
    base: 'crop-spark-left',
    alt: 'Hladna prskalica koja se podiže uz rub plesnog podija.',
    ratio: 3 / 4,
  },
  'act-04-spark-b': {
    base: 'crop-spark-right',
    alt: 'Snop hladnih iskri uz rub scene.',
    ratio: 3 / 4,
  },
  'act-04-spark-c': {
    base: 'crop-spark-corridor',
    alt: 'Simetričan koridor hladnih prskalica oko mladenaca.',
    ratio: 16 / 9,
  },
  'act-05-spectacle-a': {
    base: 'crop-ceiling-stars',
    alt: 'Zvjezdano nebo na stropu sale.',
    ratio: 2,
  },
  'act-05-spectacle-b': {
    base: 'crop-beams-wide',
    alt: 'Snopovi svjetla kroz atmosferu sale.',
    ratio: 16 / 9,
  },
  'act-05-spectacle-c': {
    base: 'crop-floor-reflection',
    alt: 'Odsjaj svjetla na tamnom poliranom podu.',
    ratio: 16 / 9,
  },
  'master': {
    base: 'hero-master',
    alt: 'Mladenci u niskom dimu okruženi hladnim prskalicama i zvjezdanim nebom.',
    ratio: 1672 / 941,
  },
};

const WIDTHS = [480, 800, 1200] as const;

export const entry = (key: string): MediaEntry => media[key] ?? media['master'];

/**
 * Responsive <picture> for a manifest key: AVIF, then WebP, then JPEG.
 * Width/height are emitted so nothing shifts while the image decodes.
 */
export function imageMarkup(
  key: string,
  options: { sizes?: string; className?: string; eager?: boolean } = {},
): string {
  const item = entry(key);
  const sizes = options.sizes ?? '(max-width: 700px) 90vw, 30vw';
  const srcset = (ext: string): string =>
    WIDTHS.map((w) => `/media/${item.base}-${w}.${ext} ${w}w`).join(', ');

  const width = 800;
  const height = Math.round(width / item.ratio);
  const loading = options.eager ? 'eager' : 'lazy';

  return `<picture>
    <source type="image/avif" srcset="${srcset('avif')}" sizes="${sizes}" />
    <source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}" />
    <img src="/media/${item.base}-800.jpg" srcset="${srcset('jpg')}" sizes="${sizes}"
      width="${width}" height="${height}" alt="${item.alt}"
      class="${options.className ?? ''}" loading="${loading}" decoding="async" />
  </picture>`;
}
