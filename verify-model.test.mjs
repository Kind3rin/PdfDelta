import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PageHistory } from './workspace-model.mjs';
const make = () => { const h = new PageHistory(); h.commit(['a', 'b', 'c', 'd'].map(id => ({ id, rotation: 0 }))); return h; };
test('non contiguous page selection moves one position preserving order', () => {
  const h = make(); h.move(new Set(['a', 'c']), 1);
  assert.deepEqual(h.pages.map(p => p.id), ['b', 'a', 'd', 'c']);
  h.undo(); assert.deepEqual(h.pages.map(p => p.id), ['a', 'b', 'c', 'd']);
  h.redo(); assert.deepEqual(h.pages.map(p => p.id), ['b', 'a', 'd', 'c']);
});
test('new edits discard redo, retain original page transforms', () => {
  const h = make(); h.rotate(new Set(['a'])); h.undo(); h.remove(new Set(['b']));
  assert.equal(h.canRedo, false); assert.equal(h.pages[0].rotation, 0);
  h.undo(); assert.equal(h.pages.length, 4);
});
test('all-page deletion rejected and empty movement terminates', () => {
  const h = make(); assert.throws(() => h.remove(new Set(['a', 'b', 'c', 'd'])));
  assert.equal(h.pages.length, 4); new PageHistory().move(new Set(), 1);
});
test('drag reorders only the intended page and rotation wraps', () => {
  const h = make(); h.moveTo('d', 'b');
  assert.deepEqual(h.pages.map(p => p.id), ['a', 'd', 'b', 'c']);
  for (let i = 0; i < 4; i++) h.rotate(new Set(['d']));
  assert.equal(h.pages[1].rotation, 0);
});
