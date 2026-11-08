import { z } from 'zod';
import { CardKindSchema } from './cards';
import { DiagnosticCodeSchema, DiagnosticSchema } from './diagnostics';
import { CellSchema, OrientationSchema } from './geometry';

export const BOARD_PROTOCOL_VERSION = 'ritual-board/1' as const;
export const SOURCE_MODES = ['physical', 'image', 'simulator'] as const;
export const SourceModeSchema = z.enum(SOURCE_MODES);
export type SourceMode = z.infer<typeof SourceModeSchema>;

const PointSchema = z.object({ x: z.number(), y: z.number() });
export type Point = z.infer<typeof PointSchema>;

/** Geometry of the printable board (millimetres). Mirrors catalog/board-v1.json. */
export const BoardTemplateSchema = z.object({
  templateId: z.literal('board-v1'),
  protocolVersion: z.literal(BOARD_PROTOCOL_VERSION),
  description: z.string(),
  dictionary: z.literal('DICT_4X4_100'),
  markerBits: z.literal(4),
  markerBorderBits: z.literal(1),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  units: z.literal('mm'),
  page: z.object({
    format: z.string(),
    orientation: z.enum(['landscape', 'portrait']),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  grid: z.object({
    x: z.number(),
    y: z.number(),
    cellWidth: z.number().positive(),
    cellHeight: z.number().positive(),
  }),
  fiducials: z
    .array(
      z.object({
        markerId: z.number().int().min(0).max(3),
        corner: z.enum(['top-left', 'top-right', 'bottom-right', 'bottom-left']),
        center: PointSchema,
        size: z.number().positive(),
      }),
    )
    .length(4),
  card: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    cornerRadius: z.number().nonnegative(),
    markerSize: z.number().positive(),
    markerCenter: PointSchema,
  }),
  canonical: z.object({ width: z.number().positive(), height: z.number().positive() }),
  tolerances: z.object({
    cellCenterAxisFraction: z.number().positive().max(0.5),
    orientationDegrees: z.number().positive().max(45),
    markerSizeRelative: z.number().positive(),
    maxReprojectionErrorMm: z.number().positive(),
  }),
});
export type BoardTemplate = z.infer<typeof BoardTemplateSchema>;

/** A card placed on a cell. This is the compiler input; type/instance are re-derived from the catalog. */
export const BoardCardSchema = z.object({
  markerId: z.number().int().min(0).max(999),
  row: z.number().int().min(0).max(63),
  col: z.number().int().min(0).max(63),
  orientation: OrientationSchema,
  /** Heuristic placement quality in [0,1] (not a probability). Null when not estimated (simulator). */
  quality: z.number().min(0).max(1).nullable().default(null),
  cardInstanceId: z.string().max(64).optional(),
  type: CardKindSchema.optional(),
});
export type BoardCard = z.infer<typeof BoardCardSchema>;

export const BoardStateSchema = z.object({
  protocolVersion: z.literal(BOARD_PROTOCOL_VERSION),
  sourceMode: SourceModeSchema,
  board: z.object({
    templateId: z.literal('board-v1'),
    columns: z.number().int().positive().max(64),
    rows: z.number().int().positive().max(64),
    calibrated: z.boolean(),
  }),
  cards: z.array(BoardCardSchema).max(64),
  diagnostics: z.array(DiagnosticSchema).max(200).default([]),
});
export type BoardState = z.infer<typeof BoardStateSchema>;
export type BoardStateInput = z.input<typeof BoardStateSchema>;

const Corners4Schema = z.array(z.tuple([z.number(), z.number()])).length(4);

export const DetectedCardSchema = BoardCardSchema.extend({
  cardInstanceId: z.string().max(64),
  type: CardKindSchema,
  centerMm: PointSchema,
  centerCanonical: PointSchema,
  /** Offset from the cell centre as a fraction of cell width/height. */
  offset: z.object({ dx: z.number(), dy: z.number() }),
  angleDeg: z.number(),
  angleDeviationDeg: z.number().min(0),
  sideMm: z.number().nonnegative(),
  cornersImage: Corners4Schema,
});
export type DetectedCard = z.infer<typeof DetectedCardSchema>;

export const RejectedMarkerSchema = z.object({
  markerId: z.number().int().min(0).max(999),
  reason: DiagnosticCodeSchema,
  centerImage: PointSchema,
  centerMm: PointSchema.nullable(),
  candidateCells: z.array(CellSchema).max(4),
  cornersImage: Corners4Schema,
});
export type RejectedMarker = z.infer<typeof RejectedMarkerSchema>;

export const DetectionResultSchema = z.object({
  protocolVersion: z.literal(BOARD_PROTOCOL_VERSION),
  requestId: z.string().min(1).max(100),
  detectorVersion: z.string().min(1).max(100),
  sourceMode: z.enum(['physical', 'image']),
  image: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  board: z.object({
    templateId: z.literal('board-v1'),
    columns: z.number().int().positive(),
    rows: z.number().int().positive(),
    calibrated: z.boolean(),
    fiducialsFound: z.array(z.number().int().min(0).max(3)).max(4),
    fiducialsMissing: z.array(z.number().int().min(0).max(3)).max(4),
    reprojectionErrorMm: z.number().nonnegative().nullable(),
    /** Row-major 3x3 homography image → board millimetres. */
    homography: z.array(z.number()).length(9).nullable(),
  }),
  cards: z.array(DetectedCardSchema).max(64),
  rejectedMarkers: z.array(RejectedMarkerSchema).max(200),
  diagnostics: z.array(DiagnosticSchema).max(200),
  metrics: z.object({
    decodeMs: z.number().nonnegative(),
    detectMs: z.number().nonnegative(),
    calibrateMs: z.number().nonnegative(),
    assignMs: z.number().nonnegative(),
    overlayMs: z.number().nonnegative(),
    totalMs: z.number().nonnegative(),
    markersDetected: z.number().int().nonnegative(),
  }),
  overlay: z
    .object({
      mime: z.enum(['image/jpeg', 'image/png']),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      dataBase64: z.string().min(1),
    })
    .nullable(),
});
export type DetectionResult = z.infer<typeof DetectionResultSchema>;

/** Projects a vision DetectionResult onto the compiler's BoardState contract. */
export function boardStateFromDetection(detection: DetectionResult): BoardState {
  return {
    protocolVersion: BOARD_PROTOCOL_VERSION,
    sourceMode: detection.sourceMode,
    board: {
      templateId: detection.board.templateId,
      columns: detection.board.columns,
      rows: detection.board.rows,
      calibrated: detection.board.calibrated,
    },
    cards: detection.cards.map((card) => ({
      markerId: card.markerId,
      row: card.row,
      col: card.col,
      orientation: card.orientation,
      quality: card.quality,
      cardInstanceId: card.cardInstanceId,
      type: card.type,
    })),
    diagnostics: detection.diagnostics,
  };
}
