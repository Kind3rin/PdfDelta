import { createHome } from './home.mjs';
// One input collection and one current document, shared by pages and tools.
export function initFlow(bridge, workspace) {
  bridge.setWorkspaceBusy(workspace.isBusy);
  const $ = id => document.getElementById(id);
  const host = $('visualWorkspace');
  const sidebar = host.querySelector('.ws-sidebar');
  const same = (a, b) => a.length === b.length && a.every((file, i) => file === b[i]);
  let lastFiles = [], pending = Promise.resolve();
  let intent = null;
  const icons = {
    edit: '<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>',
    compress: '<path d="M8 3v5H3m13-5v5h5M8 21v-5H3m13 5v-5h5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 16 5-5 4 4 3-3 6 6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
    undo: '<path d="M8 5 3 10l5 5M3 10h10a7 7 0 0 1 7 7"/>',
    redo: '<path d="m16 5 5 5-5 5m5-5H11a7 7 0 0 0-7 7"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  const buttonLabel = (button, name, label) => { button.innerHTML = `${icon(name)}<span>${label}</span>`; };

  // Reuse the existing controls and handlers, without keeping a second workflow.
  const actionPanel = document.querySelector('.run-card');
  sidebar.prepend(actionPanel);
  actionPanel.hidden = true;
  const quick = document.createElement('div');
  quick.className = 'flow-actions';
  quick.innerHTML = `<h2>Strumenti</h2><button type="button" data-flow-tool="edit-pdf">${icon('edit')}<span>Compila e firma<small>Testo, firma e disegno</small></span></button><button type="button" data-flow-tool="compress-scan">${icon('compress')}<span>Comprimi scansione<small>Riduci il peso del file</small></span></button><button type="button" data-flow-tool="pdf-to-jpg">${icon('image')}<span>Converti in immagini<small>Una JPG per ogni pagina</small></span></button><button id="flowAllTools" type="button">${icon('grid')}<span>Altri strumenti…</span></button>`;
  sidebar.prepend(quick);
  const fileDetails = document.createElement('details');
  fileDetails.className = 'flow-files';
  fileDetails.innerHTML = '<summary>File e impostazioni</summary>';
  fileDetails.append($('fileList'), $('clearQueue'));
  const sessionDetails = sidebar.querySelector(':scope > details');
  if (sessionDetails) fileDetails.append(sessionDetails);
  sidebar.append(fileDetails);
  $('workspace').hidden = true;
  $('gratis').hidden = true;
  $('editor').hidden = true;
  const pagesArea = host.querySelector('.ws-canvas-area');
  pagesArea.append($('editor'));
  const pageBar = document.createElement('div'); pageBar.className = 'ws-page-bar';
  pageBar.innerHTML = '<div><h2>Le tue pagine</h2><p>Seleziona per modificare. Trascina per riordinare.</p></div>';
  pageBar.append(host.querySelector('.ws-toolbar')); pagesArea.prepend(pageBar);
  const back = document.createElement('button'); back.id = 'flowBack'; back.type = 'button'; back.textContent = 'Torna alle pagine'; back.hidden = true;
  $('editor').prepend(back);
  function showPages() { $('editor').hidden = true; $('wsPages').hidden = false; back.hidden = true; host.classList.remove('flow-editing'); }
  back.onclick = showPages;
  window.addEventListener('pdfdelta-editor', () => {
    actionPanel.hidden = true;
    $('editor').hidden = false; $('wsPages').hidden = true; back.hidden = false; host.classList.add('flow-editing');
  });

  const picker = document.createElement('dialog'); picker.id = 'flowToolPicker';
  picker.setAttribute('aria-label', 'Scegli uno strumento');
  const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Chiudi'; close.className = 'flow-close'; close.onclick = () => picker.close();
  picker.append(close, $('strumenti')); document.body.append(picker);
  $('flowAllTools').onclick = () => { picker.showModal(); $('toolSearch').focus(); };
  quick.addEventListener('click', event => {
    const button = event.target.closest('[data-flow-tool]'); if (!button) return;
    bridge.selectTool(button.dataset.flowTool);
    if (button.dataset.flowTool === 'edit-pdf') void bridge.run();
  });
  window.addEventListener('pdfdelta-tool', event => {
    if (event.detail.automatic) return;
    if (event.detail.tool.id !== 'edit-pdf') showPages();
    picker.close();
    actionPanel.hidden = false;
    quick.querySelectorAll('[data-flow-tool]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.flowTool === event.detail.tool.id)));
    $('run-title').textContent = event.detail.tool.name;
    $('runTool').focus({ preventScroll: true });
  });
  document.querySelector('.nav-links').replaceChildren();
  document.querySelector('.header-actions > a').hidden = true;
  buttonLabel($('wsImport'), 'plus', 'Aggiungi file');
  buttonLabel($('wsExport'), 'download', 'Scarica PDF');
  buttonLabel($('wsUndo'), 'undo', 'Annulla'); buttonLabel($('wsRedo'), 'redo', 'Ripeti');
  for (const [id, label] of [['wsUndo', 'Annulla modifica'], ['wsRedo', 'Ripeti modifica']]) { $(id).setAttribute('aria-label', label); $(id).title = label; }
  $('editorSave').textContent = 'Applica modifiche';
  $('editor').querySelector('.section-head > p').textContent = 'Scrivi il testo o crea una firma. Puoi inserire la stessa firma in più punti del documento.';
  host.querySelector('.ws-kicker').textContent = 'Il tuo spazio PDF';
  host.querySelector('.ws-heading > div:first-child').append($('wsSummary'));
  const privacy = document.createElement('span'); privacy.className = 'local-badge'; privacy.innerHTML = `${icon('shield')}<span>I file restano sul tuo dispositivo</span>`;
  document.querySelector('.nav-links').append(privacy);
  const emptyUpload = document.createElement('button'); emptyUpload.id = 'flowOpen'; emptyUpload.type = 'button'; buttonLabel(emptyUpload, 'plus', 'Scegli file'); emptyUpload.onclick = () => $('wsFiles').click();
  $('wsDemo').before(emptyUpload);
  $('wsDemo').textContent = 'Oppure prova un documento di esempio';
  host.querySelector('.ws-paper-symbol').innerHTML = '<span>PDF</span><i></i><i></i><i></i>';
  $('wsEmpty').querySelector('h2').textContent = 'Inizia dal tuo documento.';
  $('wsEmpty').querySelector('p').textContent = 'Aggiungi un PDF, un’immagine o un file di testo. Poi scegli cosa fare, qui accanto.';
  $('wsFiles').accept = '.pdf,.jpg,.jpeg,.png,.txt';
  const home = createHome({
    onTool: tool => {
      intent = tool; home.hidden = true; host.hidden = false;
      if (bridge.getAllFiles().length) {
        intent = null; bridge.selectTool(tool.id);
        if (tool.id === 'edit-pdf') void bridge.run();
      } else {
        $('wsEmpty').querySelector('h2').textContent = tool.name;
        $('wsEmpty').querySelector('p').textContent = tool.description;
        $('wsFiles').accept = tool.accepts.map(type=>'.'+type).join(',');
        $('flowOpen').querySelector('span').textContent = tool.accepts.length === 1 && tool.accepts[0] === 'pdf' ? 'Seleziona PDF' : 'Seleziona file';
      }
      host.scrollIntoView({ block:'start', behavior:'instant' });
    },
    onUpload: () => { intent = null; $('wsFiles').accept = '.pdf,.jpg,.jpeg,.png,.txt'; $('wsFiles').click(); },
    onDemo: () => { intent = null; $('wsDemo').click(); },
    onResume: () => { home.hidden = true; host.hidden = false; host.scrollIntoView({ block:'start', behavior:'instant' }); }
  });
  host.before(home);
  const homeNav = document.createElement('button'); homeNav.type = 'button'; homeNav.className = 'home-nav'; homeNav.textContent = 'Tutti gli strumenti';
  homeNav.onclick = () => { if (bridge.isBusy() || workspace.isBusy()) return; intent=null; home.hidden=false; host.hidden=true; home.querySelector('#homeResume').hidden=!bridge.getAllFiles().length; home.scrollIntoView({ block:'start', behavior:'instant' }); };
  document.querySelector('.nav-links').prepend(homeNav);
  function receiveFiles(files) { bridge.addFiles(files); }
  $('wsFiles').addEventListener('change', event => {
    event.stopImmediatePropagation(); receiveFiles([...event.target.files]); event.target.value = '';
  }, true);
  host.addEventListener('drop', event => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault(); event.stopImmediatePropagation(); receiveFiles([...event.dataTransfer.files]);
  }, true);
  window.addEventListener('pdfdelta-demo', event => {
    lastFiles = [event.detail]; bridge.replaceFiles(lastFiles); update(lastFiles);
  });
  function update(files) {
    const loaded = files.length > 0;
    home.hidden = loaded || Boolean(intent); host.hidden = !loaded && !intent;
    home.querySelector('#homeResume').hidden = !loaded;
    host.classList.toggle('flow-loaded', loaded);
    pageBar.hidden = !workspace.getFiles().length;
    sidebar.hidden = !loaded;
    host.querySelector('.ws-toolbar').hidden = !workspace.getFiles().length;
    $('wsExport').hidden = !workspace.getFiles().length;
    if (!loaded) actionPanel.hidden = true;
    const primary = quick.querySelector('[data-flow-tool]');
    if (loaded && !files.some(file => /\.pdf$/i.test(file.name))) {
      $('wsEmpty').querySelector('h2').textContent = 'File pronti per la conversione.';
      $('wsEmpty').querySelector('p').textContent = 'Scegli uno strumento a sinistra per creare il tuo PDF.';
      primary.dataset.flowTool = files.some(file => /\.txt$/i.test(file.name)) ? 'text-to-pdf' : 'images-to-pdf';
      buttonLabel(primary, 'plus', 'Crea PDF');
      quick.querySelectorAll('[data-flow-tool]').forEach((button, index) => { button.hidden = index > 0; });
    } else {
      primary.dataset.flowTool = 'edit-pdf'; primary.innerHTML = `${icon('edit')}<span>Compila e firma<small>Testo, firma e disegno</small></span>`;
      quick.querySelectorAll('[data-flow-tool]').forEach(button => { button.hidden = false; });
      $('wsEmpty').querySelector('h2').textContent = 'Apri. Modifica. Fatto.';
      $('wsEmpty').querySelector('p').textContent = 'Trascina qui i tuoi documenti. Unisci pagine, compila e converti, tutto nello stesso spazio.';
    }
  }
  window.addEventListener('pdfdelta-files', event => {
    const files = event.detail;
    if (same(files, lastFiles)) return;
    const previous = lastFiles;
    lastFiles = [...files];
    pending = pending.then(async () => {
      const pdfs = files.filter(file => /\.pdf$/i.test(file.name));
      if (!pdfs.length) await workspace.clear();
      else if (!same(pdfs, workspace.getFiles())) {
        const current = workspace.getFiles();
        const append = current.length > 0 && current.every(file => pdfs.includes(file));
        const incoming = append ? pdfs.filter(file => !current.includes(file)) : pdfs;
        const success = !incoming.length || await workspace.open(incoming, !append);
        if (!success) { lastFiles = previous; bridge.replaceFiles(previous); update(previous); return; }
      }
      showPages(); update(files);
      if (intent && files.length) {
        const chosen = intent; intent = null; bridge.selectTool(chosen.id);
        if (chosen.id === 'edit-pdf') setTimeout(() => void bridge.run(), 0);
      }
    }).catch(error => workspace.status(error.message));
  });
  window.addEventListener('pdfdelta-history', event => {
    // The restored sources are already open. Refresh tool inputs without importing
    // them again, which would overwrite the restored page order and rotations.
    lastFiles = [...event.detail, ...bridge.getAllFiles().filter(file => !/\.pdf$/i.test(file.name))];
    bridge.replaceFiles(lastFiles);
    showPages(); update(lastFiles); actionPanel.hidden = true;
  });
  bridge.beforeRun = async tool => {
    await pending;
    if (!workspace.hasEdits() || !workspace.getFiles().length) return null;
    const separate = tool.minFiles > 1 && !['merge', 'merge-mixed'].includes(tool.id);
    const files = separate ? await workspace.materializeFiles() : [await workspace.materialize()];
    const prepared = [...files, ...bridge.getAllFiles().filter(f => !/\.pdf$/i.test(f.name))];
    if (separate && prepared.filter(file => tool.accepts.includes(file.name.split('.').pop().toLowerCase())).length < tool.minFiles) throw new Error('Aggiungi un altro file compatibile: questo strumento richiede documenti separati.');
    lastFiles = prepared;
    return lastFiles;
  };
  window.addEventListener('pdfdelta-output', event => {
    if (!event.detail.apply) return;
    const file = new File([event.detail.blob], event.detail.filename, { type: 'application/pdf' });
    pending = pending.then(async () => {
      while (bridge.isBusy()) await new Promise(resolve => setTimeout(resolve, 20));
      if (await workspace.open([file], true)) {
        lastFiles = [file]; bridge.replaceFiles(lastFiles); showPages(); update(lastFiles); actionPanel.hidden = true;
        workspace.status('Modifica applicata. Puoi continuare oppure scaricare il PDF.');
      }
    }).catch(error => workspace.status(error.message));
  });
  update(bridge.getAllFiles());
  const reflectBusy = () => {
    const busy = bridge.isBusy() || workspace.isBusy();
    host.setAttribute('aria-busy', String(busy));
    for (const panel of [home, quick, actionPanel, fileDetails, picker, $('editor')]) panel.inert = busy;
  };
  window.addEventListener('pdfdelta-busy', reflectBusy);
  window.addEventListener('pdfdelta-workspace-busy', reflectBusy);
  reflectBusy();
  host.dataset.flow = 'ready';
}
