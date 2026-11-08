import dictionaryJson from './aruco/dict-4x4-100.json';

interface DictionaryFile {
  readonly dictionary: string;
  readonly markerBits: number;
  readonly borderBits: number;
  readonly modules: number;
  readonly markers: Readonly<Record<string, readonly string[]>>;
}

const dictionary = dictionaryJson as DictionaryFile;

export const ARUCO_DICTIONARY = dictionary.dictionary;
export const ARUCO_MODULES = dictionary.modules;
export const ARUCO_MARKER_COUNT = Object.keys(dictionary.markers).length;

/** 6x6 module matrix (true = white) exported from OpenCV for DICT_4X4_100. */
export function markerModules(markerId: number): boolean[][] {
  const rows = dictionary.markers[String(markerId)];
  if (!rows) {
    throw new RangeError(`Marker ${markerId} no existe en ${ARUCO_DICTIONARY}`);
  }
  return rows.map((row) => [...row].map((bit) => bit === '1'));
}
