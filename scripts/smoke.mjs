#!/usr/bin/env node
// End-to-end API smoke test against a running Tactiloom stack (local or deployed):
//   node scripts/smoke.mjs [baseUrl]
// image (gallery scenario) → OpenCV → compile → version → dry-run → approval → execution → download.
const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3210').replace(/\/$/, '');
const origin = new URL(base).origin;
let cookie = '';

async function call(path, init = {}) {
  const headers = { origin, ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) };
  const response = await fetch(`${base}${path}`, { ...init, headers, redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const type = response.headers.get('content-type') ?? '';
  const body = type.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${JSON.stringify(body).slice(0, 400)}`);
  return body;
}

const json = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(runId, statuses, timeoutMs = 60_000) {
  const started = Date.now();
  for (;;) {
    const run = await call(`/api/runs/${runId}`);
    if (statuses.includes(run.status)) return run;
    if (Date.now() - started > timeoutMs) throw new Error(`timeout waiting for ${statuses} (last ${run.status})`);
    await sleep(700);
  }
}

async function flow(documentName, scenarioId, expectBranch) {
  const { documents } = await call('/api/uploads');
  const doc = documents.find((d) => d.originalName === documentName);
  const form = new FormData();
  form.append('scenarioId', scenarioId);
  const analysis = await call('/api/board/analyze', { method: 'POST', body: form });
  console.log(`  vision: ${analysis.detection.cards.length} tarjetas, calibrado=${analysis.detection.board.calibrated}, ${Math.round(analysis.detection.metrics.totalMs)} ms`);
  const version = await call('/api/workflows', json({ captureId: analysis.captureId, params: { 'input-11': { uploadedFileId: doc.id } } }));
  console.log(`  version v${version.versionNumber} valid=${version.valid} ${version.contentHash}`);
  const { runId } = await call('/api/runs/preview', json({ workflowVersionId: version.versionId }));
  const previewed = await waitFor(runId, ['AWAITING_APPROVAL', 'FAILED']);
  if (previewed.status !== 'AWAITING_APPROVAL') throw new Error(`preview failed: ${previewed.errorCode}`);
  console.log(`  dry-run: rama ${previewed.plan.decision.port}, efectos ${previewed.plan.effects.map((e) => e.kind).join(',')}`);
  await call('/api/runs', json({ previewRunId: runId, contentHash: previewed.contentHash, planHash: previewed.planHash, confirm: true }));
  const done = await waitFor(runId, ['SUCCEEDED', 'FAILED', 'CANCELLED']);
  if (done.status !== 'SUCCEEDED') throw new Error(`run ${done.status} ${done.errorCode}`);
  if (done.outcome.decision.port !== expectBranch) throw new Error(`expected branch ${expectBranch}`);
  for (const artifact of done.artifacts) {
    const text = await call(`/api/artifacts/${artifact.id}/download`);
    const content = typeof text === 'string' ? text : JSON.stringify(text);
    console.log(`  artefacto ${artifact.safeName}: ${artifact.size} bytes, contiene «Ana Ejemplo Ríos»=${content.includes('Ana Ejemplo Ríos')}`);
  }
  for (const task of done.reviewTasks) console.log(`  revisión ${task.status}: faltan ${task.missingFields} inválidos ${task.invalidFields}`);
  return done;
}

const health = await call('/api/health');
console.log(`health: ${health.status} ${JSON.stringify(health.checks)}`);
await call('/api/demo/session', { method: 'POST' });
console.log('1) valid-application.pdf + valid-board-perspective');
await flow('valid-application.pdf', 'valid-board-perspective', 'TRUE');
console.log('2) invalid-application.pdf + valid-board');
await flow('invalid-application.pdf', 'valid-board', 'FALSE');
console.log('3) tablero ambiguo no compila');
const form = new FormData();
form.append('scenarioId', 'invalid-board-ambiguous');
const ambiguous = await call('/api/board/analyze', { method: 'POST', body: form });
const compiled = await call('/api/workflows/compile', json({ captureId: ambiguous.captureId, params: {} }));
console.log(`  valid=${compiled.valid} errores=${[...new Set(compiled.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code))].join(',')}`);
if (compiled.valid) throw new Error('ambiguous board must not compile');
console.log('SMOKE OK');
