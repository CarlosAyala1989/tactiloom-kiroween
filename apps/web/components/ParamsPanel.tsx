'use client';

import { CARD_KIND_SPECS, PARAM_UI, type CardKind } from '@tactiloom/contracts';
import { es } from '@/lib/i18n/es';
import { DocumentSelect } from './DocumentSelect';

export interface ParamNode {
  readonly id: string;
  readonly markerId: number;
  readonly kind: CardKind;
  readonly row: number;
  readonly col: number;
}

/** Parameter forms generated from the declarative PARAM_UI contract (no free code, closed options). */
export function ParamsPanel({
  nodes,
  params,
  onChange,
  selectedId,
  onSelect,
}: {
  nodes: readonly ParamNode[];
  params: Record<string, Record<string, unknown>>;
  onChange: (nodeId: string, key: string, value: unknown) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const configurable = nodes.filter((node) => PARAM_UI[node.kind].length > 0);
  return (
    <div className="space-y-3">
      {configurable.map((node) => {
        const spec = CARD_KIND_SPECS[node.kind];
        const values = params[node.id] ?? {};
        const open = selectedId === node.id;
        return (
          <fieldset key={node.id} className={`rounded-lg border p-3 ${open ? 'border-amber/70' : 'border-ink-700'}`} onFocus={() => onSelect(node.id)}>
            <legend className="px-1 text-sm font-semibold">
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: spec.color }} aria-hidden="true" />#{node.markerId} {es.kinds[node.kind]} · ({node.row},{node.col})
            </legend>
            <p className="mb-2 text-xs text-muted">{spec.effectEs}</p>
            <div className="space-y-2">
              {PARAM_UI[node.kind].map((field) => {
                const inputId = `${node.id}-${field.key}`;
                const value = values[field.key];
                if (field.control === 'document') {
                  return <DocumentSelect key={field.key} value={(value as string | null) ?? null} onChange={(id) => onChange(node.id, field.key, id)} label={field.labelEs} />;
                }
                if (field.control === 'readonly') {
                  return (
                    <p key={field.key} className="text-sm">
                      <span className="font-semibold">{field.labelEs}:</span> <code className="mono">{String(value ?? '')}</code>
                      {field.helpEs && <span className="block text-xs text-muted">{field.helpEs}</span>}
                    </p>
                  );
                }
                if (field.control === 'select') {
                  return (
                    <div key={field.key}>
                      <label htmlFor={inputId} className="block text-xs font-semibold">
                        {field.labelEs}
                      </label>
                      <select id={inputId} className="field mt-1" value={String(value ?? '')} onChange={(event) => onChange(node.id, field.key, event.target.value)}>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.labelEs}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (field.control === 'multiselect') {
                  const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
                  return (
                    <fieldset key={field.key}>
                      <legend className="text-xs font-semibold">{field.labelEs}</legend>
                      <div className="mt-1 flex flex-wrap gap-3">
                        {field.options?.map((option) => (
                          <label key={option.value} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={selected.has(option.value)}
                              onChange={(event) => {
                                const next = new Set(selected);
                                if (event.target.checked) next.add(option.value);
                                else next.delete(option.value);
                                onChange(node.id, field.key, [...next]);
                              }}
                            />
                            {option.labelEs}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                }
                return (
                  <div key={field.key}>
                    <label htmlFor={inputId} className="block text-xs font-semibold">
                      {field.labelEs}
                    </label>
                    <input id={inputId} className="field mt-1" value={String(value ?? '')} maxLength={80} onChange={(event) => onChange(node.id, field.key, event.target.value)} />
                    {field.helpEs && <p className="mt-0.5 text-xs text-muted">{field.helpEs}</p>}
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
