#!/usr/bin/env node
// Abuse checks against a running stack: node scripts/abuse-check.mjs [baseUrl]
// 1) chunked oversized upload without Content-Length → 413 and the server stays healthy
// 2) mutation without Origin → 403
// 3) cross-origin mutation → 403
import http from 'node:http';

const base = new URL(process.argv[2] ?? 'http://localhost:3210');
const origin = base.origin;

function rawRequest(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: base.hostname, port: base.port, path, method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (typeof body === 'function') body(req);
    else {
      if (body) req.write(body);
      req.end();
    }
  });
}

const session = await rawRequest('/api/demo/session', { method: 'POST', headers: { origin } });
const cookie = String(session.headers['set-cookie']?.[0] ?? '').split(';')[0];
console.log(`session: ${session.status} ${cookie ? 'cookie ok' : 'NO COOKIE'}`);

const boundary = 'tactiloomAbuseBoundary';
const started = Date.now();
const oversized = await rawRequest('/api/uploads', {
  method: 'POST',
  headers: { origin, cookie, 'content-type': `multipart/form-data; boundary=${boundary}`, 'transfer-encoding': 'chunked' },
  body: (req) => {
    req.on('error', () => undefined);
    req.write(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.txt"\r\nContent-Type: text/plain\r\n\r\n`);
    const chunk = Buffer.alloc(1024 * 1024, 0x61);
    let sent = 0;
    const pump = () => {
      while (sent < 40) {
        sent += 1;
        if (!req.write(chunk)) {
          req.once('drain', pump);
          return;
        }
      }
      req.end(`\r\n--${boundary}--\r\n`);
    };
    pump();
  },
}).catch((error) => ({ status: `connection closed (${error.code})`, body: '' }));
console.log(`chunked 40 MB upload without Content-Length: ${oversized.status} ${String(oversized.body).slice(0, 120)} (${Date.now() - started} ms)`);

const health = await rawRequest('/api/health');
console.log(`health after abuse: ${health.status} ${JSON.parse(health.body).status}`);

const noOrigin = await rawRequest('/api/workflows/compile', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}' });
console.log(`mutation without Origin: ${noOrigin.status} ${JSON.parse(noOrigin.body).error.code}`);
const foreign = await rawRequest('/api/workflows/compile', { method: 'POST', headers: { cookie, origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
console.log(`cross-origin mutation: ${foreign.status} ${JSON.parse(foreign.body).error.code}`);

const ok = [413].includes(oversized.status) || String(oversized.status).startsWith('connection closed');
if (!ok || health.status !== 200 || noOrigin.status !== 403 || foreign.status !== 403) {
  console.error('ABUSE CHECK FAILED');
  process.exit(1);
}
console.log('ABUSE CHECK OK');
