const { startStaticServer, cdpJson } = require('./verify-local.js');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

async function main() {
  const site = await startStaticServer();
  if (process.env.PDFDELTA_TEST_URL) site.origin = process.env.PDFDELTA_TEST_URL.replace(/\/$/, '');
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9246', `--user-data-dir=${path.join(os.tmpdir(), 'pdfdelta-workspace-' + Date.now())}`, 'about:blank'], { stdio: 'ignore' });
  let ws;
  try {
    const [page] = (await cdpJson('http://127.0.0.1:9246/json')).filter(p => p.type === 'page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0; const pending = new Map(), errors = [], external = [];
    ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
      if (msg.method === 'Network.requestWillBeSent' && /^https?:/.test(msg.params.request.url) && new URL(msg.params.request.url).origin !== new URL(site.origin).origin) external.push(msg.params.request.url);
      if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const key = ++id; const timer = setTimeout(() => { pending.delete(key); reject(new Error('Timeout: ' + method)); }, 45000);
      pending.set(key, msg => { clearTimeout(timer); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); });
      ws.send(JSON.stringify({ id: key, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: site.origin });
    await new Promise(resolve => setTimeout(resolve, 1500));
    fs.mkdirSync('dist/verification', { recursive: true });
    await evaluate(`(async () => { const end = Date.now() + 15000; while (document.getElementById('visualWorkspace')?.dataset.flow !== 'ready') { if (Date.now() > end) throw new Error('Flow startup'); await new Promise(r => setTimeout(r, 30)); } await document.fonts.ready; })()`);
    fs.writeFileSync('dist/verification/workspace-empty.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:false });
    if (await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')) throw new Error('Home mobile overflow');
    fs.writeFileSync('dist/verification/home-mobile.png', Buffer.from((await send('Page.captureScreenshot', { format:'png' })).data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width:1440, height:1050, deviceScaleFactor:1, mobile:false });
    const result = await evaluate(`(async () => {
      const $ = id => document.getElementById(id);
      const until = async fn => { const end = Date.now() + 15000; while (!fn()) { if (Date.now() > end) throw new Error('Attesa scaduta: ' + fn); await new Promise(r => setTimeout(r, 50)); } };
      const assert = (value, label) => { if (!value) throw new Error(label); };
      await until(() => $('visualWorkspace').dataset.flow === 'ready');
      assert(getComputedStyle($('workspace')).display === 'none', 'No second upload workflow');
      assert(getComputedStyle($('wsContinue')).display === 'none', 'No manual bridge');
      assert(pdfjsLib.version === '6.3.289', 'PDF.js version');
      assert(!$('toolHome').hidden && $('visualWorkspace').hidden, 'Home precedes empty workspace');
      assert(document.querySelectorAll('[data-home-tool]').length === 12, 'Popular tools visible');
      $('homeSearch').value = 'firma'; $('homeSearch').dispatchEvent(new Event('input'));
      assert(document.querySelector('[data-home-tool="edit-pdf"]'), 'Home search finds signature');
      document.querySelector('[data-home-tool="edit-pdf"]').click();
      assert($('toolHome').hidden && !$('visualWorkspace').hidden && $('wsEmpty').querySelector('h2').textContent === 'Compila e firma', 'Tool selection opens contextual upload');
      document.querySelector('.home-nav').click();
      $('homeSearch').value = ''; $('homeSearch').dispatchEvent(new Event('input'));
      $('homeDemo').click();
      await until(() => document.querySelectorAll('[data-page]').length === 3 && !$('wsExport').disabled);
      document.querySelector('[data-page]').click();
      document.querySelector('[data-edit="rotate"]').click();
      await until(() => document.querySelectorAll('[data-page]').length === 3);
      document.querySelector('[data-edit="right"]').click();
      await until(() => document.querySelectorAll('[data-page]').length === 3);
      $('wsUndo').click(); await until(() => document.querySelectorAll('[data-page]').length === 3);
      $('wsRedo').click(); await until(() => document.querySelectorAll('[data-page]').length === 3);
      const output = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail.blob), { once: true }));
      $('wsExport').click();
      const blob = await output;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const doc = await PDFLib.PDFDocument.load(bytes);
      assert(doc.getPageCount() === 3, 'Output page count');
      assert(doc.getPage(1).getRotation().angle === 90, 'Output rotation and order');
      const task = pdfjsLib.getDocument({ data: bytes.slice(), owner: 'workspace' }); const reader = await task.promise;
      const text = (await (await reader.getPage(2)).getTextContent()).items.map(i => i.str).join(' ');
      assert(text.includes('Proposta di progetto'), 'Output text preservation'); await task.destroy();
      await until(() => !$('wsExport').disabled);
      $('flowAllTools').click();
      document.querySelector('[data-tool="page-numbers"]').click();
      assert(!$('flowToolPicker').open, 'Picker closes after selection');
      $('runTool').click();
      await until(() => $('wsStatus').textContent.startsWith('Modifica applicata.'));
      assert($('wsSummary').textContent.startsWith('3 pagine'), 'Automatic result roundtrip');
      assert($('fileList').textContent.includes('pdfdelta-workspace'), 'Current edits passed to tool');
      let rejected = false;
      try { await PdfEngine.readEditable(new File(['not a pdf'], 'broken.pdf')); } catch { rejected = true; }
      assert(rejected, 'Malformed document rejection');
      const bad = new DataTransfer(); bad.items.add(new File(['invalid'], 'invalid.pdf'));
      $('wsFiles').files = bad.files; $('wsFiles').dispatchEvent(new Event('change'));
      await until(() => $('wsStatus').textContent.includes('non contiene'));
      await until(() => !$('wsExport').disabled);
      assert($('wsSummary').textContent.startsWith('3 pagine'), 'Failed import preserves session');
      const cancelled = new DataTransfer(); cancelled.items.add(new File([bytes], 'cancel.pdf', { type: 'application/pdf' }));
      const cancelObserver = new MutationObserver(() => { if (!$('wsCancel').hidden) { $('wsCancel').click(); cancelObserver.disconnect(); } });
      cancelObserver.observe($('wsCancel'), { attributes: true });
      $('wsFiles').files = cancelled.files; $('wsFiles').dispatchEvent(new Event('change'));
      await until(() => $('wsStatus').textContent.startsWith('Operazione annullata.'));
      await until(() => !$('wsExport').disabled);
      assert($('wsSummary').textContent.startsWith('3 pagine'), 'Cancelled import preserves session');
      document.getElementById('visualWorkspace').scrollIntoView();
      return { pages: doc.getPageCount(), rotation: doc.getPage(1).getRotation().angle, textPreserved: true, malformedRejected: rejected, version: pdfjsLib.version };
    })()`);
    fs.mkdirSync('dist/verification', { recursive: true });
    for (const [name, width, height] of [['desktop', 1440, 1050], ['wide', 1920, 1080], ['tablet', 768, 1024], ['mobile', 390, 844]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await evaluate('window.scrollTo(0, 0)');
      const overflow = await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth');
      if (overflow) throw new Error('Overflow ' + name);
      const layout = await evaluate(`(() => { const side = document.querySelector('.ws-sidebar').getBoundingClientRect(); const stage = document.querySelector('.ws-canvas-area'); const box = stage.getBoundingClientRect(); const page = document.querySelector('[data-page] canvas').getBoundingClientRect(); return { sideWidth:side.width, sideRight:side.right, stageLeft:box.left, pageHeight:page.height, columns:getComputedStyle(document.querySelector('.ws-pages')).gridTemplateColumns.split(' ').length, nestedScroll:stage.scrollHeight > stage.clientHeight + 1 && ['auto','scroll'].includes(getComputedStyle(stage).overflowY) }; })()`);
      if (width >= 768 && (layout.sideWidth > 280 || layout.sideRight > layout.stageLeft + 1 || layout.columns < 2)) throw new Error('Desktop columns collapsed: ' + name);
      if (width >= 1440 && layout.pageHeight < 260) throw new Error('Thumbnails too small: ' + name);
      if (layout.nestedScroll) throw new Error('Nested document scrollbar: ' + name);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`dist/verification/workspace-${name}.png`, Buffer.from(shot.data, 'base64'));
    }
    await evaluate(`(async () => {
      const $ = id => document.getElementById(id);
      const until = async fn => { const end = Date.now() + 15000; while (!fn()) { if (Date.now() > end) throw new Error('Mobile: ' + fn); await new Promise(r => setTimeout(r, 25)); } };
      document.querySelector('[data-page]').click(); document.querySelector('[data-edit="rotate"]').click();
      await until(() => document.querySelectorAll('[data-page]').length === 3);
      const extra = await PDFLib.PDFDocument.create(); extra.addPage([300, 400]);
      const { workspaceBridge } = await import('./app.js');
      let protectedTransitions = 0, transitionFailure;
      const probeTransition = event => {
        if (!event.detail) return;
        try {
          if (!$('flowAllTools').parentElement.inert || $('wsCancel').hidden) throw new Error('Import/export controls not protected or cancel unavailable');
          const before = workspaceBridge.getAllFiles();
          $('clearQueue').dispatchEvent(new MouseEvent('click', { bubbles: true }));
          document.querySelector('[data-edit="rotate"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
          workspaceBridge.addFiles([new File(['ignored'], 'ignored.txt')]);
          void workspaceBridge.run();
          if (workspaceBridge.isBusy() || workspaceBridge.getAllFiles().length !== before.length || !workspaceBridge.getAllFiles().every((file, i) => file === before[i])) throw new Error('Conflicting operation during import/export');
          protectedTransitions++;
        } catch (error) { transitionFailure = error.message; }
      };
      window.addEventListener('pdfdelta-workspace-busy', probeTransition);
      const transfer = new DataTransfer(); transfer.items.add(new File([await extra.save()], 'extra.pdf', { type: 'application/pdf' }));
      $('wsFiles').files = transfer.files; $('wsFiles').dispatchEvent(new Event('change'));
      await until(() => document.querySelectorAll('[data-page]').length === 4 && !$('wsExport').disabled);
      const output = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail.blob), { once: true }));
      $('wsExport').click(); const pdf = await PDFLib.PDFDocument.load(await (await output).arrayBuffer());
      if (pdf.getPageCount() !== 4 || pdf.getPage(0).getRotation().angle !== 90) throw new Error('Adding files lost existing edits');
      await until(() => !$('wsExport').disabled);
      window.removeEventListener('pdfdelta-workspace-busy', probeTransition);
      if (transitionFailure || protectedTransitions < 2 || $('flowAllTools').parentElement.inert) throw new Error(transitionFailure || 'Import/export transition coverage missing');
      document.querySelector('[data-flow-tool="edit-pdf"]').click();
      await until(() => !$('editor').hidden && $('editorInkCanvas').width > 0 && !$('runTool').disabled);
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth) throw new Error('Mobile editor overflow');
      $('flowBack').click();
      if (!$('editor').hidden || $('wsPages').hidden) throw new Error('Return to pages failed');
    })()`);
    await evaluate(`(async () => {
      const $ = id => document.getElementById(id);
      const until = async fn => { const end = Date.now() + 15000; while (!fn()) { if (Date.now() > end) throw new Error('Document preservation timeout'); await new Promise(r => setTimeout(r, 25)); } };
      $('clearQueue').click(); await until(() => $('wsSummary').textContent.startsWith('0 pagine'));
      const rich = await PDFLib.PDFDocument.create(); const page = rich.addPage([300, 400]);
      const field = rich.getForm().createTextField('nome'); field.setText('Nome di prova'); field.addToPage(page, { x: 20, y: 100, width: 200, height: 30 });
      await rich.attach(new TextEncoder().encode('allegato conservato'), 'note.txt');
      const initialRichBytes = await rich.save();
      const originalLoader = pdfjsLib.getDocument, retainedTasks = [], destroyedTasks = new Set();
      pdfjsLib.getDocument = options => {
        const task = originalLoader(options);
        if (options.owner === 'workspace') {
          retainedTasks.push(task); const destroy = task.destroy.bind(task);
          task.destroy = async () => { destroyedTasks.add(task); return destroy(); };
        }
        return task;
      };
      const files = new DataTransfer(); files.items.add(new File([initialRichBytes], 'rich.pdf', { type: 'application/pdf' }));
      $('wsFiles').files = files.files; $('wsFiles').dispatchEvent(new Event('change'));
      await until(() => document.querySelectorAll('[data-page]').length === 1 && !$('wsExport').disabled);
      $('flowAllTools').click(); document.querySelector('[data-tool="set-metadata"]').click();
      document.querySelector('[data-option="title"]').value = 'Titolo conservato';
      const applied = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail.blob), { once: true }));
      $('runTool').click(); const appliedBytes = new Uint8Array(await (await applied).arrayBuffer());
      await until(() => $('wsStatus').textContent.startsWith('Modifica applicata.') && !$('wsExport').disabled);
      const exported = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail.blob), { once: true }));
      $('wsExport').click(); const saved = new Uint8Array(await (await exported).arrayBuffer());
      if (saved.length !== appliedBytes.length || !saved.every((byte, i) => byte === appliedBytes[i])) throw new Error('Unedited result was rewritten during export');
      const finalDoc = await PDFLib.PDFDocument.load(saved);
      if (finalDoc.getTitle() !== 'Titolo conservato' || finalDoc.getForm().getFields().length !== 1) throw new Error('Metadata or forms lost on final download');
      const task = pdfjsLib.getDocument({ data: saved.slice(), owner: 'workspace' });
      try { if ((await (await task.promise).getAttachments())?.size !== 1) throw new Error('Attachment lost on final download'); } finally { await task.destroy(); }
      await until(() => !$('wsExport').disabled); $('wsUndo').click();
      const { workspaceBridge } = await import('./app.js');
      if (workspaceBridge.getFiles()[0]?.name !== 'rich.pdf' || !$('fileList').textContent.includes('rich.pdf')) throw new Error('Undo left stale tool inputs');
      $('wsRedo').click();
      if (workspaceBridge.getFiles()[0]?.name === 'rich.pdf') throw new Error('Redo did not restore tool inputs');
      $('visualWorkspace').dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
      if (workspaceBridge.getFiles()[0]?.name !== 'rich.pdf') throw new Error('Keyboard undo left stale tool inputs');
      const restored = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail.blob), { once: true }));
      $('wsExport').click(); const restoredBytes = new Uint8Array(await (await restored).arrayBuffer());
      if (restoredBytes.length !== initialRichBytes.length || !restoredBytes.every((byte, i) => byte === initialRichBytes[i])) throw new Error('Undo did not restore the complete original document');
      await until(() => !$('wsExport').disabled);
      $('flowAllTools').click(); document.querySelector('[data-tool="page-numbers"]').click(); $('runTool').click();
      await until(() => $('wsStatus').textContent.startsWith('Modifica applicata.') && !$('wsExport').disabled);
      await until(() => destroyedTasks.has(retainedTasks[1]));
      if (destroyedTasks.has(retainedTasks[0])) throw new Error('Released a document still needed by undo');
      pdfjsLib.getDocument = originalLoader;
    })()`);
    await evaluate(`(async () => {
      const $ = id => document.getElementById(id);
      const until = async fn => { const end = Date.now() + 15000; while (!fn()) { if (Date.now() > end) throw new Error('Multi-document timeout: ' + fn); await new Promise(r => setTimeout(r, 30)); } };
      const { workspaceBridge } = await import('./app.js');
      const files = [];
      for (const name of ['Versione-A', 'Versione-B']) {
        const doc = await PDFLib.PDFDocument.create(); doc.addPage().drawText(name); doc.addPage().drawText(name + ' fine');
        files.push(new File([await doc.save()], name + '.pdf', { type: 'application/pdf' }));
      }
      workspaceBridge.replaceFiles(files);
      await until(() => document.querySelectorAll('[data-page]').length === 4 && !$('wsExport').disabled);
      document.querySelector('[data-page]').click(); document.querySelector('[data-edit="rotate"]').click();
      const originalBeforeRun = workspaceBridge.beforeRun;
      let checked = false, release;
      const gate = new Promise(resolve => { release = resolve; });
      workspaceBridge.beforeRun = async tool => {
        await gate;
        const prepared = await originalBeforeRun(tool);
        if (prepared?.length !== 2 || prepared[0].name !== files[0].name || prepared[1] !== files[1]) throw new Error('Comparison inputs were merged or an untouched document was rewritten');
        const edited = await PDFLib.PDFDocument.load(await prepared[0].arrayBuffer());
        if (edited.getPageCount() !== 2 || edited.getPage(0).getRotation().angle !== 90) throw new Error('Comparison lost edited pages');
        checked = true; return prepared;
      };
      workspaceBridge.selectTool('compare-visual');
      const output = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail), { once: true }));
      const running = workspaceBridge.run();
      await until(() => workspaceBridge.isBusy());
      if (!$('wsExport').disabled || !$('wsImport').disabled || !$('flowAllTools').parentElement.inert || $('visualWorkspace').getAttribute('aria-busy') !== 'true') throw new Error('Busy controls remain active');
      $('clearQueue').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.querySelector('[data-remove-file]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.querySelector('[data-edit="rotate"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      workspaceBridge.selectTool('page-numbers');
      workspaceBridge.addFiles([new File(['unwanted'], 'extra.txt')]);
      if (workspaceBridge.getAllFiles().length !== 2) throw new Error('Inputs changed while busy');
      release(); await running;
      if (!checked) throw new Error('Comparison preparation failed: ' + $('resultPanel')?.textContent);
      const report = await output;
      if (!report.filename.endsWith('.html') || !(await report.blob.text()).includes('Versione-A')) throw new Error('Comparison report missing');
      workspaceBridge.beforeRun = originalBeforeRun;
      if ($('flowAllTools').parentElement.inert || $('visualWorkspace').getAttribute('aria-busy') !== 'false') throw new Error('Controls not restored after completion');
      workspaceBridge.beforeRun = async () => { throw new Error('Errore di prova controllato'); };
      await workspaceBridge.run();
      if (workspaceBridge.isBusy() || $('wsExport').disabled || $('flowAllTools').parentElement.inert) throw new Error('Controls not restored after failure');
      workspaceBridge.beforeRun = originalBeforeRun;
    })()`);
    await evaluate(`(async () => {
      const $ = id => document.getElementById(id);
      const until = async fn => { const end = Date.now() + 20000; while (!fn()) { if (Date.now() > end) throw new Error('Long document: ' + fn); await new Promise(r => setTimeout(r, 20)); } };
      const { workspaceBridge } = await import('./app.js');
      const doc = await PDFLib.PDFDocument.create();
      for (let i = 0; i < 120; i++) doc.addPage([300, 400]).drawText('Page ' + (i + 1));
      const original = new File([await doc.save()], '120-pagine.pdf', { type: 'application/pdf' });
      workspaceBridge.replaceFiles([original]);
      await until(() => $('wsSummary').textContent.startsWith('120 pagine') && !$('wsExport').disabled);
      if (document.querySelectorAll('[data-page]').length !== 60 || $('wsMore').hidden) throw new Error('Initial long-document preview is not bounded');
      let outputs = 0;
      const count = () => { outputs++; }; window.addEventListener('pdfdelta-output', count);
      const cancelImmediately = event => { if (event.detail) $('wsCancel').click(); };
      window.addEventListener('pdfdelta-workspace-busy', cancelImmediately);
      $('wsExport').click();
      await until(() => !$('wsExport').disabled);
      window.removeEventListener('pdfdelta-workspace-busy', cancelImmediately);
      if (outputs || !$('wsStatus').textContent.includes('annullata')) throw new Error('Cancelled passthrough still downloaded');
      document.querySelector('[data-page]').click(); document.querySelector('[data-edit="rotate"]').click();
      const cancelProgress = new MutationObserver(() => { if ($('wsStatus').textContent.startsWith('Preparazione pagina 11 ')) $('wsCancel').click(); });
      cancelProgress.observe($('wsStatus'), { childList: true });
      $('wsExport').click(); await until(() => !$('wsExport').disabled); cancelProgress.disconnect();
      if (outputs || !$('wsStatus').textContent.includes('annullata') || !$('wsSummary').textContent.startsWith('120 pagine')) throw new Error('Cancelled rebuild changed the document or downloaded');
      window.removeEventListener('pdfdelta-output', count);
      const output = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail.blob), { once: true }));
      $('wsExport').click(); const bytes = await (await output).arrayBuffer();
      const saved = await PDFLib.PDFDocument.load(bytes);
      if (saved.getPageCount() !== 120 || saved.getPage(0).getRotation().angle !== 90) throw new Error('Retry lost pages or rotation');
      const task = pdfjsLib.getDocument({ data: new Uint8Array(bytes), owner: 'workspace' });
      try {
        const reader = await task.promise;
        for (const number of [1, 60, 120]) if (!(await (await reader.getPage(number)).getTextContent()).items.some(item => item.str === 'Page ' + number)) throw new Error('Long export text/order corrupted');
      } finally { await task.destroy(); }
      await until(() => !$('wsExport').disabled);
      $('wsMore').click(); await until(() => document.querySelectorAll('[data-page]').length === 120);
      if (!$('wsMore').hidden) throw new Error('Long preview pagination failed');
      const oversized = await PDFLib.PDFDocument.create();
      for (let i = 0; i < 1001; i++) oversized.addPage([100, 100]);
      workspaceBridge.replaceFiles([new File([await oversized.save()], 'troppo-lungo.pdf', { type: 'application/pdf' })]);
      await until(() => $('wsStatus').textContent.includes('1000 pagine') && !$('wsExport').disabled);
      if (!$('wsSummary').textContent.startsWith('120 pagine') || workspaceBridge.getFiles()[0] !== original) throw new Error('Rejected page-limit import replaced current document');
    })()`);
    await evaluate(`(async () => {
      const $ = id => document.getElementById(id);
      const until = async fn => { const end = Date.now() + 20000; while (!fn()) { if (Date.now() > end) throw new Error('Raster limit: ' + fn); await new Promise(r => setTimeout(r, 30)); } };
      const { workspaceBridge } = await import('./app.js');
      const scan = document.createElement('canvas'); scan.width = 2480; scan.height = 3508;
      const ctx = scan.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, scan.width, scan.height);
      ctx.fillStyle = '#152844'; ctx.fillRect(600, 900, 1280, 1700);
      const blob = await new Promise(resolve => scan.toBlob(resolve, 'image/jpeg', .9));
      const doc = await PDFLib.PDFDocument.create();
      const jpg = await doc.embedJpg(await blob.arrayBuffer());
      doc.addPage([14400, 14400]).drawImage(jpg, { x: 0, y: 0, width: 14400, height: 14400 });
      scan.width = scan.height = 0;
      workspaceBridge.replaceFiles([new File([await doc.save()], 'scansione-grande.pdf', { type: 'application/pdf' })]);
      await until(() => $('wsTitle').textContent === 'scansione-grande.pdf' && !$('wsExport').disabled);
      const normal = PdfEngine.viewportAtScale({ rotate: 0, getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }) }, 2);
      if (normal.width !== 1200 || normal.height !== 1600) throw new Error('Normal resolution changed');
      const strip = PdfEngine.viewportAtScale({ rotate: 0, getViewport: ({ scale }) => ({ width: 100000 * scale, height: 10 * scale }) }, 2);
      if (Math.ceil(strip.width) > 8192 || Math.ceil(strip.width) * Math.ceil(strip.height) > 16000000) throw new Error('Extreme aspect ratio exceeds raster limit');
      const originalViewport = PdfEngine.viewportAtScale; let largest = 0;
      PdfEngine.viewportAtScale = (...args) => { const v = originalViewport(...args); largest = Math.max(largest, Math.ceil(v.width) * Math.ceil(v.height)); return v; };
      workspaceBridge.selectTool('compress-scan');
      const output = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail.blob), { once: true }));
      await workspaceBridge.run(); const bytes = await (await output).arrayBuffer();
      PdfEngine.viewportAtScale = originalViewport;
      if (largest > 16000000 || largest < 15000000) throw new Error('Tool did not use the shared raster cap');
      const saved = await PDFLib.PDFDocument.load(bytes);
      if (saved.getPage(0).getWidth() !== 14400 || saved.getPage(0).getHeight() !== 14400) throw new Error('Raster cap changed physical page size');
      const task = pdfjsLib.getDocument({ data: new Uint8Array(bytes), owner: 'workspace' });
      try {
        const page = await (await task.promise).getPage(1), viewport = PdfEngine.viewportFor(page, 200);
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d'); await page.render({ canvasContext: context, viewport }).promise;
        const pixel = context.getImageData(100, 100, 1, 1).data;
        if (pixel[0] > 50 || pixel[2] < 40 || pixel[3] !== 255) throw new Error('Large scan output is blank or corrupted');
      } finally { await task.destroy(); }
      await until(() => !$('wsExport').disabled);
    })()`);
    await evaluate(`(async () => {
      const $ = id => document.getElementById(id);
      const until = async fn => { const end = Date.now() + 20000; while (!fn()) { if (Date.now() > end) throw new Error('Long JPG: ' + fn); await new Promise(r => setTimeout(r, 30)); } };
      const { workspaceBridge } = await import('./app.js');
      const huge = await PDFLib.PDFDocument.create(); huge.addPage([14400, 14400]); huge.addPage([14400, 14400]);
      workspaceBridge.replaceFiles([new File([await huge.save()], 'troppo-grande.jpg.pdf', { type: 'application/pdf' })]);
      await until(() => $('wsTitle').textContent === 'troppo-grande.jpg.pdf' && !$('wsExport').disabled);
      workspaceBridge.selectTool('pdf-to-long-jpg');
      const originalContext = HTMLCanvasElement.prototype.getContext; let rasterized = 0, outputs = 0;
      HTMLCanvasElement.prototype.getContext = function(type, options) { if (options?.willReadFrequently) rasterized++; return originalContext.call(this, type, options); };
      const count = () => { outputs++; }; window.addEventListener('pdfdelta-output', count);
      await workspaceBridge.run();
      HTMLCanvasElement.prototype.getContext = originalContext; window.removeEventListener('pdfdelta-output', count);
      if (rasterized || outputs || !$('resultPanel').textContent.includes('immagine per pagina')) throw new Error('Oversized long image not rejected before raster allocation');
      const doc = await PDFLib.PDFDocument.create();
      doc.addPage([300, 400]).drawRectangle({ x: 0, y: 0, width: 300, height: 400, color: PDFLib.rgb(1, 0, 0) });
      doc.addPage([600, 200]).drawRectangle({ x: 0, y: 0, width: 600, height: 200, color: PDFLib.rgb(0, 0, 1) });
      workspaceBridge.replaceFiles([new File([await doc.save()], 'due-colori.pdf', { type: 'application/pdf' })]);
      await until(() => $('wsTitle').textContent === 'due-colori.pdf' && !$('wsExport').disabled);
      workspaceBridge.selectTool('pdf-to-long-jpg');
      const output = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail.blob), { once: true }));
      await workspaceBridge.run(); const bitmap = await createImageBitmap(await output);
      if (bitmap.width !== 600 || bitmap.height !== 618) throw new Error('Long JPG dimensions wrong');
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
      const first = ctx.getImageData(300, 200, 1, 1).data, second = ctx.getImageData(300, 518, 1, 1).data, margin = ctx.getImageData(30, 200, 1, 1).data;
      if (first[0] < 240 || second[2] < 240 || margin[0] < 240 || margin[1] < 240) throw new Error('Long JPG order, centering or content wrong');
    })()`);
    await evaluate(`(async () => {
      const { workspaceBridge } = await import('./app.js');
      const $ = id => document.getElementById(id);
      const until = async predicate => { const end=Date.now()+10000; while (!predicate()) { if(Date.now()>end) throw new Error('Rotated editor timeout'); await new Promise(r=>setTimeout(r,20)); } };
      const doc = await PDFLib.PDFDocument.create();
      for (const angle of [0,90,180,270]) { const p=doc.addPage([400,500]); p.setCropBox(20,30,300,400); p.setRotation(PDFLib.degrees(angle)); }
      workspaceBridge.replaceFiles([new File([await doc.save()], 'rotazioni-editor.pdf', {type:'application/pdf'})]);
      await until(() => $('wsTitle').textContent==='rotazioni-editor.pdf' && !$('wsExport').disabled);
      workspaceBridge.selectTool('edit-pdf'); await workspaceBridge.run();
      document.querySelector('[data-editor-mode="text"]').click(); $('editorTextInput').value='Orientamento';
      for (let n=1;n<=4;n++) {
        await until(() => $('editorPageInfo').textContent===n+' / 4');
        const r=$('editorInkCanvas').getBoundingClientRect();
        $('editorInkCanvas').dispatchEvent(new PointerEvent('pointerdown',{clientX:r.x+r.width*.25,clientY:r.y+r.height*.35,bubbles:true}));
        if(n<4) $('editorNext').click();
      }
      const output=new Promise(resolve=>window.addEventListener('pdfdelta-output',e=>resolve(e.detail.blob),{once:true}));
      $('editorSave').click();
      const task=pdfjsLib.getDocument({data:new Uint8Array(await (await output).arrayBuffer()),owner:'workspace'});
      try {
        const pdf=await task.promise;
        for(let n=1;n<=4;n++) {
          const page=await pdf.getPage(n), viewport=page.getViewport({scale:1});
          const item=(await page.getTextContent()).items.find(i=>i.str==='Orientamento');
          if(!item) throw new Error('Rotated annotation missing');
          const m=pdfjsLib.Util.transform(viewport.transform,item.transform);
          if(Math.abs(m[4]-viewport.width*.25)>1 || Math.abs(m[5]-viewport.height*.35)>1 || m[0]<=0 || Math.abs(m[1])>.01) throw new Error('Annotation moved or rotated on page '+n);
        }
      } finally { await task.destroy(); }
      await until(() => $('wsTitle').textContent==='rotazioni-editor-compilato-firmato.pdf' && !$('wsExport').disabled);
    })()`);
    const padRect = await evaluate(`(async () => {
      const { workspaceBridge } = await import('./app.js');
      const doc = await PDFLib.PDFDocument.create(); doc.addPage([600, 800]); doc.addPage([600, 800]);
      workspaceBridge.replaceFiles([new File([await doc.save()], 'firma-test.pdf', { type: 'application/pdf' })]);
      const end = Date.now() + 15000; while (document.getElementById('wsTitle').textContent !== 'firma-test.pdf' || document.getElementById('wsExport').disabled) { if (Date.now() > end) throw new Error('Signature input'); await new Promise(r => setTimeout(r, 30)); }
      workspaceBridge.selectTool('edit-pdf'); await workspaceBridge.run();
      document.getElementById('signatureDraw').click(); document.getElementById('signaturePad').scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = document.getElementById('signaturePad').getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height };
    })()`);
    await send('Input.dispatchMouseEvent', { type:'mousePressed', x:padRect.x+20, y:padRect.y+40, button:'left', clickCount:1 });
    for (const [x,y] of [[40,15],[60,65],[90,30],[130,50]]) await send('Input.dispatchMouseEvent', { type:'mouseMoved', x:padRect.x+x, y:padRect.y+y, button:'left', buttons:1 });
    await send('Input.dispatchMouseEvent', { type:'mouseReleased', x:padRect.x+130, y:padRect.y+50, button:'left', clickCount:1 });
    fs.writeFileSync('dist/verification/signature-pad-mobile.png', Buffer.from((await send('Page.captureScreenshot', { format:'png' })).data, 'base64'));
    await evaluate(`(async () => {
      const $ = id => document.getElementById(id);
      if ($('signaturePadUse').disabled) throw new Error('Drawn signature not captured');
      $('signaturePadUse').click();
      const place = (x,y) => { const r = $('editorInkCanvas').getBoundingClientRect(); $('editorInkCanvas').dispatchEvent(new PointerEvent('pointerdown', { clientX:r.x+r.width*x, clientY:r.y+r.height*y, bubbles:true })); };
      place(.1,.35); place(.5,.55);
      if ($('editorUndoInsertion').disabled) throw new Error('Undo insertion unavailable');
      await $('editorUndoInsertion').onclick();
      $('signatureSize').value = '240'; place(.99,.99);
      document.querySelector('[data-editor-mode="signature"]').click(); $('editorTextInput').value = 'Firma test';
      for (const [i,font] of ['TimesRomanItalic','HelveticaOblique','CourierOblique'].entries()) { $('signatureFont').value = font; place(.1,.1+i*.08); }
      $('editorNext').click();
      const end = Date.now()+10000; while ($('editorPageInfo').textContent !== '2 / 2') { if (Date.now()>end) throw new Error('Signature page navigation'); await new Promise(r=>setTimeout(r,20)); }
      $('editorPrev').click(); $('editorNext').click();
      for (let i=0;i<12;i++) window.dispatchEvent(new Event('resize'));
      const settled = Date.now()+10000;
      while ($('editorPageInfo').textContent !== '2 / 2') { if (Date.now()>settled) throw new Error('Latest editor preview did not settle'); await new Promise(r=>setTimeout(r,20)); }
      if ($('pdfEditorCanvas').width > 920 || $('pdfEditorCanvas').width * $('pdfEditorCanvas').height > PdfEngine.limits.canvasPixels) throw new Error('Editor preview exceeds render budget');
      $('signatureDraw').click(); $('signaturePadUse').click(); place(.2,.4);
      const { workspaceBridge } = await import('./app.js');
      const originalLoad = PDFLib.PDFDocument.load;
      PDFLib.PDFDocument.load = async () => { throw new Error('Errore salvataggio simulato'); };
      $('editorSave').click();
      while (workspaceBridge.isBusy()) await new Promise(r=>setTimeout(r,10));
      if ($('editorSave').disabled || $('editor').inert || !document.body.textContent.includes('Errore salvataggio simulato')) throw new Error('Editor cannot retry after save failure');
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      PDFLib.PDFDocument.load = async (...args) => { await gate; return originalLoad.apply(PDFLib.PDFDocument, args); };
      const output = new Promise(resolve => window.addEventListener('pdfdelta-output', e=>resolve(e.detail.blob), { once:true }));
      $('editorSave').click();
      if (!workspaceBridge.isBusy() || !$('editor').inert || !$('editorSave').disabled) throw new Error('Editor save does not lock workspace');
      // A synthetic click bypasses inert: the exported snapshot must still retain the drawing.
      $('editorClear').click();
      release();
      const saved = await output;
      PDFLib.PDFDocument.load = originalLoad;
      while (workspaceBridge.isBusy()) await new Promise(r=>setTimeout(r,10));
      if ($('editor').inert || $('editorSave').disabled) throw new Error('Editor remains locked after save');
      const task = pdfjsLib.getDocument({ data:new Uint8Array(await saved.arrayBuffer()), owner:'workspace' });
      try { const pdf = await task.promise, page = await pdf.getPage(1); const text = await page.getTextContent();
        if (new Set(text.items.filter(i=>i.str==='Firma test').map(i=>i.fontName)).size !== 3) throw new Error('Signature font styles lost in PDF');
        for (const number of [1,2]) { const ops = await (await pdf.getPage(number)).getOperatorList(); if (ops.fnArray.filter(op=>op===pdfjsLib.OPS.constructPath).length < 4) throw new Error('Reusable signature missing from PDF page '+number); }
        const viewport = page.getViewport({ scale:1 });
        const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d'); await page.render({ canvasContext:ctx, viewport }).promise;
        const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let bottomInk=0, erasedInk=0;
        for (let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
          const i=(y*canvas.width+x)*4, ink=pixels[i]<100 && pixels[i+2]>40;
          if (ink && (x===0 || y===0 || x===canvas.width-1 || y===canvas.height-1)) throw new Error('Signature clipped at page edge');
          if (ink && y>700) bottomInk++;
          if (ink && x>300 && x<465 && y>440 && y<510) erasedInk++;
        }
        if (!bottomInk || erasedInk) throw new Error('Signature size/undo/edge placement failed');
      } finally { await task.destroy(); }
    })()`);
    await evaluate("document.getElementById('themeToggle').click()");
    fs.writeFileSync('dist/verification/workspace-dark.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await evaluate("document.getElementById('themeToggle').click()");
    await evaluate('navigator.serviceWorker.ready.then(() => true)');
    await evaluate(`(async () => {
      const { initAccount } = await import('./account.mjs');
      const { accountConfig } = await import('./account-config.mjs');
      const { workspaceBridge } = await import('./app.js');
      if (!document.querySelector('.account-open')) await initAccount(workspaceBridge, { ...accountConfig, enabled: true });
      document.querySelector('.account-open').click();
      document.querySelector('.account-login').click();
      if (!document.querySelector('.account-status').textContent.includes('Scarica il documento')) throw new Error('OAuth must not discard an open PDF');
    })()`);
    await send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:true });
    fs.writeFileSync('dist/verification/account-mobile.png', Buffer.from((await send('Page.captureScreenshot', { format:'png' })).data, 'base64'));
    await evaluate("document.querySelector('.account-close').click()");
    await evaluate(`(async () => {
      const { createPreferenceSync, createPreferenceJournal } = await import('./account-preferences.mjs');
      const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { theme:'light', favorites:[] } }) }) }), upsert: async () => ({ error: new Error('offline fixture') }) }) };
      const sync = createPreferenceSync(client, new Set(['split']), () => {}, createPreferenceJournal(localStorage));
      await sync.connect('browser-recovery-test', { theme:'light', favorites:[] }, () => {});
      await sync.save({ theme:'dark', favorites:['split'], pdf:'must-not-persist' });
    })()`);
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await send('Page.navigate', { url: site.origin + '/index.html#visualWorkspace' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await evaluate(`(async () => {
      const end = Date.now() + 15000;
      while (document.getElementById('visualWorkspace')?.dataset.flow !== 'ready') { if (Date.now() > end) throw new Error('Offline boot failed: ' + location.href + ' ' + document.body.innerText.slice(-600)); await new Promise(r => setTimeout(r, 50)); }
      await document.fonts.ready;
      if (!document.fonts.check('14px Manrope')) throw new Error('Offline font missing');
      const { createPreferenceSync, createPreferenceJournal } = await import('./account-preferences.mjs');
      const journal = createPreferenceJournal(localStorage);
      if ('pdf' in journal.read('browser-recovery-test').preferences) throw new Error('Unexpected persisted document field');
      let saved, applied;
      const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data:{ theme:'light', favorites:[] } }) }) }), upsert: async row => { saved = row; return {}; } }) };
      const sync = createPreferenceSync(client, new Set(['split']), () => {}, journal);
      await sync.connect('browser-recovery-test', { theme:'light', favorites:[] }, value => { applied = value; });
      if (applied?.theme !== 'dark' || saved?.favorites[0] !== 'split' || journal.read('browser-recovery-test')) throw new Error('Preference recovery after actual navigation failed');
      document.getElementById('wsDemo').click();
      while (document.querySelectorAll('[data-page]').length !== 3 || document.getElementById('wsExport').disabled) { if (Date.now() > end) throw new Error('Offline PDF failed'); await new Promise(r => setTimeout(r, 50)); }
    })()`);
    if (errors.length || external.length) throw new Error(JSON.stringify({ errors, external }));
    console.log(JSON.stringify({ ok: true, ...result, offline: true, external, errors }));
  } finally { ws?.close(); chrome.kill(); site.server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
