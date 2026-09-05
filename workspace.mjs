import { PageHistory } from './workspace-model.mjs';
import { readEditable, readBytes, viewportFor } from './pdf-engine.mjs';

export function initWorkspace(bridge) {
  const host = document.querySelector('#visualWorkspace');
  const $ = id => host.querySelector('#' + id);
  const history = new PageHistory();
  const sources = new Map();
  const selected = new Set();
  let serial = 0, busy = false, cancel = false, generation = 0, limit = 60, lastOutput;
  let renderTasks = [];
  const status = message => { $('wsStatus').textContent = message; };
  const title = () => sources.get(history.pages[0]?.source)?.file.name || 'Il tuo documento';
  function controls() {
    host.querySelectorAll('[data-edit]').forEach(button => { button.disabled = busy || !selected.size; });
    $('wsUndo').disabled = busy || !history.canUndo;
    $('wsRedo').disabled = busy || !history.canRedo;
    for (const id of ['wsExport', 'wsContinue', 'wsSelectAll', 'wsCompare']) $(id).disabled = busy || !history.pages.length;
    for (const id of ['wsImport', 'wsDemo', 'wsFromQueue', 'wsUseOutput', 'wsReset']) $(id).disabled = busy;
    $('wsFiles').disabled = busy;
    $('wsCancel').hidden = !busy;
    $('wsSummary').textContent = `${history.pages.length} pagine · ${selected.size} selezionate`;
  }
  function checkCancelled() { if (cancel) throw new DOMException('Operazione annullata. Il documento precedente è intatto.', 'AbortError'); }
  async function job(action) {
    if (busy) return;
    busy = true; cancel = false; controls();
    try { await action(); } catch (error) { status(error.message); }
    finally { busy = false; controls(); }
  }
  async function open(files, replace = false) {
    await job(async () => {
      const incoming = [...files];
      if (!incoming.length) throw new Error('Seleziona almeno un PDF o caricalo dagli strumenti.');
      const total = [...sources.values()].reduce((n, s) => n + s.file.size, 0) + incoming.reduce((n, f) => n + f.size, 0);
      if (total > 200 * 1024 * 1024) throw new Error('La sessione supera 200 MB. Esporta e inizia una nuova sessione.');
      const staged = [], pages = replace ? [] : [...history.pages];
      try {
        for (const [i, file] of incoming.entries()) {
          checkCancelled();
          status(`Apertura documento ${i + 1} di ${incoming.length}: ${file.name}`);
          const doc = await readEditable(file);
          if (pages.length + doc.getPageCount() > 1000) throw new Error('La sessione supporta fino a 1000 pagine.');
          const task = window.pdfjsLib.getDocument({ data: await readBytes(file), owner: 'workspace' });
          const reader = await task.promise;
          const key = `source-${++serial}`;
          staged.push({ key, file, doc, reader, task });
          doc.getPages().forEach((page, index) => pages.push({ id: `${key}-${index}`, source: key, index, rotation: page.getRotation().angle }));
        }
        checkCancelled();
        staged.forEach(s => sources.set(s.key, s));
        history.commit(pages); selected.clear(); limit = 60;
        await render();
        status('Documento pronto. Seleziona le pagine per organizzarle.');
      } catch (error) {
        await Promise.allSettled(staged.filter(s => !sources.has(s.key)).map(s => s.task.destroy()));
        throw error;
      }
    });
  }
  async function render() {
    const epoch = ++generation;
    renderTasks.forEach(task => task.cancel()); renderTasks = [];
    const grid = $('wsPages');
    grid.replaceChildren();
    $('wsEmpty').hidden = history.pages.length > 0;
    $('wsTitle').textContent = title();
    $('wsMore').hidden = history.pages.length <= limit;
    controls();
    for (const [position, item] of history.pages.slice(0, limit).entries()) {
      if (epoch !== generation) return;
      const source = sources.get(item.source);
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'page-tile'; card.dataset.page = item.id;
      card.draggable = true;
      card.setAttribute('aria-pressed', String(selected.has(item.id)));
      card.setAttribute('aria-label', `Pagina ${position + 1}, ${source.file.name}, originale ${item.index + 1}`);
      const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
      const caption = document.createElement('span'); caption.className = 'page-caption';
      caption.textContent = `${position + 1}`;
      const label = document.createElement('small'); label.textContent = source.file.name;
      card.append(canvas, caption, label); grid.append(card);
      try {
        const page = await source.reader.getPage(item.index + 1);
        if (epoch !== generation) return;
        const viewport = viewportFor(page, 220, item.rotation);
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
        renderTasks.push(task);
        await task.promise;
      } catch (error) {
        if (error.name !== 'RenderingCancelledException') { label.textContent = 'Anteprima non disponibile'; status(error.message); }
      }
    }
  }
  async function compose() {
    const result = await window.PDFLib.PDFDocument.create();
    for (const [i, item] of history.pages.entries()) {
      checkCancelled();
      const [page] = await result.copyPages(sources.get(item.source).doc, [item.index]);
      page.setRotation(window.PDFLib.degrees(item.rotation)); result.addPage(page);
      status(`Preparazione pagina ${i + 1} di ${history.pages.length}`);
      if (i % 10 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    checkCancelled();
    const bytes = await result.save();
    checkCancelled();
    return new File([bytes], 'pdfdelta-workspace.pdf', { type: 'application/pdf' });
  }
  $('wsFiles').addEventListener('change', event => { void open(event.target.files); event.target.value = ''; });
  host.addEventListener('dragover', event => { if ([...event.dataTransfer.types].includes('Files')) event.preventDefault(); });
  host.addEventListener('drop', event => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault(); void open(event.dataTransfer.files);
  });
  $('wsImport').onclick = () => $('wsFiles').click();
  $('wsFromQueue').onclick = () => void open(bridge.getFiles());
  $('wsCancel').onclick = () => { cancel = true; status('Annullamento in corso…'); };
  $('wsUndo').onclick = () => { history.undo(); selected.clear(); void render(); status('Modifica annullata.'); };
  $('wsRedo').onclick = () => { history.redo(); selected.clear(); void render(); status('Modifica ripristinata.'); };
  $('wsSelectAll').onclick = () => {
    if (selected.size === history.pages.length) selected.clear();
    else history.pages.forEach(p => selected.add(p.id));
    updateSelection();
  };
  function updateSelection() {
    $('wsPages').querySelectorAll('[data-page]').forEach(card => card.setAttribute('aria-pressed', String(selected.has(card.dataset.page))));
    controls();
  }
  $('wsPages').onclick = event => {
    const card = event.target.closest('[data-page]');
    if (!card || busy) return;
    const id = card.dataset.page;
    selected.has(id) ? selected.delete(id) : selected.add(id);
    updateSelection();
  };
  host.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => {
    try {
      const action = button.dataset.edit;
      if (action === 'rotate') history.rotate(selected);
      if (action === 'remove') { history.remove(selected); selected.clear(); }
      if (action === 'left') history.move(selected, -1);
      if (action === 'right') history.move(selected, 1);
      void render(); status('Modifica applicata. Puoi annullarla.');
    } catch (error) { status(error.message); }
  });
  let dragged;
  $('wsPages').ondragstart = event => { if (busy) { event.preventDefault(); return; } dragged = event.target.closest('[data-page]')?.dataset.page; event.dataTransfer.setData('text/plain', dragged || ''); };
  $('wsPages').ondragover = event => { if (dragged) event.preventDefault(); };
  $('wsPages').ondrop = event => {
    if (!dragged || busy) return;
    event.preventDefault(); history.moveTo(dragged, event.target.closest('[data-page]')?.dataset.page); dragged = null; void render();
  };
  $('wsPages').ondragend = () => { dragged = null; };
  $('wsExport').onclick = () => void job(async () => { const file = await compose(); bridge.download(file, file.name); status('PDF esportato. Le modifiche restano disponibili.'); });
  $('wsContinue').onclick = () => void job(async () => {
    bridge.useFile(await compose());
    document.querySelector('#workspace').scrollIntoView({ behavior: 'smooth' });
    status('Documento pronto negli strumenti. Il prossimo PDF prodotto potrà tornare qui.');
  });
  window.addEventListener('pdfdelta-output', event => {
    if (!/\.pdf$/i.test(event.detail.filename)) return;
    lastOutput = new File([event.detail.blob], event.detail.filename, { type: 'application/pdf' });
    $('wsUseOutput').hidden = false;
  });
  $('wsUseOutput').onclick = () => void open([lastOutput], true);
  $('wsMore').onclick = () => { limit += 60; void render(); };
  $('wsReset').onclick = () => void job(async () => {
    ++generation; renderTasks.forEach(task => task.cancel());
    await Promise.allSettled([...sources.values()].map(s => s.task.destroy()));
    sources.clear(); history.entries = [[]]; history.cursor = 0; selected.clear();
    lastOutput = null; $('wsUseOutput').hidden = true;
    await render(); status('Sessione svuotata. Aggiungi un PDF per iniziare.');
  });
  $('wsDemo').onclick = () => void job(async () => {
    const doc = await window.PDFLib.PDFDocument.create();
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    for (const [index, label] of ['Proposta di progetto', 'Obiettivi e attivita', 'Tempi e consegne'].entries()) {
      const page = doc.addPage([595, 842]);
      page.drawRectangle({ x: 0, y: 750, width: 595, height: 92, color: window.PDFLib.rgb(.12, .25, .36) });
      page.drawText('DELTA / STUDIO', { x: 45, y: 788, size: 22, font, color: window.PDFLib.rgb(1, 1, 1) });
      page.drawText(label, { x: 45, y: 680, size: 26, font });
      page.drawText('Documento dimostrativo. Nessun dato personale.', { x: 45, y: 640, size: 12, font });
      for (let line = 0; line < 8; line++) page.drawRectangle({ x: 45, y: 560 - line * 32, width: line % 3 === 0 ? 340 : 500, height: 8, color: window.PDFLib.rgb(.85, .88, .9) });
      page.drawText(`${index + 1}`, { x: 500, y: 40, size: 14, font });
    }
    const file = new File([await doc.save()], 'Proposta-studio.pdf', { type: 'application/pdf' });
    busy = false; await open([file]);
  });
  $('wsCompare').onclick = () => void job(async () => {
    const item = history.pages.find(p => selected.has(p.id)) || history.pages[0];
    if (!item) return;
    const dialog = $('wsPreview');
    dialog.showModal();
    const page = await sources.get(item.source).reader.getPage(item.index + 1);
    for (const [id, rotation] of [['wsOriginal', page.rotate], ['wsCurrent', item.rotation]]) {
      const canvas = $(id); const viewport = viewportFor(page, 540, rotation);
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  });
  $('wsClosePreview').onclick = () => $('wsPreview').close();
  host.addEventListener('keydown', event => {
    if (busy || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault(); event.shiftKey ? history.redo() : history.undo(); selected.clear(); void render();
    }
  });
  void render();
}
