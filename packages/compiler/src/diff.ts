import { canonicalStringify, compareEdges, type IrEdge, type Orientation, type WorkflowIR } from '@tactiloom/contracts';

export interface PlacedCardLike {
  readonly markerId: number;
  readonly row: number;
  readonly col: number;
  readonly orientation: Orientation;
}

export interface BoardDiff {
  readonly added: PlacedCardLike[];
  readonly removed: PlacedCardLike[];
  readonly moved: { markerId: number; from: { row: number; col: number }; to: { row: number; col: number } }[];
  readonly rotated: { markerId: number; from: Orientation; to: Orientation }[];
  readonly unchanged: number;
}

/** Physical differences between two scans (by marker id; duplicates use the first placement). */
export function diffBoards(previous: readonly PlacedCardLike[], next: readonly PlacedCardLike[]): BoardDiff {
  const index = (cards: readonly PlacedCardLike[]) => {
    const map = new Map<number, PlacedCardLike>();
    for (const card of [...cards].sort((a, b) => a.row - b.row || a.col - b.col || a.markerId - b.markerId)) {
      if (!map.has(card.markerId)) map.set(card.markerId, card);
    }
    return map;
  };
  const before = index(previous);
  const after = index(next);
  const added: PlacedCardLike[] = [];
  const removed: PlacedCardLike[] = [];
  const moved: BoardDiff['moved'] = [];
  const rotated: BoardDiff['rotated'] = [];
  let unchanged = 0;
  for (const [markerId, card] of after) {
    const old = before.get(markerId);
    if (!old) {
      added.push(card);
      continue;
    }
    let same = true;
    if (old.row !== card.row || old.col !== card.col) {
      moved.push({ markerId, from: { row: old.row, col: old.col }, to: { row: card.row, col: card.col } });
      same = false;
    }
    if (old.orientation !== card.orientation) {
      rotated.push({ markerId, from: old.orientation, to: card.orientation });
      same = false;
    }
    if (same) unchanged += 1;
  }
  for (const [markerId, card] of before) if (!after.has(markerId)) removed.push(card);
  const byId = (a: { markerId: number }, b: { markerId: number }) => a.markerId - b.markerId;
  return { added: added.sort(byId), removed: removed.sort(byId), moved: moved.sort(byId), rotated: rotated.sort(byId), unchanged };
}

export interface IrDiff {
  readonly sameProgram: boolean;
  readonly nodesAdded: string[];
  readonly nodesRemoved: string[];
  readonly edgesAdded: IrEdge[];
  readonly edgesRemoved: IrEdge[];
  readonly paramsChanged: { nodeId: string; before: unknown; after: unknown }[];
}

/** Semantic differences between two compiled programs. */
export function diffIr(previous: WorkflowIR | null, next: WorkflowIR | null): IrDiff {
  const prevNodes = new Map((previous?.nodes ?? []).map((n) => [n.id, n]));
  const nextNodes = new Map((next?.nodes ?? []).map((n) => [n.id, n]));
  const edgeKey = (e: IrEdge) => `${e.from}|${e.port}|${e.to}`;
  const prevEdges = new Map((previous?.edges ?? []).map((e) => [edgeKey(e), e]));
  const nextEdges = new Map((next?.edges ?? []).map((e) => [edgeKey(e), e]));
  const paramsChanged: IrDiff['paramsChanged'] = [];
  for (const [id, node] of nextNodes) {
    const old = prevNodes.get(id);
    if (old && canonicalStringify(old.params) !== canonicalStringify(node.params)) {
      paramsChanged.push({ nodeId: id, before: old.params, after: node.params });
    }
  }
  return {
    sameProgram: previous !== null && next !== null && previous.contentHash === next.contentHash,
    nodesAdded: [...nextNodes.keys()].filter((id) => !prevNodes.has(id)).sort(),
    nodesRemoved: [...prevNodes.keys()].filter((id) => !nextNodes.has(id)).sort(),
    edgesAdded: [...nextEdges.entries()].filter(([key]) => !prevEdges.has(key)).map(([, e]) => e).sort(compareEdges),
    edgesRemoved: [...prevEdges.entries()].filter(([key]) => !nextEdges.has(key)).map(([, e]) => e).sort(compareEdges),
    paramsChanged: paramsChanged.sort((a, b) => (a.nodeId < b.nodeId ? -1 : 1)),
  };
}
