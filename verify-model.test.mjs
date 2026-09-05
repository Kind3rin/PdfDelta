import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PageHistory } from './workspace-model.mjs';
const make = () => { const h = new PageHistory(); h.commit(['a', 'b', 'c', 'd'].map(id => ({ id, rotation: 0 }))); return h; };
test('initial import is the history base and cannot undo to an empty document', () => {
  const h = make(); assert.equal(h.canUndo, false); h.undo(); assert.equal(h.pages.length, 4);
});
test('history retains all 50 undo steps after eviction and releases discarded sources', () => {
  const h = new PageHistory();
  for (let i = 0; i <= 60; i++) h.commit([{ id: String(i), source: 'source-' + i, rotation: 0 }]);
  assert.equal(h.entries.length, 51); assert.equal(h.sourceIds.size, 51);
  assert.equal(h.sourceIds.has('source-9'), false);
  let undone = 0; while (h.canUndo) { h.undo(); undone++; }
  assert.equal(undone, 50); assert.equal(h.pages[0].source, 'source-10');
  h.commit([{ id: 'new', source: 'new-source', rotation: 0 }]);
  assert.deepEqual([...h.sourceIds], ['source-10', 'new-source']); assert.equal(h.canRedo, false);
});
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

import { createPageRenderer } from './editor-renderer.mjs';

test('preview ignores stale page loads and releases cancelled canvases', async () => {
  let firstPage, finish;
  const canvases = [], commits = [];
  const page = { getViewport: () => ({ width: 100, height: 200 }), render: () => ({ promise: Promise.resolve(), cancel() {} }) };
  const render = createPageRenderer({ createCanvas: () => { const c = { getContext: () => ({}) }; canvases.push(c); return c; }, viewportFor: () => ({ width:100, height:200 }), commit: (_,__,n) => commits.push(n) });
  const pdf = { getPage: n => n === 1 ? new Promise(r => { firstPage = r; }) : Promise.resolve(page) };
  const stale = render(pdf, 1, 100);
  await render(pdf, 2, 100);
  firstPage(page); await stale;
  assert.deepEqual(commits, [2]);
  assert.equal(canvases[0].width, 0);
  let cancelled = false;
  const slow = { ...page, render: () => ({ promise: new Promise((_, reject) => { finish = reject; }), cancel() { cancelled = true; finish(new Error('cancelled')); } }) };
  const rendering = render({ getPage: async () => slow }, 1, 100);
  await Promise.resolve();
  await render({ getPage: async () => page }, 3, 100);
  await rendering;
  assert.equal(cancelled, true);
  assert.deepEqual(commits, [2,3]);
  assert.ok(canvases.every(c => c.width === 0 && c.height === 0));
});

test('preview surfaces current errors and permits retry', async () => {
  let commits = 0;
  const render = createPageRenderer({ createCanvas: () => ({ getContext: () => ({}) }), viewportFor: () => ({ width:10,height:10 }), commit: () => commits++ });
  await assert.rejects(render({ getPage: async () => { throw new Error('broken'); } }, 1, 10), /broken/);
  await render({ getPage: async () => ({ getViewport: () => ({}), render: () => ({ promise: Promise.resolve(), cancel() {} }) }) }, 1, 10);
  assert.equal(commits, 1);
});

import { annotationGeometry } from './editor-geometry.mjs';
test('annotation mapping reverses rotated, cropped and scaled viewports', () => {
  for (const [matrix,height,expected,angle] of [
    [[1,0,0,-1,0,400],400,{x:30,y:80},0],
    [[0,1,1,0,-20,-10],300,{x:230,y:50},90],
    [[-1,0,0,1,300,0],400,{x:270,y:320},180],
    [[0,-1,-1,0,400,300],300,{x:80,y:370},-90],
    [[2,0,0,-2,-20,840],800,{x:25,y:60},0],
  ]) {
    const g = annotationGeometry({ transform:matrix,height });
    assert.deepEqual(g.point({x:30,y:80}), expected);
    assert.ok(Math.abs(Math.abs(g.angle)-Math.abs(angle)) < .0001);
  }
});
