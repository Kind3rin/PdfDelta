export class PageHistory {
  constructor() { this.entries = [[]]; this.cursor = 0; }
  get pages() { return this.entries[this.cursor]; }
  get canUndo() { return this.cursor > 0; }
  get canRedo() { return this.cursor < this.entries.length - 1; }
  commit(pages) {
    if (JSON.stringify(pages) === JSON.stringify(this.pages)) return;
    this.entries = this.entries.slice(0, this.cursor + 1);
    this.entries.push(pages.map(p => ({ ...p })));
    if (this.entries.length > 51) this.entries.shift();
    this.cursor = this.entries.length - 1;
  }
  undo() { if (this.canUndo) this.cursor--; }
  redo() { if (this.canRedo) this.cursor++; }
  rotate(ids) { this.commit(this.pages.map(p => ids.has(p.id) ? { ...p, rotation: (p.rotation + 90) % 360 } : p)); }
  remove(ids) {
    const pages = this.pages.filter(p => !ids.has(p.id));
    if (!pages.length) throw new Error('Mantieni almeno una pagina nel documento.');
    this.commit(pages);
  }
  move(ids, direction) {
    if (this.pages.length < 2) return;
    const pages = [...this.pages];
    const start = direction < 0 ? 1 : pages.length - 2;
    const end = direction < 0 ? pages.length : -1;
    for (let i = start; i !== end; i -= direction) {
      const target = i + direction;
      if (ids.has(pages[i].id) && !ids.has(pages[target].id)) [pages[i], pages[target]] = [pages[target], pages[i]];
    }
    this.commit(pages);
  }
  moveTo(id, beforeId) {
    const pages = [...this.pages];
    const item = pages.find(p => p.id === id);
    if (!item || id === beforeId || !pages.some(p => p.id === beforeId)) return;
    const rest = pages.filter(p => p.id !== id);
    rest.splice(rest.findIndex(p => p.id === beforeId), 0, item);
    this.commit(rest);
  }
}
