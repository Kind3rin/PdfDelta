import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPreferences, createPreferenceSync } from './account-preferences.mjs';
const allowed = new Set(['merge', 'split']);
const defaults = { theme: 'light', favorites: [] };
function fake(read = async () => ({ data: null }), write = async () => ({ error: null })) {
  return { from: name => { assert.equal(name, 'account_preferences'); return { select: () => ({ eq: () => ({ maybeSingle: read }) }), upsert: write }; } };
}
test('only known preference fields leave the device', () => {
  assert.deepEqual(cleanPreferences({ theme: 'dark', favorites: ['merge', 'merge', 'invalid'], pdf: new Uint8Array(8), signature: 'private' }, allowed), { theme: 'dark', favorites: ['merge'] });
});
test('remote preferences load without uploading local files or overwriting existing choices', async () => {
  let applied;
  const sync = createPreferenceSync(fake(async () => ({ data: { theme: 'dark', favorites: ['split'] } }), () => assert.fail('unexpected write')), allowed, () => {});
  await sync.connect('one', defaults, data => { applied = data; });
  assert.deepEqual(applied, { theme: 'dark', favorites: ['split'] });
});
test('stale reads after account change do not apply', async () => {
  let finish;
  const sync = createPreferenceSync(fake(() => new Promise(resolve => { finish = resolve; })), allowed, () => {});
  const pending = sync.connect('one', defaults, () => assert.fail('stale account applied'));
  sync.disconnect(); finish({ data: defaults }); await pending;
});
test('writes are serialized and sanitized', async () => {
  const writes = []; let release;
  const sync = createPreferenceSync(fake(async () => ({ data: defaults }), async row => {
    writes.push(row); if (writes.length === 1) await new Promise(resolve => { release = resolve; }); return {};
  }), allowed, () => {});
  await sync.connect('one', defaults, () => {});
  const first = sync.save({ theme: 'dark', favorites: ['merge'], filename: 'private.pdf' });
  const second = sync.save(defaults);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(writes.length, 1);
  release(); await first; await second;
  assert.deepEqual(writes, [{ user_id: 'one', theme: 'dark', favorites: ['merge'] }, { user_id: 'one', ...defaults }]);
});
test('local edits during initial fetch are preserved', async () => {
  let finish; const writes = [];
  const sync = createPreferenceSync(fake(() => new Promise(resolve => { finish = resolve; }), async row => { writes.push(row); return {}; }), allowed, () => {});
  const pending = sync.connect('one', defaults, () => assert.fail('local edit overwritten'));
  sync.save({ theme: 'dark', favorites: ['merge'] }); finish({ data: defaults }); await pending;
  await new Promise(resolve => setImmediate(resolve)); assert.equal(writes[0].theme, 'dark');
});
test('failed load never overwrites remote data with local defaults', async () => {
  const messages = [];
  const sync = createPreferenceSync(fake(async () => ({ error: new Error('offline') }), () => assert.fail('unsafe write')), allowed, message => messages.push(message));
  await sync.connect('one', defaults, () => assert.fail('unexpected apply'));
  await sync.save(defaults); assert.match(messages[0], /non disponibile/);
});
