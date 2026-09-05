const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createHash } = require('node:crypto');

test('vendored PDF.js assets match the recorded checksums', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'vendor/pdfjs-manifest.json'), 'utf8'));
  assert.equal(manifest.version, '6.3.289');
  for (const file of manifest.files) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, file.path))).digest('hex'), file.sha256, file.path);
  }
});

function worker({ cached, response, offline = false, quota = false } = {}) {
  const handlers = {};
  const deleted = [];
  const writes = [];
  let networkCalls = 0;
  const cache = {
    match: async () => cached,
    put: async (...args) => { if (quota) throw new Error('Quota'); writes.push(args); },
    addAll: async () => {},
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8'), {
    URL, Response, importScripts: () => {},
    self: {
      PDFJS_ASSETS: [],
      registration: { scope: 'https://example.com/PdfDelta/' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
    },
    caches: {
      keys: async () => ['another-app-v1', 'pdfdelta-static-v37', 'pdfdelta-static-v39'],
      delete: async (key) => deleted.push(key),
      open: async () => cache,
    },
    fetch: async () => { networkCalls++; if (offline) throw new Error('Offline'); return response; },
  });
  return {
    deleted, writes, networkCalls: () => networkCalls,
    activate: () => { let result; handlers.activate({ waitUntil: p => { result = p; } }); return result; },
    request: (url = 'https://example.com/PdfDelta/app.js', method = 'GET') => {
      let result;
      handlers.fetch({ request: { url, method }, respondWith: p => { result = p; } });
      return result;
    },
  };
}

test('activation preserves caches owned by other apps', async () => {
  const sw = worker();
  await sw.activate();
  assert.deepEqual(sw.deleted, ['pdfdelta-static-v37']);
});

test('documents, external requests, query strings and mutations bypass cache', () => {
  const sw = worker();
  for (const url of ['https://example.com/PdfDelta/private.pdf', 'https://example.com/other/app.js', 'https://other.com/PdfDelta/app.js', 'https://example.com/PdfDelta/app.js?document=secret']) {
    assert.equal(sw.request(url), undefined);
  }
  assert.equal(sw.request(undefined, 'POST'), undefined);
  assert.equal(sw.networkCalls(), 0);
});

test('offline shell uses its own version without network', async () => {
  const cached = new Response('versioned shell');
  const sw = worker({ cached, offline: true });
  assert.equal(await sw.request(), cached);
  assert.equal(sw.networkCalls(), 0);
});

test('cache miss offline returns an explicit unavailable response', async () => {
  const sw = worker({ offline: true });
  assert.equal((await sw.request()).status, 503);
});

test('error, partial and redirected responses are never cached', async () => {
  for (const props of [{ status: 404 }, { status: 500 }, { status: 206 }, { status: 200, redirected: true }]) {
    const response = { type: 'basic', redirected: false, ...props };
    const sw = worker({ response });
    assert.equal(await sw.request(), response);
    assert.equal(sw.writes.length, 0);
  }
});

test('valid asset is cached; quota failure still serves the response', async () => {
  const response = { status: 200, type: 'basic', redirected: false, clone: () => 'copy' };
  const sw = worker({ response });
  assert.equal(await sw.request(), response);
  assert.equal(sw.writes.length, 1);
  assert.equal(await worker({ response, quota: true }).request(), response);
});

test('every PDF.js entry point disables evaluation (CVE-2024-4367 mitigation)', () => {
  const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const calls = [...source.matchAll(/pdfjsLib\.getDocument\(\{([^}]+)\}/g)];
  assert.ok(calls.length > 0);
  for (const call of calls) assert.match(call[1], /isEvalSupported:\s*false/);
  assert.equal(calls.length, [...source.matchAll(/pdfjsLib\.getDocument\(/g)].length);
});
