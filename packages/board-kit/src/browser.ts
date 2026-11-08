/** Browser-safe entry point: card/board SVG rendering and kit texts, without PDF dependencies. */
import { DEFAULT_LOCALE, getBoardTemplate, type CardCatalogEntry, type Locale } from '@tactiloom/contracts';
import { boardItems, cardItems } from './designs';
import { renderSvg } from './svg';

export {
  CARD_TITLES,
  TITLE_MIN_SIZE_MM,
  TITLE_SIZE_MM,
  boardItems,
  cardItems,
  cardTitleMaxWidth,
  cardTitleSize,
} from './designs';
export { CARD_ICONS, iconSvg } from './icons';
export { ARUCO_DICTIONARY, ARUCO_MARKER_COUNT, markerModules } from './aruco';
export { fitTextSize, textWidthMm, unencodableCharacters, type FontWeight } from './metrics';
export { renderSvg } from './svg';
export { KIT_TEXTS, kitTexts, type KitTexts, type PdfTexts } from './texts';

/** SVG of one card with its texts in `locale` (same drawing as the printed PDF). */
export function cardSvg(entry: CardCatalogEntry, locale: Locale = DEFAULT_LOCALE): string {
  const { card } = getBoardTemplate();
  return renderSvg({ width: card.width, height: card.height, items: cardItems(entry, locale) }, `Tactiloom ${entry.kind} #${entry.markerId}`);
}

export function boardSvg(locale: Locale = DEFAULT_LOCALE): string {
  const { page } = getBoardTemplate();
  return renderSvg({ width: page.width, height: page.height, items: boardItems('full', locale) }, 'Tactiloom Board v1 (A3)');
}
