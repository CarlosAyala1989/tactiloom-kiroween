import type { WorkflowIR } from '@tactiloom/contracts';
import type { Dictionary } from './index';

export interface DescribedStep {
  readonly depth: number;
  readonly text: string;
  readonly nodeId: string;
}

/**
 * Textual alternative of the diagram in the UI language. Same walk as `describeIrEs` in
 * @tactiloom/compiler (depth-first from START, TRUE branch before FALSE branch, each node once),
 * so the Spanish output is byte-identical to it.
 */
export function describeSteps(ir: WorkflowIR, t: Dictionary, intlTag: string): DescribedStep[] {
  const words = t.workflow.steps;
  const nodes = new Map(ir.nodes.map((node) => [node.id, node]));
  const steps: DescribedStep[] = [];
  const seen = new Set<string>();
  const visit = (id: string, depth: number, prefix: string): void => {
    const node = nodes.get(id);
    if (!node || seen.has(id)) return;
    seen.add(id);
    const card = `#${node.markerId} ${t.catalog.kinds[node.kind].toLocaleUpperCase(intlTag)}`;
    const cell = `(${node.layout.row},${node.layout.col})`;
    steps.push({ depth, text: `${prefix}${card}${words.at}${cell}${words.separator}${t.catalog.description[node.kind]}`, nodeId: id });
    const out = ir.edges.filter((edge) => edge.from === id);
    if (node.kind === 'CONDITION') {
      const yes = out.find((edge) => edge.port === 'TRUE');
      const no = out.find((edge) => edge.port === 'FALSE');
      if (yes) visit(yes.to, depth + 1, words.ifYes);
      if (no) visit(no.to, depth + 1, words.ifNo);
      return;
    }
    const next = out.find((edge) => edge.port === 'NEXT');
    if (next) visit(next.to, depth, '');
  };
  visit(ir.startNodeId, 0, '');
  return steps;
}
