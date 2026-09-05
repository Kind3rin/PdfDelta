// Test-only validation: reopen generated files with independent browser readers.
export async function validateOutput(tool, output) {
  const { blob, filename } = output;
  const require = (condition, message) => { if (!condition) throw new Error(`${tool}: ${message}`); };
  require(blob?.size > 0, 'file vuoto');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const extension = filename.split('.').pop().toLowerCase();
  if (extension === 'pdf') {
    const doc = await window.PDFLib.PDFDocument.load(bytes);
    require(doc.getPageCount() > 0, 'PDF senza pagine');
    const task = window.pdfjsLib.getDocument({ data: bytes.slice(), owner: 'workspace' });
    let reader;
    const texts = [];
    try {
      reader = await task.promise;
      require(reader.numPages === doc.getPageCount(), 'lettori discordanti sul numero di pagine');
      for (let index = 1; index <= reader.numPages; index++) {
        const page = await reader.getPage(index);
        texts.push((await page.getTextContent()).items.map(item => item.str).join(' '));
        const viewport = page.getViewport({ scale: 96 / page.getViewport({ scale: 1 }).width });
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        canvas.width = canvas.height = 0;
      }
      const counts = { merge: 2, 'merge-mixed': 3, interleave: 2, 'cover-page': 2, 'poster-tiles': 4, 'duplicate-pages': 2, 'contact-sheet': 1, 'extract-by-text': 1, 'remove-by-text': 1, 'remove-duplicates': 1, 'edit-pdf': 1 };
      if (counts[tool]) require(reader.numPages === counts[tool], `attese ${counts[tool]} pagine, trovate ${reader.numPages}`);
      const joined = texts.join('\n');
      const expectedText = { 'edit-pdf': ['Campo compilato', 'Firma PdfDelta'], 'extract-by-text': ['FindMe target'], 'remove-by-text': ['Keep this page'], 'cover-page': ['Archivio PdfDelta'], 'merge': ['PdfDelta verify', 'Second side'], 'merge-mixed': ['PdfDelta verify', 'Second side'] };
      for (const text of expectedText[tool] || []) require(joined.includes(text), `contenuto mancante: ${text}`);
      if (tool === 'extract-by-text') require(!joined.includes('Keep this page'), 'pagina non richiesta presente');
      if (tool === 'remove-by-text') require(!joined.includes('FindMe target'), 'pagina rimossa ancora presente');
      if (tool === 'set-metadata') require(doc.getTitle() === 'Archivio PdfDelta' && doc.getAuthor() === 'PdfDelta', 'metadati non applicati');
      if (tool === 'clean-metadata') require(!doc.getTitle() && !doc.getAuthor(), 'metadati residui');
      if (tool === 'remove-annotations') for (let i = 1; i <= reader.numPages; i++) require((await (await reader.getPage(i)).getAnnotations()).length === 0, 'annotazioni residue');
      if (tool === 'clean-actions') require(!doc.catalog.has(window.PDFLib.PDFName.of('OpenAction')), 'azione di apertura residua');
      if (tool === 'remove-attachments') require(((await reader.getAttachments())?.size || 0) === 0, 'allegati residui');
      if (tool === 'attach-files') {
        const attachments = await reader.getAttachments(); require(attachments?.size === 2, 'allegati mancanti');
        require(attachments.has('attach-logo.png') && attachments.has('note.txt'), 'nomi allegati errati');
        require(new TextDecoder().decode(await reader.getAttachmentContent('note.txt')) === 'nota allegata', 'contenuto allegato alterato');
      }
      const orderedText = { 'extract-pages': ['Pagina 2', 'Pagina 3'], 'remove-pages': ['Pagina 1', 'Pagina 3'], 'reorder-pages': ['Pagina 3', 'Pagina 1', 'Pagina 2'], 'reverse-pages': ['Pagina 3', 'Pagina 2', 'Pagina 1'] };
      if (orderedText[tool]) require(texts.length === orderedText[tool].length && texts.every((text, i) => text.includes(orderedText[tool][i])), 'ordine o selezione pagine errati');
      if (tool === 'rotate') require(doc.getPages().every(page => page.getRotation().angle === 90), 'rotazione non applicata');
      if (tool === 'nup') require(doc.getPageCount() === 2 && joined.includes('Pagina 3'), 'impaginazione N-up errata');
      if (tool === 'remove-blank-pages') require(doc.getPageCount() === 3 && joined.includes('Terzo blocco'), 'rimozione pagine bianche errata');
      const extraText = { watermark: 'Copia di prova', 'sign-text': 'Firma di prova', 'text-to-pdf': 'Testo di prova', 'flatten-forms': 'Nome di prova' };
      if (extraText[tool]) require(joined.includes(extraText[tool]), 'testo applicato mancante');
      if (tool === 'flatten-forms') require(doc.getForm().getFields().length === 0, 'campi ancora modificabili');
      return { format: 'pdf', pages: reader.numPages, rendered: true, textChecked: !!expectedText[tool] };
    } finally { await task.destroy(); }
  }
  if (extension === 'zip' || extension === 'docx') {
    const zip = await window.JSZip.loadAsync(bytes, { checkCRC32: true });
    if (extension === 'docx') {
      const xml = await zip.file('word/document.xml')?.async('string');
      require(xml && zip.file('[Content_Types].xml') && zip.file('_rels/.rels'), 'struttura DOCX incompleta');
      require(!new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror'), 'XML Word non valido');
      require(xml.includes('PdfDelta verify'), 'testo Word mancante');
      return { format: 'docx', textChecked: true };
    }
    const entries = Object.values(zip.files).filter(entry => !entry.dir);
    require(entries.length > 0, 'archivio vuoto');
    const results = [];
    for (const entry of entries) results.push(await validateOutput('archive-entry', { filename: entry.name, blob: new Blob([await entry.async('uint8array')]) }));
    const splitPages = { split: [1, 1, 1], 'split-ranges': [2, 1], 'split-odd-even': [2, 1], 'split-by-text': [2, 2], 'split-blank-pages': [1, 1, 1], 'split-orientation': [1, 1], 'split-by-size': [1, 1] };
    if (splitPages[tool]) require(JSON.stringify(results.map(item => item.pages).sort()) === JSON.stringify([...splitPages[tool]].sort()), 'suddivisione pagine errata');
    return { format: 'zip', entries: results };
  }
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    const bitmap = await createImageBitmap(blob);
    try { require(bitmap.width > 0 && bitmap.height > 0, 'immagine senza dimensioni'); return { format: extension, width: bitmap.width, height: bitmap.height }; }
    finally { bitmap.close(); }
  }
  require(['txt', 'md', 'csv', 'html'].includes(extension), `formato inatteso: ${extension}`);
  const text = await blob.text(); require(text.trim().length > 0, 'contenuto testuale vuoto');
  if (['extract-text', 'pdf-to-markdown'].includes(tool)) require(text.includes('PdfDelta verify'), 'testo estratto mancante');
  return { format: extension, nonempty: true };
}
