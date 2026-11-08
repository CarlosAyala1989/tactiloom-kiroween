export { compile, COMPILER_VERSION, sortDiagnostics, type CompiledNode, type CompileOptions, type CompileResult, type GraphView } from './compile';
export { analyzeGraph, type GraphAnalysis, type GraphInput, type GraphNodeInput } from './graph';
export { verifyIr, type IrVerification } from './verify';
export { diffBoards, diffIr, type BoardDiff, type IrDiff, type PlacedCardLike } from './diff';
export { describeIrEs, type DescribedStep } from './describe';
export { cardLabel, cellLabel, DATA_FACT_LABEL_ES } from './messages';
export { OFFICIAL_TWO_BRANCH_LAYOUT, LINEAR_LAYOUT, boardStateFromLayout, type LayoutEntry } from './fixtures';
