import * as pdfjs from './vendor/pdfjs/build/pdf.min.mjs';

const base = new URL('./vendor/pdfjs/', import.meta.url);
pdfjs.GlobalWorkerOptions.workerSrc = new URL('build/pdf.worker.min.mjs', base).href;
const tasks = new Set();
const normalizedFiles = new WeakMap();
export const limits = Object.freeze({ fileBytes: 100 * 1024 * 1024, pages: 1000, canvasPixels: 16_000_000, canvasSide: 8192 });

export function loadTask(options) {
  const { owner, ...parameters } = options;
  const task = pdfjs.getDocument({
    ...parameters,
    isEvalSupported: false,
    enableXfa: false,
    cMapUrl: new URL('cmaps/', base).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('standard_fonts/', base).href,
    wasmUrl: new URL('wasm/', base).href,
    iccUrl: new URL('iccs/', base).href,
  });
  if (owner !== 'workspace') tasks.add(task);
  task.promise.catch(() => { tasks.delete(task); void task.destroy(); });
  return task;
}

export async function releaseReaders(except) {
  await Promise.allSettled([...tasks].map(async task => {
    if ((await task.promise.catch(() => null)) === except) return;
    tasks.delete(task);
    await task.destroy();
  }));
}

export async function readBytes(file) {
  if (!file.size) throw new Error('Il file è vuoto. Scegli un PDF valido.');
  if (file.size > limits.fileBytes) throw new Error('Il limite locale è 100 MB per file. Dividi prima il documento.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder('latin1').decode(bytes.subarray(0, 1024)).includes('%PDF-')) throw new Error('Il file non contiene un PDF valido.');
  return bytes;
}

export async function readEditableSource(file, { signal } = {}) {
  let source = normalizedFiles.get(file) || file;
  try {
    let document;
    try {
      document = await window.PDFLib.PDFDocument.load(await readBytes(source));
    } catch (error) {
      if (!/encrypt/i.test(error.message)) throw error;
      const { normalizeEncryptedPdf } = await import('./pdf-unlock.mjs');
      source = await normalizeEncryptedPdf(file, { password: '', signal });
      document = await window.PDFLib.PDFDocument.load(await readBytes(source));
      normalizedFiles.set(file, source);
    }
    if (document.getPageCount() > limits.pages) throw new Error('Il limite locale è 1000 pagine per documento.');
    return { file: source, document };
  } catch (error) {
    if (error.code === 'PASSWORD_REQUIRED') throw new Error('Questo PDF richiede una password di apertura. Apri una copia senza password per usarla qui.');
    throw error;
  }
}

export async function readEditable(file) { return (await readEditableSource(file)).document; }

export function viewportAtScale(page, scale, rotation = page.rotate) {
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('La risoluzione deve essere un numero positivo.');
  let viewport = page.getViewport({ scale, rotation });
  if (![viewport.width, viewport.height].every(value => Number.isFinite(value) && value > 0)) throw new Error('Dimensioni pagina non valide.');
  // Account for rounding to integer canvas dimensions, including extreme aspect ratios.
  while (Math.ceil(viewport.width) * Math.ceil(viewport.height) > limits.canvasPixels || Math.max(viewport.width, viewport.height) > limits.canvasSide) {
    scale *= Math.min(.99, limits.canvasSide / Math.max(viewport.width, viewport.height), Math.sqrt(limits.canvasPixels / (Math.ceil(viewport.width) * Math.ceil(viewport.height))));
    viewport = page.getViewport({ scale, rotation });
  }
  return viewport;
}

export function viewportFor(page, width, rotation = page.rotate) {
  const original = page.getViewport({ scale: 1, rotation });
  return viewportAtScale(page, width / original.width, rotation);
}

window.pdfjsLib = { ...pdfjs, getDocument: loadTask };
window.PdfEngine = { readBytes, readEditable, releaseReaders, viewportFor, viewportAtScale, limits };
