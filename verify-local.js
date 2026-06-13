const { spawn } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const userData = path.join(os.tmpdir(), `pdfdelta-verify-${Date.now()}`);
const port = 9245;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cdpJson(url) {
  for (let index = 0; index < 50; index += 1) {
    try {
      return await (await fetch(url)).json();
    } catch {
      await wait(150);
    }
  }
  throw new Error("Chrome DevTools Protocol non disponibile.");
}

async function main() {
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userData}`,
      "--window-size=1280,950",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  try {
    const pages = await cdpJson(`http://127.0.0.1:${port}/json`);
    const page = pages.find((item) => item.type === "page") || pages[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    const pending = new Map();
    const requests = [];
    let id = 0;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Network.requestWillBeSent") {
        requests.push(message.params.request.url);
      }
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    };

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const messageId = ++id;
        pending.set(messageId, resolve);
        ws.send(JSON.stringify({ id: messageId, method, params }));
      });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Page.navigate", { url: "http://127.0.0.1:4173/?verify=local" });
    await wait(1800);

    const expression = `async () => {
      async function makePdf(text) {
        const doc = await PDFLib.PDFDocument.create();
        const page = doc.addPage([300, 200]);
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        page.drawText(text, { x: 32, y: 100, size: 18, font });
        return await doc.save();
      }

      async function makeDuplicatePdf() {
        const doc = await PDFLib.PDFDocument.create();
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        for (let i = 0; i < 2; i += 1) {
          const page = doc.addPage([300, 200]);
          page.drawText('Duplicata', { x: 32, y: 100, size: 18, font });
        }
        return await doc.save();
      }

      async function makeMultiPagePdf() {
        const doc = await PDFLib.PDFDocument.create();
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        for (let i = 1; i <= 3; i += 1) {
          const page = doc.addPage([300, 200]);
          page.drawText('Pagina ' + i, { x: 32, y: 100, size: 18, font });
        }
        return await doc.save();
      }

      async function makeMixedOrientationPdf() {
        const doc = await PDFLib.PDFDocument.create();
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        const portrait = doc.addPage([300, 420]);
        portrait.drawText('Verticale', { x: 32, y: 210, size: 18, font });
        const landscape = doc.addPage([420, 300]);
        landscape.drawText('Orizzontale', { x: 32, y: 150, size: 18, font });
        return await doc.save();
      }

      async function makeMixedSizePdf() {
        const doc = await PDFLib.PDFDocument.create();
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        const a4 = doc.addPage([595.28, 841.89]);
        a4.drawText('A4 page', { x: 48, y: 760, size: 18, font });
        const letter = doc.addPage([612, 792]);
        letter.drawText('Letter page', { x: 48, y: 720, size: 18, font });
        return await doc.save();
      }

      async function makeSearchPdf() {
        const doc = await PDFLib.PDFDocument.create();
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        const match = doc.addPage([300, 200]);
        match.drawText('FindMe target', { x: 32, y: 100, size: 18, font });
        const keep = doc.addPage([300, 200]);
        keep.drawText('Keep this page', { x: 32, y: 100, size: 18, font });
        return await doc.save();
      }

      async function makeTextSplitPdf() {
        const doc = await PDFLib.PDFDocument.create();
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        ['Invoice Alpha', 'Alpha details', 'Invoice Beta', 'Beta details'].forEach((text) => {
          const page = doc.addPage([300, 200]);
          page.drawText(text, { x: 32, y: 100, size: 18, font });
        });
        return await doc.save();
      }

      async function makeBlankSeparatorPdf() {
        const doc = await PDFLib.PDFDocument.create();
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        const first = doc.addPage([300, 200]);
        first.drawText('Primo blocco', { x: 32, y: 100, size: 18, font });
        doc.addPage([300, 200]);
        const second = doc.addPage([300, 200]);
        second.drawText('Secondo blocco', { x: 32, y: 100, size: 18, font });
        doc.addPage([300, 200]);
        const third = doc.addPage([300, 200]);
        third.drawText('Terzo blocco', { x: 32, y: 100, size: 18, font });
        return await doc.save();
      }

      async function makeInteractivePdf() {
        const doc = await PDFLib.PDFDocument.create();
        const page = doc.addPage([300, 200]);
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        page.drawText('Link e azioni', { x: 32, y: 100, size: 18, font });
        const link = doc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [28, 92, 160, 120],
          Border: [0, 0, 0],
          A: { Type: 'Action', S: 'URI', URI: PDFLib.PDFString.of('https://example.com') }
        });
        const linkRef = doc.context.register(link);
        page.node.set(PDFLib.PDFName.of('Annots'), doc.context.obj([linkRef]));
        doc.catalog.set(PDFLib.PDFName.of('OpenAction'), doc.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFLib.PDFString.of('app.alert("PdfDelta")') }));
        return await doc.save();
      }

      async function makeAttachmentPdf() {
        const doc = await PDFLib.PDFDocument.create();
        const page = doc.addPage([300, 200]);
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        page.drawText('PDF con allegato', { x: 32, y: 100, size: 18, font });
        await doc.attach(new TextEncoder().encode('allegato test'), 'note.txt', {
          mimeType: 'text/plain',
          description: 'Allegato test PdfDelta',
        });
        return await doc.save();
      }

      async function makeLogoPng() {
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f24f3d';
        ctx.fillRect(0, 0, 80, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('PD', 24, 26);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        return await blob.arrayBuffer();
      }

      async function runTool(toolId, fileBytes, fileName, options = {}) {
        const input = document.querySelector('#fileInput');
        document.querySelector('#clearQueue').click();
        const dt = new DataTransfer();
        const files = Array.isArray(fileBytes) ? fileBytes : [{ bytes: fileBytes, name: fileName }];
        files.forEach(file => {
          const type = file.type || (file.name.endsWith('.png') ? 'image/png' : file.name.endsWith('.jpg') ? 'image/jpeg' : 'application/pdf');
          dt.items.add(new File([file.bytes], file.name, { type }));
        });
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('[data-tool="' + toolId + '"]').click();
        Object.entries(options).forEach(([key, value]) => {
          const option = document.querySelector('[data-option="' + key + '"]');
          if (option) {
            option.value = value;
            option.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
        document.querySelector('#runTool').click();
        await new Promise(resolve => setTimeout(resolve, 1800));
        return document.querySelector('#resultPanel').textContent.trim();
      }

      async function runEditor(fileBytes) {
        const input = document.querySelector('#fileInput');
        document.querySelector('#clearQueue').click();
        const dt = new DataTransfer();
        dt.items.add(new File([fileBytes], 'editor.pdf', { type: 'application/pdf' }));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('[data-tool="edit-pdf"]').click();
        document.querySelector('#runTool').click();
        await new Promise(resolve => setTimeout(resolve, 2200));

        const canvas = document.querySelector('#editorInkCanvas');
        const rect = canvas.getBoundingClientRect();
        document.querySelector('[data-editor-mode="text"]').click();
        document.querySelector('#editorTextInput').value = 'Campo compilato';
        canvas.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 7,
          clientX: rect.left + rect.width * 0.18,
          clientY: rect.top + rect.height * 0.30
        }));
        document.querySelector('[data-editor-mode="signature"]').click();
        document.querySelector('#editorTextInput').value = 'Firma PdfDelta';
        canvas.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 8,
          clientX: rect.left + rect.width * 0.18,
          clientY: rect.top + rect.height * 0.55
        }));
        document.querySelector('#editorSave').click();
        await new Promise(resolve => setTimeout(resolve, 1600));
        return {
          result: document.querySelector('#resultPanel').textContent.trim(),
          status: document.querySelector('#editorStatus').textContent.trim(),
          pageInfo: document.querySelector('#editorPageInfo').textContent.trim()
        };
      }

      const pdf = await makePdf('PdfDelta verify');
      const secondPdf = await makePdf('Second side');
      const initialUx = {
        firstHeading: document.querySelector('h1')?.textContent.trim(),
        editorReady: document.querySelector('#editorPanel').classList.contains('editor-ready'),
        editorEmpty: getComputedStyle(document.querySelector('#editorEmptyState')).display !== 'none',
        runText: document.querySelector('#runTool').textContent.trim(),
        suggestions: [...document.querySelectorAll('#smartSuggestions [data-tool-shortcut]')].map(card => card.dataset.toolShortcut)
      };
      const mergeInput = document.querySelector('#fileInput');
      const dt = new DataTransfer();
      dt.items.add(new File([pdf], 'a.pdf', { type: 'application/pdf' }));
      dt.items.add(new File([secondPdf], 'b.pdf', { type: 'application/pdf' }));
      mergeInput.files = dt.files;
      mergeInput.dispatchEvent(new Event('change', { bubbles: true }));
      const guidedUx = {
        selected: document.querySelector('#selectedTool').textContent.trim(),
        compatibility: document.querySelector('#compatibilityNote').textContent.trim(),
        runText: document.querySelector('#runTool').textContent.trim(),
        suggestions: [...document.querySelectorAll('#smartSuggestions [data-tool-shortcut]')].map(card => card.dataset.toolShortcut)
      };
      document.querySelector('[data-tool="merge"]').click();
      document.querySelector('#runTool').click();
      await new Promise(resolve => setTimeout(resolve, 1400));
      const merge = document.querySelector('#resultPanel').textContent.trim();

      localStorage.removeItem('pdfdelta-favorites');
      renderCategories();
      renderTools();
      document.querySelector('[data-favorite="merge"]').click();
      const storedFavorites = JSON.parse(localStorage.getItem('pdfdelta-favorites') || '[]');
      document.querySelector('[data-category="Preferiti"]').click();
      const favoriteCards = [...document.querySelectorAll('[data-tool]')].map(card => card.dataset.tool);
      document.querySelector('[data-category="Tutti"]').click();
      const favorites = {
        stored: storedFavorites.includes('merge'),
        filtered: favoriteCards.length === 1 && favoriteCards[0] === 'merge'
      };

      const mixedMerge = await runTool('merge-mixed', [
        { bytes: pdf, name: 'mix-a.pdf' },
        { bytes: await makeLogoPng(), name: 'mix-logo.png', type: 'image/png' },
        { bytes: secondPdf, name: 'mix-b.pdf' }
      ]);
      const editor = await runEditor(pdf);
      const qr = await runTool('qr-on-pdf', pdf, 'qr.pdf');
      const interleave = await runTool('interleave', [{ bytes: pdf, name: 'front.pdf' }, { bytes: secondPdf, name: 'back.pdf' }]);
      const letterhead = await runTool('letterhead', [{ bytes: pdf, name: 'doc.pdf' }, { bytes: secondPdf, name: 'template.pdf' }]);
      const imageStamp = await runTool('image-stamp', [{ bytes: pdf, name: 'stamp.pdf' }, { bytes: await makeLogoPng(), name: 'logo.png', type: 'image/png' }]);
      const text = await runTool('extract-text', pdf, 'text.pdf');
      const markdown = await runTool('pdf-to-markdown', pdf, 'markdown.pdf');
      const word = await runTool('pdf-to-word', pdf, 'word.pdf');
      const jpg = await runTool('pdf-to-jpg', pdf, 'jpg.pdf');
      const webp = await runTool('pdf-to-webp', pdf, 'webp.pdf');
      const social = await runTool('pdf-to-social', pdf, 'social.pdf', { preset: 'square', background: 'warm' });
      const longJpg = await runTool('pdf-to-long-jpg', await makeMultiPagePdf(), 'long.pdf', { scale: '1' });
      const contactSheet = await runTool('contact-sheet', await makeMultiPagePdf(), 'contact.pdf', { columns: '3' });
      const splitRanges = await runTool('split-ranges', await makeMultiPagePdf(), 'ranges.pdf', { ranges: '1-2;3' });
      const splitOddEven = await runTool('split-odd-even', await makeMultiPagePdf(), 'oddeven.pdf');
      const crop = await runTool('crop-margins', pdf, 'crop.pdf');
      const printSafe = await runTool('print-safe-scale', pdf, 'printsafe.pdf', { scale: '0.94' });
      const cropMarks = await runTool('crop-marks', pdf, 'marks.pdf');
      const normalize = await runTool('normalize-size', pdf, 'normalize.pdf');
      const stampFilename = await runTool('stamp-filename', pdf, 'filename.pdf', { position: 'bottom-left' });
      const cover = await runTool('cover-page', pdf, 'cover.pdf', { title: 'Archivio PdfDelta', subtitle: 'Verifica locale' });
      const header = await runTool('header-footer', pdf, 'header.pdf');
      const bates = await runTool('bates', pdf, 'bates.pdf');
      const trim = await runTool('auto-trim', pdf, 'trim.pdf');
      const metadata = await runTool('metadata', pdf, 'meta.pdf');
      const setMetadata = await runTool('set-metadata', pdf, 'setmeta.pdf', {
        title: 'Archivio PdfDelta',
        author: 'PdfDelta',
        subject: 'Verifica locale',
        keywords: 'pdfdelta,local,free'
      });
      const cleanMetadata = await runTool('clean-metadata', pdf, 'cleanmeta.pdf');
      const visualCompare = await runTool('compare-visual', [{ bytes: pdf, name: 'visual-a.pdf' }, { bytes: secondPdf, name: 'visual-b.pdf' }], undefined, { sensitivity: '32' });
      const wordCount = await runTool('word-count', pdf, 'words.pdf');
      const interactivePdf = await makeInteractivePdf();
      const annotations = await runTool('remove-annotations', interactivePdf, 'interactive.pdf');
      const actions = await runTool('clean-actions', interactivePdf, 'actions.pdf');
      const attachmentPdf = await makeAttachmentPdf();
      const attachments = await runTool('attachments-report', attachmentPdf, 'attachment.pdf');
      const removeAttachments = await runTool('remove-attachments', attachmentPdf, 'attachment.pdf');
      const attachFiles = await runTool('attach-files', [
        { bytes: pdf, name: 'attach-base.pdf' },
        { bytes: await makeLogoPng(), name: 'attach-logo.png', type: 'image/png' },
        { bytes: new TextEncoder().encode('nota allegata'), name: 'note.txt', type: 'text/plain' }
      ]);
      const queueReport = await runTool('queue-report', [
        { bytes: pdf, name: 'queue.pdf' },
        { bytes: await makeLogoPng(), name: 'queue-logo.png', type: 'image/png' },
        { bytes: new TextEncoder().encode('coda'), name: 'queue.txt', type: 'text/plain' }
      ]);
      const searchPdf = await makeSearchPdf();
      const extractByText = await runTool('extract-by-text', searchPdf, 'search.pdf', { query: 'FindMe' });
      const removeByText = await runTool('remove-by-text', searchPdf, 'remove-search.pdf', { query: 'FindMe' });
      const splitByText = await runTool('split-by-text', await makeTextSplitPdf(), 'textsplit.pdf', { query: 'Invoice' });
      const splitBlankPages = await runTool('split-blank-pages', await makeBlankSeparatorPdf(), 'blanksplit.pdf', { threshold: '0.003' });
      const dedupe = await runTool('remove-duplicates', await makeDuplicatePdf(), 'dupe.pdf');
      const splitOrientation = await runTool('split-orientation', await makeMixedOrientationPdf(), 'orientation.pdf');
      const mixedSizePdf = await makeMixedSizePdf();
      const documentReport = await runTool('document-report', mixedSizePdf, 'docreport.pdf');
      const pageSizeReport = await runTool('page-size-report', mixedSizePdf, 'sizes.pdf');
      const splitBySize = await runTool('split-by-size', mixedSizePdf, 'sizes.pdf');
      const duplicate = await runTool('duplicate-pages', pdf, 'duplicate.pdf');
      const addBlank = await runTool('add-blank-pages', pdf, 'addblank.pdf');
      const booklet = await runTool('booklet', pdf, 'booklet.pdf');
      const poster = await runTool('poster-tiles', pdf, 'poster.pdf', { grid: '2x2' });
      const compressScan = await runTool('compress-scan', pdf, 'scan.pdf');
      const enhanceScan = await runTool('enhance-scan', pdf, 'enhance.pdf');
      const grayscale = await runTool('grayscale-raster', pdf, 'gray.pdf');
      document.querySelector('#clearQueue').click();
      document.querySelector('[data-tool="blank-pdf"]').click();
      document.querySelector('#runTool').click();
      await new Promise(resolve => setTimeout(resolve, 900));
      const blank = document.querySelector('#resultPanel').textContent.trim();
      return {
        libs: { pdfLib: !!window.PDFLib, jszip: !!window.JSZip, pdfjs: !!window.pdfjsLib, qrcode: typeof window.qrcode === 'function' },
        worker: window.pdfjsLib?.GlobalWorkerOptions?.workerSrc,
        initialUx,
        merge,
        favorites,
        guidedUx,
        mixedMerge,
        editor,
        qr,
        interleave,
        letterhead,
        imageStamp,
        text,
        markdown,
        word,
        jpg,
        webp,
        social,
        longJpg,
        contactSheet,
        splitRanges,
        splitOddEven,
        crop,
        printSafe,
        cropMarks,
        normalize,
        stampFilename,
        cover,
        header,
        bates,
        trim,
        metadata,
        setMetadata,
        cleanMetadata,
        visualCompare,
        wordCount,
        documentReport,
        annotations,
        actions,
        attachments,
        removeAttachments,
        attachFiles,
        queueReport,
        extractByText,
        removeByText,
        splitByText,
        splitBlankPages,
        dedupe,
        splitOrientation,
        pageSizeReport,
        splitBySize,
        duplicate,
        addBlank,
        booklet,
        poster,
        compressScan,
        enhanceScan,
        grayscale,
        blank,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      };
    }`;

    const result = await send("Runtime.evaluate", {
      expression: `(${expression})()`,
      awaitPromise: true,
      returnByValue: true,
    });

    const value = result.result.result.value;
    const external = requests.filter((url) => /^https?:\/\//.test(url) && !url.startsWith("http://127.0.0.1:4173"));
    const failures = [];

    if (!value.libs.pdfLib || !value.libs.jszip || !value.libs.pdfjs || !value.libs.qrcode) failures.push("librerie mancanti");
    if (value.worker !== "vendor/pdf.worker.min.js") failures.push("worker PDF.js non locale");
    if (!value.initialUx.firstHeading.includes("Carica") || value.initialUx.editorReady || !value.initialUx.editorEmpty || !value.initialUx.suggestions.includes("pdf-to-word")) failures.push("UX iniziale non riuscita");
    if (!value.merge.includes("pdfdelta-unito.pdf")) failures.push("merge non riuscito");
    if (!value.guidedUx.selected.includes("Unisci PDF") || !value.guidedUx.compatibility.includes("pronto") || !value.guidedUx.suggestions.includes("merge")) failures.push("UX guidata non riuscita");
    if (!value.favorites.stored || !value.favorites.filtered) failures.push("preferiti locali non riusciti");
    if (!value.mixedMerge.includes("pdfdelta-unito-misto.pdf")) failures.push("merge PDF+immagini non riuscito");
    if (!value.editor.result.includes("-compilato-firmato.pdf") || !value.editor.pageInfo.includes("1 / 1")) failures.push("editor compila e firma non riuscito");
    if (!value.qr.includes("-qr.pdf")) failures.push("QR non riuscito");
    if (!value.interleave.includes("pdfdelta-intercalato.pdf")) failures.push("intercalazione PDF non riuscita");
    if (!value.letterhead.includes("-carta-intestata.pdf")) failures.push("carta intestata non riuscita");
    if (!value.imageStamp.includes("-logo.pdf")) failures.push("logo/immagine non riuscito");
    if (!value.text.includes(".txt")) failures.push("estrazione testo non riuscita");
    if (!value.markdown.includes(".md")) failures.push("PDF in Markdown non riuscito");
    if (!value.word.includes(".docx")) failures.push("PDF in Word non riuscito");
    if (!value.jpg.includes("pdfdelta-jpg.zip")) failures.push("PDF in JPG non riuscito");
    if (!value.webp.includes("pdfdelta-webp.zip")) failures.push("PDF in WebP non riuscito");
    if (!value.social.includes("pdfdelta-social.zip")) failures.push("PDF in social non riuscito");
    if (!value.longJpg.includes("-immagine-lunga.jpg")) failures.push("PDF in JPG lungo non riuscito");
    if (!value.contactSheet.includes("-anteprime.pdf")) failures.push("scheda anteprime non riuscita");
    if (!value.splitRanges.includes("pdfdelta-range.zip")) failures.push("split range non riuscito");
    if (!value.splitOddEven.includes("pdfdelta-pari-dispari.zip")) failures.push("split pari/dispari non riuscito");
    if (!value.crop.includes("-ritagliato.pdf")) failures.push("crop non riuscito");
    if (!value.printSafe.includes("-margine-stampa.pdf")) failures.push("margine stampabile non riuscito");
    if (!value.cropMarks.includes("-segni-taglio.pdf")) failures.push("segni di taglio non riusciti");
    if (!value.normalize.includes("-normalizzato.pdf")) failures.push("normalizzazione non riuscita");
    if (!value.stampFilename.includes("-nome-file.pdf")) failures.push("timbro nome file non riuscito");
    if (!value.cover.includes("-copertina.pdf")) failures.push("copertina PDF non riuscita");
    if (!value.header.includes("-header-footer.pdf")) failures.push("header/footer non riuscito");
    if (!value.bates.includes("-bates.pdf")) failures.push("bates non riuscito");
    if (!value.trim.includes("-auto-trim.pdf")) failures.push("auto trim non riuscito");
    if (!value.metadata.includes("pdfdelta-metadati.txt")) failures.push("lettura metadati non riuscita");
    if (!value.setMetadata.includes("-metadati.pdf")) failures.push("scrittura metadati non riuscita");
    if (!value.cleanMetadata.includes("-metadati-puliti.pdf")) failures.push("pulizia metadati non riuscita");
    if (!value.visualCompare.includes("pdfdelta-confronto-visuale.html")) failures.push("confronto visuale non riuscito");
    if (!value.wordCount.includes("pdfdelta-conteggio-parole.csv")) failures.push("conteggio parole non riuscito");
    if (!value.documentReport.includes("pdfdelta-report-documenti.csv")) failures.push("report documento non riuscito");
    if (!value.annotations.includes("-senza-annotazioni.pdf")) failures.push("rimozione annotazioni non riuscita");
    if (!value.actions.includes("-azioni-pulite.pdf")) failures.push("pulizia azioni non riuscita");
    if (!value.attachments.includes("pdfdelta-allegati.txt")) failures.push("report allegati non riuscito");
    if (!value.removeAttachments.includes("-senza-allegati.pdf")) failures.push("rimozione allegati non riuscita");
    if (!value.attachFiles.includes("-con-allegati.pdf")) failures.push("allega file a PDF non riuscito");
    if (!value.queueReport.includes("pdfdelta-coda.csv")) failures.push("report coda non riuscito");
    if (!value.extractByText.includes("-testo-trovato.pdf")) failures.push("estrazione per testo non riuscita");
    if (!value.removeByText.includes("-senza-testo.pdf")) failures.push("rimozione per testo non riuscita");
    if (!value.splitByText.includes("pdfdelta-divisi-testo.zip")) failures.push("divisione per testo non riuscita");
    if (!value.splitBlankPages.includes("pdfdelta-divisi-bianche.zip")) failures.push("divisione su pagine bianche non riuscita");
    if (!value.dedupe.includes("-senza-duplicati.pdf")) failures.push("rimozione duplicati non riuscita");
    if (!value.splitOrientation.includes("pdfdelta-orientamento.zip")) failures.push("separazione orientamento non riuscita");
    if (!value.pageSizeReport.includes("pdfdelta-formati-pagine.csv")) failures.push("report formati pagina non riuscito");
    if (!value.splitBySize.includes("pdfdelta-formati-pagine.zip")) failures.push("separazione per formato non riuscita");
    if (!value.duplicate.includes("-pagine-duplicate.pdf")) failures.push("duplicazione pagine non riuscita");
    if (!value.addBlank.includes("-pagine-vuote.pdf")) failures.push("aggiunta pagine vuote non riuscita");
    if (!value.booklet.includes("-booklet.pdf")) failures.push("booklet non riuscito");
    if (!value.poster.includes("-poster-2x2.pdf")) failures.push("poster multipagina non riuscito");
    if (!value.compressScan.includes("-compresso.pdf")) failures.push("compressione scansione non riuscita");
    if (!value.enhanceScan.includes("-scansione-migliorata.pdf")) failures.push("miglioramento scansione non riuscito");
    if (!value.grayscale.includes("-grigio.pdf")) failures.push("scala di grigi non riuscita");
    if (!value.blank.includes("pdfdelta-vuoto.pdf")) failures.push("creazione PDF vuoto non riuscita");
    if (value.scrollWidth !== value.clientWidth) failures.push("overflow desktop");
    if (external.length) failures.push(`richieste esterne: ${external.join(", ")}`);

    ws.close();

    if (failures.length) {
      console.error(JSON.stringify({ ok: false, failures, value, external }, null, 2));
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify({ ok: true, value, external }, null, 2));
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
