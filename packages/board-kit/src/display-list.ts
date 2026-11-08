/**
 * Minimal vector display list in millimetres (top-left origin, y down).
 * The same list is rendered to SVG and PDF so both outputs share exact geometry.
 */
export type Primitive =
  | {
      readonly type: 'rect';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly fill?: string;
      readonly stroke?: string;
      readonly strokeWidth?: number;
      readonly radius?: number;
      readonly dash?: readonly number[];
    }
  | {
      readonly type: 'line';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly stroke: string;
      readonly strokeWidth: number;
      readonly dash?: readonly number[];
    }
  | {
      readonly type: 'text';
      readonly x: number;
      /** Baseline position. */
      readonly y: number;
      readonly text: string;
      readonly size: number;
      readonly weight: 'regular' | 'bold';
      readonly anchor: 'start' | 'middle' | 'end';
      readonly fill: string;
    }
  | {
      readonly type: 'path';
      /** SVG path data in its own coordinate system. */
      readonly d: string;
      readonly x: number;
      readonly y: number;
      /** Millimetres per path unit. */
      readonly scale: number;
      readonly fill?: string;
      readonly stroke?: string;
      readonly strokeWidth?: number;
    }
  | {
      /** ArUco marker: modules[row][col] true = white. Drawn as black square + white modules. */
      readonly type: 'marker';
      readonly x: number;
      readonly y: number;
      readonly size: number;
      readonly modules: readonly (readonly boolean[])[];
      readonly markerId: number;
    }
  | {
      readonly type: 'group';
      readonly x: number;
      readonly y: number;
      readonly scale: number;
      readonly items: readonly Primitive[];
      readonly id?: string;
    };

export interface Drawing {
  readonly width: number;
  readonly height: number;
  readonly items: readonly Primitive[];
}

export function translate(items: readonly Primitive[], x: number, y: number, scale = 1, id?: string): Primitive {
  return id === undefined ? { type: 'group', x, y, scale, items } : { type: 'group', x, y, scale, items, id };
}

/** Every text string of a display list, groups included (in drawing order). */
export function collectTexts(items: readonly Primitive[]): string[] {
  return items.flatMap((item) => (item.type === 'text' ? [item.text] : item.type === 'group' ? collectTexts(item.items) : []));
}
