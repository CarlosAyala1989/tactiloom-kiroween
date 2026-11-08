import type { CardKind } from '@ritualos/contracts';

/** Icon layers in a 24x24 box. `ink` uses the card colour, `paper` is white. Original artwork (MIT). */
export interface IconLayer {
  readonly d: string;
  readonly fill: 'ink' | 'paper';
}

const DOCUMENT = 'M5 2 H14 L19 7 V22 H5 Z';

export const CARD_ICONS: Readonly<Record<CardKind, readonly IconLayer[]>> = {
  START: [
    { d: 'M12 2 A10 10 0 1 1 11.99 2 Z', fill: 'ink' },
    { d: 'M9.5 7 L17.5 12 L9.5 17 Z', fill: 'paper' },
  ],
  INPUT_FILE: [
    { d: DOCUMENT, fill: 'ink' },
    { d: 'M7 13 H11.5 V10.5 L15.5 14.5 L11.5 18.5 V16 H7 Z', fill: 'paper' },
  ],
  EXTRACT_TEXT: [
    { d: DOCUMENT, fill: 'ink' },
    { d: 'M8 9 H16 V10.8 H8 Z M8 12.6 H16 V14.4 H8 Z M8 16.2 H13 V18 H8 Z', fill: 'paper' },
  ],
  VALIDATE_FIELDS: [
    { d: 'M3 3 H21 V21 H3 Z', fill: 'ink' },
    { d: 'M6.2 12.4 L8.8 9.8 L11 12 L16.6 6.4 L19.2 9 L11 17.2 Z', fill: 'paper' },
  ],
  CONDITION: [
    { d: 'M12 1.5 L22.5 12 L12 22.5 L1.5 12 Z', fill: 'ink' },
    { d: 'M12 7.5 L16.5 12 L12 16.5 L7.5 12 Z', fill: 'paper' },
  ],
  CREATE_REPORT: [
    { d: DOCUMENT, fill: 'ink' },
    { d: 'M8 18 V13.5 H10.2 V18 Z M11.4 18 V10 H13.6 V18 Z M14.8 18 V12 H17 V18 Z', fill: 'paper' },
  ],
  SAVE_REPORT: [
    { d: 'M3 3 H17 L21 7 V21 H3 Z', fill: 'ink' },
    { d: 'M7 3 H15 V8.5 H7 Z M6 13 H18 V19 H6 Z', fill: 'paper' },
  ],
  REQUEST_REVIEW: [
    { d: 'M10 2 A8 8 0 1 1 9.99 2 Z', fill: 'ink' },
    { d: 'M10 5.2 A4.8 4.8 0 1 1 9.99 5.2 Z', fill: 'paper' },
    { d: 'M14.2 16.4 L16.4 14.2 L22.4 20.2 L20.2 22.4 Z', fill: 'ink' },
  ],
  END: [
    { d: 'M8 2 H16 L22 8 V16 L16 22 H8 L2 16 V8 Z', fill: 'ink' },
    { d: 'M7 10.4 H17 V13.6 H7 Z', fill: 'paper' },
  ],
};

/** Standalone SVG (24x24) for assets/card-icons and the web UI. */
export function iconSvg(kind: CardKind, color: string): string {
  const layers = CARD_ICONS[kind]
    .map((layer) => `<path d="${layer.d}" fill="${layer.fill === 'ink' ? color : '#ffffff'}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="${kind}">${layers}</svg>\n`;
}
