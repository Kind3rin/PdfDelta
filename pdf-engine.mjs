import * as pdfjs from './vendor/pdfjs/build/pdf.min.mjs';

const base = new URL('./vendor/pdfjs/', import.meta.url);
pdfjs.GlobalWorkerOptions.workerSrc = new URL('build/pdf.worker.min.mjs', base).href;
const tasks = new Set();
export const limits = Object.freeze({ fileBytes: 100 * 1024 * 1024, pages: 1000, canvasPixels: 16_000_000 });

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

export async function readEditable(file) {
  try {
    const document = await window.PDFLib.PDFDocument.load(await readBytes(file));
    if (document.getPageCount() > limits.pages) throw new Error('Il limite locale è 1000 pagine per documento.');
    return document;
  } catch (error) {
    if (/encrypt/i.test(error.message)) throw new Error('PDF protetto da password: apri una copia non protetta per modificarlo.');
    throw error;
  }
}

export function viewportFor(page, width, rotation = page.rotate) {
  const original = page.getViewport({ scale: 1, rotation });
  const scale = Math.min(width / original.width, Math.sqrt(limits.canvasPixels / (original.width * original.height)));
  return page.getViewport({ scale, rotation });
}

window.pdfjsLib = { ...pdfjs, getDocument: loadTask };
window.PdfEngine = { readBytes, readEditable, releaseReaders, viewportFor, limits };
