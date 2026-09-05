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
    const result = await evaluate(`(async () => {
      const $ = id => document.getElementById(id);
      const until = async fn => { const end = Date.now() + 15000; while (!fn()) { if (Date.now() > end) throw new Error('Attesa scaduta: ' + fn); await new Promise(r => setTimeout(r, 50)); } };
      const assert = (value, label) => { if (!value) throw new Error(label); };
      await until(() => $('visualWorkspace').dataset.flow === 'ready');
      assert(getComputedStyle($('workspace')).display === 'none', 'No second upload workflow');
      assert(getComputedStyle($('wsContinue')).display === 'none', 'No manual bridge');
      assert(pdfjsLib.version === '6.3.289', 'PDF.js version');
      $('wsDemo').click();
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
      const transfer = new DataTransfer(); transfer.items.add(new File([await extra.save()], 'extra.pdf', { type: 'application/pdf' }));
      $('wsFiles').files = transfer.files; $('wsFiles').dispatchEvent(new Event('change'));
      await until(() => document.querySelectorAll('[data-page]').length === 4 && !$('wsExport').disabled);
      const output = new Promise(resolve => window.addEventListener('pdfdelta-output', e => resolve(e.detail.blob), { once: true }));
      $('wsExport').click(); const pdf = await PDFLib.PDFDocument.load(await (await output).arrayBuffer());
      if (pdf.getPageCount() !== 4 || pdf.getPage(0).getRotation().angle !== 90) throw new Error('Adding files lost existing edits');
      await until(() => !$('wsExport').disabled);
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
      const files = new DataTransfer(); files.items.add(new File([await rich.save()], 'rich.pdf', { type: 'application/pdf' }));
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
    })()`);
    await evaluate("document.getElementById('themeToggle').click()");
    fs.writeFileSync('dist/verification/workspace-dark.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await evaluate("document.getElementById('themeToggle').click()");
    await evaluate('navigator.serviceWorker.ready.then(() => true)');
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await send('Page.navigate', { url: site.origin + '/index.html#visualWorkspace' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await evaluate(`(async () => {
      const end = Date.now() + 15000;
      while (document.getElementById('visualWorkspace')?.dataset.flow !== 'ready') { if (Date.now() > end) throw new Error('Offline boot failed: ' + location.href + ' ' + document.body.innerText.slice(-600)); await new Promise(r => setTimeout(r, 50)); }
      await document.fonts.ready;
      if (!document.fonts.check('14px Manrope')) throw new Error('Offline font missing');
      document.getElementById('wsDemo').click();
      while (document.querySelectorAll('[data-page]').length !== 3 || document.getElementById('wsExport').disabled) { if (Date.now() > end) throw new Error('Offline PDF failed'); await new Promise(r => setTimeout(r, 50)); }
    })()`);
    if (errors.length || external.length) throw new Error(JSON.stringify({ errors, external }));
    console.log(JSON.stringify({ ok: true, ...result, offline: true, external, errors }));
  } finally { ws?.close(); chrome.kill(); site.server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
