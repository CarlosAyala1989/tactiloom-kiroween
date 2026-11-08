/** Browser-safe entry point: card/board SVG rendering without PDF dependencies. */
import { getBoardTemplate, type CardCatalogEntry } from '@ritualos/contracts';
import { boardItems, cardItems } from './designs';
import { renderSvg } from './svg';

export { CARD_TITLES, TITLE_SIZE_MM, cardItems, boardItems } from './designs';
export { CARD_ICONS, iconSvg } from './icons';
export { ARUCO_DICTIONARY, ARUCO_MARKER_COUNT, markerModules } from './aruco';
export { renderSvg } from './svg';

export function cardSvg(entry: CardCatalogEntry): string {
  const { card } = getBoardTemplate();
  return renderSvg({ width: card.width, height: card.height, items: cardItems(entry) }, `RitualOS ${entry.kind} #${entry.markerId}`);
}

export function boardSvg(): string {
  const { page } = getBoardTemplate();
  return renderSvg({ width: page.width, height: page.height, items: boardItems('full') }, 'RitualOS Ritual Board v1 (A3)');
}
