// Store deltas, not a complete copy of every annotation at every step.
export class AnnotationHistory {
  constructor(limit = 50) { this.limit = limit; this.reset(); }
  reset() { this.past = []; this.future = []; }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  record({ page, added = {}, removed = {} }) {
    if (![added.marks, added.strokes, removed.marks, removed.strokes].some(items => items?.length)) return;
    this.past.push(structuredClone({ page, added, removed }));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  move(state, redo = false) {
    const source = redo ? this.future : this.past;
    const destination = redo ? this.past : this.future;
    const action = source.pop();
    if (!action) return null;
    destination.push(action);
    const insert = redo ? action.added : action.removed;
    const remove = redo ? action.removed : action.added;
    const result = { page: action.page };
    for (const key of ['marks', 'strokes']) {
      const ids = new Set((remove[key] || []).map(item => item.sequence));
      result[key] = [...state[key].filter(item => !ids.has(item.sequence)), ...structuredClone(insert[key] || [])].sort((a,b) => a.sequence-b.sequence);
    }
    return result;
  }
}
