import { absoluteUrl, canonicalUrl } from '../i18n/paths';
import { ui, type Locale } from '../i18n/ui';
import { aboutCopy } from './about';
import { portrait } from './gallery';

/** Вуз Лады — имя собственное, одно на все локали; источник адреса — docs/specs/structured-data.md. */
const ALMA_MATER = {
  '@type': 'CollegeOrUniversity',
  name: 'Національний університет фізичного виховання і спорту України',
  sameAs: 'https://uni-sport.edu.ua/',
} as const;

export interface FounderNode {
  readonly '@type': 'Person';
  readonly '@id': string;
  readonly name: string;
  readonly jobTitle: string;
  readonly image: string;
  readonly alumniOf: typeof ALMA_MATER;
}

/**
 * Узел основательницы — один на главную, автора статьи и предмет страницы эксперта: «тот же
 * человек» проверяется равенством `@id`, и второй построитель разошёлся бы в имени или роли
 * (docs/specs/structured-data.md §Founder node). Имя — из подписи обращения «Про нас»,
 * поэтому подпись и разметка не могут разойтись. Порядок ключей — тот, что главная выводила
 * до выноса: её JSON-LD не меняется.
 */
export async function founderNode(locale: Locale): Promise<FounderNode> {
  return {
    '@type': 'Person',
    '@id': `${canonicalUrl(locale)}#founder`,
    name: (await aboutCopy(locale)).data.signatureName,
    jobTitle: ui[locale].meta.founderRole,
    image: absoluteUrl((await portrait()).data.photo.src),
    alumniOf: ALMA_MATER,
  };
}
