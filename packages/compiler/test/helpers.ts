import type { BoardState, Diagnostic, Orientation } from '@tactiloom/contracts';
import { boardStateFromLayout, type LayoutEntry } from '../src/index';

export function state(layout: readonly LayoutEntry[], overrides: Partial<BoardState> = {}): BoardState {
  return { ...boardStateFromLayout(layout), ...overrides };
}

export function errorCodes(diagnostics: readonly Diagnostic[]): string[] {
  return [...new Set(diagnostics.filter((d) => d.severity === 'error').map((d) => d.code))].sort();
}

export function withCard(layout: readonly LayoutEntry[], card: LayoutEntry): LayoutEntry[] {
  return [...layout, card];
}

export function without(layout: readonly LayoutEntry[], markerId: number): LayoutEntry[] {
  return layout.filter(([id]) => id !== markerId);
}

export function replace(layout: readonly LayoutEntry[], markerId: number, row: number, col: number, orientation: Orientation): LayoutEntry[] {
  return layout.map((entry) => (entry[0] === markerId ? ([markerId, row, col, orientation] as const) : entry));
}
