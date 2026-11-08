import { CARD_KIND_SPECS, type WorkflowIR } from '@tactiloom/contracts';
import { cardLabel, cellLabel } from './messages';

export interface DescribedStep {
  readonly depth: number;
  readonly text: string;
  readonly nodeId: string;
}

/**
 * Textual alternative of the diagram (accessibility): depth-first walk from START,
 * TRUE branch before FALSE branch.
 */
export function describeIrEs(ir: WorkflowIR): DescribedStep[] {
  const nodes = new Map(ir.nodes.map((node) => [node.id, node]));
  const steps: DescribedStep[] = [];
  const visit = (id: string, depth: number, prefix: string, seen: Set<string>): void => {
    const node = nodes.get(id);
    if (!node || seen.has(id)) return;
    seen.add(id);
    const label = `${prefix}${cardLabel(node.markerId, node.kind)} en ${cellLabel(node.layout.row, node.layout.col)} — ${CARD_KIND_SPECS[node.kind].descriptionEs}`;
    steps.push({ depth, text: label, nodeId: id });
    const out = ir.edges.filter((edge) => edge.from === id);
    if (node.kind === 'CONDITION') {
      const yes = out.find((edge) => edge.port === 'TRUE');
      const no = out.find((edge) => edge.port === 'FALSE');
      if (yes) visit(yes.to, depth + 1, 'Si SÍ: ', seen);
      if (no) visit(no.to, depth + 1, 'Si NO: ', seen);
      return;
    }
    const next = out.find((edge) => edge.port === 'NEXT');
    if (next) visit(next.to, depth, '', seen);
  };
  visit(ir.startNodeId, 0, '', new Set());
  return steps;
}
