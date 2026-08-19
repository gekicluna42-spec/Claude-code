/**
 * The 14 services DIP Studio actually lists on dipstudio.ba, with their own
 * one-line descriptions VERBATIM. Nothing added, nothing embellished.
 * No prices, no equipment specifications, no availability, no safety claims.
 */

export interface Service {
  /** URL-safe id, used for anchors, filters and the builder. */
  id: string;
  /** Name exactly as DIP Studio writes it. */
  name: string;
  /** One-line description exactly as it appears on dipstudio.ba. */
  tagline: string;
  /**
   * Editorial expansion written for this redesign. Describes the moment and
   * the feeling only — never capability, coverage, timing or equipment.
   */
  editorial: string;
  /** Media key resolved by the media manifest. */
  media: string;
  /** Set when a dedicated SEO page exists. */
  page?: string;
}

export const services: readonly Service[] = [
  {
    id: 'niski-dim',
    name: 'Niski dim',
    tagline: 'Stvara magičnu, suptilnu atmosferu',
    editorial:
      'Gusti, niski oblak koji ostaje pri podu i pretvara plesni podij u površinu bez dna. Mladenci ne plešu po parketu — plešu po oblacima.',
    media: 'act-03-cloud-b',
    page: '/usluge/niski-dim/',
  },
  {
    id: 'prskalice',
    name: 'Prskalice',
    tagline: 'Sve vrste prskalica za unutarnju i vanjsku upotrebu',
    editorial:
      'Svjetlo koje se podiže oko vas i pretvara jedan pokret u kadar. Zbog izvedbi za unutarnji i vanjski prostor, prskalice se prilagođavaju sali jednako kao i otvorenom terasi.',
    media: 'act-04-spark-c',
    page: '/usluge/prskalice/',
  },
  {
    id: 'vatrena-vjetrenjaca',
    name: 'Vatrena vjetrenjača i lepeza',
    tagline: 'Spektakularni efekti koji oduzimaju dah',
    editorial:
      'Geometrija od svjetla — krug i lepeza koji se otvaraju iza mladenaca i daju sceni oblik koji se pamti.',
    media: 'act-04-spark-a',
  },
  {
    id: 'rotirajuce-prskalice',
    name: 'Rotirajuće prskalice i vatropad',
    tagline: 'Dinamični vizualni prikazi koji podižu energiju',
    editorial:
      'Trenutak kada mirna scena postaje energija: pokret, ritam i svjetlo koje pada u zavjesu.',
    media: 'act-04-spark-b',
  },
  {
    id: 'vatrometi',
    name: 'Razne vrste vatrometa',
    tagline: 'Spektakularni trenuci koji ostavljaju bez daha',
    editorial:
      'Završni akcenat večeri — trenutak koji svi gosti gledaju u istom smjeru, u isto vrijeme.',
    media: 'act-05-spectacle-b',
  },
  {
    id: 'party-gun',
    name: 'Party gun',
    tagline: 'Efektan dodatak koji razveseljava sve prisutne',
    editorial:
      'Kada svadba pređe u party. Detalj koji podiže podij i vraća goste na plesni podij.',
    media: 'act-05-spectacle-a',
  },
  {
    id: 'photobooth-360-booth',
    name: 'Photobooth & 360 booth',
    tagline: 'Zabavni sadržaj i uspomene za goste',
    editorial:
      'Vaši gosti odlaze kući s nečim u ruci. Photobooth i 360 video booth pretvaraju red za fotografiju u dio zabave.',
    media: 'act-05-spectacle-c',
    page: '/usluge/photobooth-360-booth/',
  },
  {
    id: 'audioguestbook',
    name: 'Audioguestbook',
    tagline: 'Glasovne poruke koje ostaju zauvijek',
    editorial:
      'Knjiga utisaka koja se sluša. Glasovi ljudi koji su bili tu, onako kako su zvučali te večeri.',
    media: 'act-01-anticipation-b',
  },
  {
    id: 'magicni-laser',
    name: 'Magični laser',
    tagline: 'Moderan efekat za poseban vizualni dojam',
    editorial:
      'Precizne linije svjetla kroz atmosferu sale — moderan sloj koji prostoru daje dubinu.',
    media: 'act-05-spectacle-b',
  },
  {
    id: 'ambijentalna-rasvjeta',
    name: 'Ambijentalna rasvjeta i zvjezdano nebo',
    tagline: 'Ugođaj koji potpuno transformiše prostor',
    editorial:
      'Prvo što gosti osjete kada uđu, a posljednje čega se sjete. Rasvjeta nosi ton cijele večeri, a zvjezdano nebo podiže pogled.',
    media: 'act-05-spectacle-a',
    page: '/usluge/ambijentalna-rasvjeta/',
  },
  {
    id: 'neonski-natpisi',
    name: 'Neonski natpisi',
    tagline: 'Moderna rješenja za osvježavanje prostora',
    editorial:
      'Vaše ime, vaš datum, vaša rečenica — u svjetlu, na zidu koji svi fotografišu.',
    media: 'act-01-anticipation-a',
  },
  {
    id: 'zdravica',
    name: 'Zdravica',
    tagline: 'Trenuci i detalji koji traju',
    editorial:
      'Trenutak podignutih čaša zaslužuje isti tretman kao i prvi ples — pripremljen, osvijetljen, zabilježen.',
    media: 'act-01-anticipation-c',
  },
  {
    id: 'profesionalna-fotografkinja',
    name: 'Profesionalna fotografkinja',
    tagline: 'Uhvatiti svaki osmijeh i emociju',
    editorial:
      'Da efekat ne prođe neviđen. Fotografkinja koja zna gdje stajati kada se podigne dim i kada krenu prskalice.',
    media: 'act-02-first-dance-c',
  },
  {
    id: 'pokloni-za-goste',
    name: 'Izrada poklona za goste',
    tagline: 'Unikatni detalji koji ostaju kao uspomena',
    editorial:
      'Sitnica koju gost stavi na policu i sjeti se večeri svaki put kada je pogleda.',
    media: 'act-02-first-dance-a',
  },
];

export const serviceById = (id: string): Service | undefined =>
  services.find((s) => s.id === id);

/**
 * The effect library, organised by the moment it belongs to. Every entry is
 * one of the 14 services above — no combination DIP Studio does not list.
 */
export interface MomentGroup {
  id: string;
  label: string;
  headline: string;
  copy: string;
  serviceIds: readonly string[];
}

export const momentGroups: readonly MomentGroup[] = [
  {
    id: 'prvi-ples',
    label: 'Prvi ples',
    headline: 'Trenutak zbog kojeg svi ustaju',
    copy: 'Sve se stišava, svjetla padaju i podij postaje scena. Ovo je kombinacija koja od prvog plesa pravi kadar.',
    serviceIds: ['niski-dim', 'prskalice', 'ambijentalna-rasvjeta', 'magicni-laser'],
  },
  {
    id: 'ulazak',
    label: 'Ulazak',
    headline: 'Prvih deset sekundi',
    copy: 'Vrata se otvaraju i cijela sala se okreće. Ulazak postavlja ton svemu što slijedi.',
    serviceIds: ['prskalice', 'vatrometi', 'ambijentalna-rasvjeta'],
  },
  {
    id: 'torta',
    label: 'Torta',
    headline: 'Rez koji svi snimaju',
    copy: 'Kratak trenutak s najviše podignutih telefona u sali. Zaslužuje svoje svjetlo.',
    serviceIds: ['prskalice', 'vatrena-vjetrenjaca', 'ambijentalna-rasvjeta'],
  },
  {
    id: 'party',
    label: 'Party',
    headline: 'Kada svadba postane slavlje',
    copy: 'Poslije formalnog dijela dolazi dio koji gosti prepričavaju sedmicama.',
    serviceIds: ['photobooth-360-booth', 'party-gun', 'neonski-natpisi', 'rotirajuce-prskalice'],
  },
  {
    id: 'uspomena',
    label: 'Uspomena',
    headline: 'Ono što ostaje poslije',
    copy: 'Dan prođe. Ovo je dio koji vam ostaje u rukama i u ušima.',
    serviceIds: ['audioguestbook', 'profesionalna-fotografkinja', 'pokloni-za-goste', 'zdravica'],
  },
];
