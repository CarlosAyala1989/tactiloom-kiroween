'use client';

import { CARD_KIND_SPECS, type CardKind, type IrEdge } from '@tactiloom/contracts';
import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { useMemo } from 'react';
import { textOn } from '@/lib/client/contrast';
import { es } from '@/lib/i18n/es';
import { SHORT_TITLE } from './BoardGrid';

export type NodeRunState = 'idle' | 'predicted' | 'running' | 'succeeded' | 'failed' | 'skipped';

export interface DiagramNode {
  readonly id: string;
  readonly markerId: number;
  readonly kind: CardKind;
  readonly row: number;
  readonly col: number;
}

type CardNodeData = { node: DiagramNode; state: NodeRunState; hasError: boolean; selected: boolean };

const STATE_STYLE: Record<NodeRunState, { ring: string; label: string }> = {
  idle: { ring: 'transparent', label: '' },
  predicted: { ring: '#6fb4f2', label: 'previsto' },
  running: { ring: '#f2c14e', label: 'en curso' },
  succeeded: { ring: '#52c47e', label: 'ok' },
  failed: { ring: '#f0705f', label: 'falló' },
  skipped: { ring: '#6b5d4b', label: 'no ejecutado' },
};

function CardNode({ data }: NodeProps<Node<CardNodeData>>) {
  const spec = CARD_KIND_SPECS[data.node.kind];
  const state = STATE_STYLE[data.state];
  const handle = '!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-ink-500';
  return (
    <div
      className="w-[136px] rounded-xl border-2 bg-ink-950 px-2 py-1.5 text-paper shadow-lg"
      style={{ borderColor: data.hasError ? '#f0705f' : spec.color, boxShadow: data.state !== 'idle' ? `0 0 0 3px ${state.ring}` : undefined, outline: data.selected ? '2px solid #ffbd5c' : undefined }}
    >
      <Handle id="t-l" type="target" position={Position.Left} className={handle} isConnectable={false} />
      <Handle id="t-t" type="target" position={Position.Top} className={handle} isConnectable={false} />
      <Handle id="t-r" type="target" position={Position.Right} className={handle} isConnectable={false} />
      <Handle id="t-b" type="target" position={Position.Bottom} className={handle} isConnectable={false} />
      <div className="flex items-center justify-between gap-1">
        <span className="rounded px-1 text-[0.65rem] font-bold" style={{ background: spec.color, color: textOn(spec.color) }}>
          {SHORT_TITLE[data.node.kind]}
        </span>
        <span className="mono text-[0.65rem] text-muted">#{data.node.markerId}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[0.65rem] text-muted">
        <span>
          ({data.node.row},{data.node.col})
        </span>
        {state.label && <span style={{ color: state.ring }}>{state.label}</span>}
      </div>
      <Handle id="s-r" type="source" position={Position.Right} className={handle} isConnectable={false} />
      <Handle id="s-b" type="source" position={Position.Bottom} className={handle} isConnectable={false} />
      <Handle id="s-l" type="source" position={Position.Left} className={handle} isConnectable={false} />
      <Handle id="s-t" type="source" position={Position.Top} className={handle} isConnectable={false} />
    </div>
  );
}

/** Connections are always between adjacent cells: route each edge through the facing sides. */
function handlesFor(from: DiagramNode | undefined, to: DiagramNode | undefined): { sourceHandle: string; targetHandle: string } {
  if (!from || !to) return { sourceHandle: 's-r', targetHandle: 't-l' };
  if (to.col > from.col) return { sourceHandle: 's-r', targetHandle: 't-l' };
  if (to.col < from.col) return { sourceHandle: 's-l', targetHandle: 't-r' };
  if (to.row > from.row) return { sourceHandle: 's-b', targetHandle: 't-t' };
  return { sourceHandle: 's-t', targetHandle: 't-b' };
}

const nodeTypes = { card: CardNode };

/**
 * Diagram derived from the compiled IR (or the partial graph of an invalid board). Edges are
 * never drawn by hand: they come from the compiler. Parameters are edited in the side panel.
 */
export function WorkflowDiagram({
  nodes,
  edges,
  states = {},
  errorNodeIds = new Set<string>(),
  selectedId,
  onSelect,
  height = 360,
}: {
  nodes: readonly DiagramNode[];
  edges: readonly IrEdge[];
  states?: Readonly<Record<string, NodeRunState>>;
  errorNodeIds?: ReadonlySet<string>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const flowNodes = useMemo<Node<CardNodeData>[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: 'card',
        position: { x: node.col * 170, y: node.row * 110 },
        data: { node, state: states[node.id] ?? 'idle', hasError: errorNodeIds.has(node.id), selected: node.id === selectedId },
        draggable: false,
        connectable: false,
      })),
    [nodes, states, errorNodeIds, selectedId],
  );
  const flowEdges = useMemo<Edge[]>(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return edges.map((edge) => ({
      id: `${edge.from}-${edge.port}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      ...handlesFor(byId.get(edge.from), byId.get(edge.to)),
      type: 'smoothstep',
      label: edge.port === 'NEXT' ? undefined : edge.port === 'TRUE' ? 'SÍ' : 'NO',
      animated: states[edge.from] === 'succeeded' && (states[edge.to] === 'running' || states[edge.to] === 'succeeded'),
      style: { stroke: edge.port === 'FALSE' ? '#f08c00' : edge.port === 'TRUE' ? '#52c47e' : '#bcae9a', strokeWidth: 2 },
      labelStyle: { fill: '#f5efe6', fontWeight: 700 },
      labelBgStyle: { fill: '#19150f' },
    }));
  }, [edges, nodes, states]);
  return (
    <div style={{ height }} className="rounded-xl border border-ink-700 bg-ink-950" aria-hidden="true">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={Boolean(onSelect)}
        onNodeClick={(_event, node) => onSelect?.(node.id)}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        minZoom={0.3}
      >
        <Background gap={24} color="#383026" />
      </ReactFlow>
    </div>
  );
}

/** Textual alternative of the diagram for screen readers and keyboard users. */
export function StepList({ steps, title = 'Programa en texto' }: { steps: readonly { depth: number; text: string; nodeId: string }[]; title?: string }) {
  if (steps.length === 0) return null;
  return (
    <details className="mt-3 rounded-lg border border-ink-700 px-3 py-2 text-sm" open>
      <summary className="cursor-pointer font-semibold">{title} (alternativa accesible al diagrama)</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-6">
        {steps.map((step) => (
          <li key={step.nodeId} style={{ marginLeft: `${step.depth * 1.25}rem` }}>
            {step.text}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">Leyenda: «Si SÍ» = rama TRUE (sigue la flecha); «Si NO» = rama FALSE (gira a la derecha). {es.kinds.CONDITION} solo ejecuta una rama.</p>
    </details>
  );
}
