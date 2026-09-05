// One input collection and one current document, shared by pages and tools.
export function initFlow(bridge, workspace) {
  const $ = id => document.getElementById(id);
  const host = $('visualWorkspace');
  const sidebar = host.querySelector('.ws-sidebar');
  const same = (a, b) => a.length === b.length && a.every((file, i) => file === b[i]);
  let lastFiles = [], pending = Promise.resolve();

  // Reuse the existing controls and handlers, without keeping a second workflow.
  const actionPanel = document.querySelector('.run-card');
  sidebar.prepend(actionPanel);
  actionPanel.hidden = true;
  const quick = document.createElement('div');
  quick.className = 'flow-actions';
  quick.innerHTML = '<h2>Cosa vuoi fare?</h2><button type="button" data-flow-tool="edit-pdf">Compila e firma</button><button type="button" data-flow-tool="compress-scan">Comprimi scansione</button><button type="button" data-flow-tool="pdf-to-jpg">Converti in immagini</button><button id="flowAllTools" type="button">Altri strumenti…</button>';
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
  const back = document.createElement('button'); back.id = 'flowBack'; back.type = 'button'; back.textContent = 'Torna alle pagine'; back.hidden = true;
  $('editor').prepend(back);
  function showPages() { $('editor').hidden = true; $('wsPages').hidden = false; back.hidden = true; host.classList.remove('flow-editing'); }
  back.onclick = showPages;
  window.addEventListener('pdfdelta-editor', () => {
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
    picker.close();
    actionPanel.hidden = false;
    $('run-title').textContent = event.detail.tool.name;
    $('runTool').focus({ preventScroll: true });
  });
  document.querySelector('.nav-links').replaceChildren();
  document.querySelector('.header-actions > a').hidden = true;
  $('wsImport').textContent = 'Aggiungi file';
  $('wsExport').textContent = 'Scarica PDF';
  $('editorSave').textContent = 'Applica modifiche';
  host.querySelector('.ws-kicker').textContent = '1. Apri i file   /   2. Modifica   /   3. Scarica';
  $('wsEmpty').querySelector('h2').textContent = 'Inizia dal tuo documento.';
  $('wsEmpty').querySelector('p').textContent = 'Aggiungi un PDF, un’immagine o un file di testo. Poi scegli cosa fare, qui accanto.';
  $('wsFiles').accept = '.pdf,.jpg,.jpeg,.png,.txt';
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
    host.classList.toggle('flow-loaded', loaded);
    sidebar.hidden = !loaded;
    host.querySelector('.ws-toolbar').hidden = !workspace.getFiles().length;
    $('wsExport').hidden = !workspace.getFiles().length;
    if (!loaded) actionPanel.hidden = true;
    const primary = quick.querySelector('[data-flow-tool]');
    if (loaded && !files.some(file => /\.pdf$/i.test(file.name))) {
      $('wsEmpty').querySelector('h2').textContent = 'File pronti per la conversione.';
      $('wsEmpty').querySelector('p').textContent = 'Scegli uno strumento a sinistra per creare il tuo PDF.';
      primary.dataset.flowTool = files.some(file => /\.txt$/i.test(file.name)) ? 'text-to-pdf' : 'images-to-pdf';
      primary.textContent = 'Crea PDF';
      quick.querySelectorAll('[data-flow-tool]').forEach((button, index) => { button.hidden = index > 0; });
    } else {
      primary.dataset.flowTool = 'edit-pdf'; primary.textContent = 'Compila e firma';
      quick.querySelectorAll('[data-flow-tool]').forEach(button => { button.hidden = false; });
      $('wsEmpty').querySelector('h2').textContent = 'Inizia dal tuo documento.';
      $('wsEmpty').querySelector('p').textContent = 'Aggiungi un PDF, un’immagine o un file di testo. Poi scegli cosa fare, qui accanto.';
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
    }).catch(error => workspace.status(error.message));
  });
  bridge.beforeRun = async tool => {
    await pending;
    if (!workspace.hasEdits() || !workspace.getFiles().length) return null;
    if (tool.minFiles > 1 && !['merge', 'merge-mixed'].includes(tool.id)) throw new Error('Questo strumento richiede documenti separati. Annulla le modifiche alle pagine prima di confrontarli.');
    const file = await workspace.materialize();
    lastFiles = [file, ...bridge.getAllFiles().filter(f => !/\.pdf$/i.test(f.name))];
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
  host.dataset.flow = 'ready';
}
