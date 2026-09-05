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

function storageFixture() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('failed write survives reload and retry instead of applying stale server preferences', async () => {
  const { createPreferenceJournal } = await import('./account-preferences.mjs');
  const storage = storageFixture();
  const changed = { theme: 'dark', favorites: ['split'] };
  const first = createPreferenceSync(fake(async () => ({ data: defaults }), async () => ({ error: new Error('offline') })), allowed, () => {}, createPreferenceJournal(storage));
  await first.connect('one', defaults, () => {}); await first.save(changed);
  const writes = []; let applied;
  const reloaded = createPreferenceSync(fake(async () => ({ data: defaults }), async row => { writes.push(row); return {}; }), allowed, () => {}, createPreferenceJournal(storage));
  await reloaded.connect('one', defaults, value => { applied = value; });
  assert.deepEqual(applied, changed);
  assert.deepEqual(writes, [{ user_id: 'one', ...changed }]);
  assert.equal(createPreferenceJournal(storage).read('one'), null);
});

test('pending preferences cannot be applied to a different account', async () => {
  const { createPreferenceJournal } = await import('./account-preferences.mjs');
  const storage = storageFixture(), journal = createPreferenceJournal(storage);
  journal.write('one', { version: 'pending', preferences: { theme: 'dark', favorites: ['merge'] } });
  let applied;
  const sync = createPreferenceSync(fake(async () => ({ data: defaults }), () => assert.fail('cross-account write')), allowed, () => {}, journal);
  await sync.connect('two', defaults, value => { applied = value; });
  assert.deepEqual(applied, defaults); assert.equal(journal.read('one').version, 'pending');
});

test('an older acknowledgement cannot clear a newer pending edit', async () => {
  const { createPreferenceJournal } = await import('./account-preferences.mjs');
  const journal = createPreferenceJournal(storageFixture()); let release;
  let calls = 0;
  const sync = createPreferenceSync(fake(async () => ({ data: defaults }), async () => {
    if (++calls === 1) { await new Promise(resolve => { release = resolve; }); return {}; }
    return { error: new Error('offline') };
  }), allowed, () => {}, journal);
  await sync.connect('one', defaults, () => {});
  const first = sync.save(defaults);
  await new Promise(resolve => setImmediate(resolve));
  const second = sync.save({ theme: 'dark', favorites: ['split'] });
  release(); await first; await second;
  assert.equal(journal.read('one').preferences.theme, 'dark');
});

test('storage quota failure still retries from memory without crashing', async () => {
  const { createPreferenceJournal } = await import('./account-preferences.mjs');
  const journal = createPreferenceJournal({ getItem() { throw Error('quota'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('quota'); } });
  let fail = true, saved;
  const sync = createPreferenceSync(fake(async () => ({ data: defaults }), async row => { saved = row; return fail ? { error: Error('offline') } : {}; }), allowed, () => {}, journal);
  await sync.connect('one', defaults, () => {}); await sync.save({ theme: 'dark', favorites: [] });
  fail = false; await sync.connect('one', defaults, () => {});
  assert.equal(saved.theme, 'dark'); assert.equal(journal.read('one'), null);
});

test('quota failure cannot let an older stored draft replace the latest memory edit', async () => {
  const { createPreferenceJournal } = await import('./account-preferences.mjs');
  const storage = storageFixture(), journal = createPreferenceJournal(storage);
  journal.write('one', { version:'old', preferences:defaults });
  storage.setItem = () => { throw Error('quota'); };
  journal.write('one', { version:'new', preferences:{ theme:'dark', favorites:[] } });
  assert.equal(journal.read('one').version, 'new');
  journal.remove('one', 'old');
  assert.equal(journal.read('one').version, 'new');
});
