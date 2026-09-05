const MAX_BYTES = 100 * 1024 * 1024;
const DEFAULT_TIMEOUT = 60_000;

function failure(code, message) {
  return Object.assign(new Error(message), { code });
}

/** Create an editable copy in memory; the original File is never changed. */
export function normalizeEncryptedPdf(file, { password = '', signal, timeoutMs = DEFAULT_TIMEOUT } = {}) {
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size) return Promise.reject(failure('INVALID_PDF', 'Il file è vuoto. Scegli un PDF valido.'));
  if (file.size > MAX_BYTES) return Promise.reject(failure('FILE_TOO_LARGE', 'Il limite locale è 100 MB per file. Dividi prima il documento.'));
  if (typeof password !== 'string') return Promise.reject(failure('INVALID_PASSWORD', 'La password deve essere un testo.'));
  if (signal?.aborted) return Promise.reject(new DOMException('Apertura annullata.', 'AbortError'));
  if (typeof Worker !== 'function') return Promise.reject(failure('ENGINE_UNAVAILABLE', 'Questo browser non può aprire questo PDF. Prova un browser aggiornato.'));
  const duration = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 120_000) : DEFAULT_TIMEOUT;
  return new Promise((resolve, reject) => {
    let worker, timer, settled = false;
    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker?.terminate();
      password = '';
      if (error) reject(error); else resolve(result);
    }
    const abort = () => finish(new DOMException('Apertura annullata.', 'AbortError'));
    try {
      worker = new Worker(new URL('./pdf-unlock-worker.mjs', import.meta.url), { type: 'module' });
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) { abort(); return; }
      timer = setTimeout(() => finish(failure('TIMEOUT', 'Questo PDF richiede troppo tempo per essere aperto. Prova un documento più piccolo.')), duration);
      worker.onerror = event => {
        event.preventDefault();
        finish(failure('ENGINE_UNAVAILABLE', 'Non riesco ad avviare il lettore per questo PDF. Riprova dopo aver ricaricato la pagina.'));
      };
      worker.onmessageerror = () => finish(failure('INVALID_RESULT', 'Non riesco a preparare questo PDF. Il file originale è intatto.'));
      worker.onmessage = ({ data }) => {
        if (!data?.ok) {
          const code = data?.code === 'PASSWORD_REQUIRED' ? 'PASSWORD_REQUIRED' : data?.code === 'FILE_TOO_LARGE' ? 'FILE_TOO_LARGE' : 'UNSUPPORTED_PDF';
          const message = code === 'PASSWORD_REQUIRED'
            ? 'Questo PDF richiede una password per essere aperto.'
            : code === 'FILE_TOO_LARGE'
              ? 'La copia modificabile supera 100 MB. Usa un documento più piccolo.'
              : 'Non riesco a preparare questo PDF. Il file potrebbe essere danneggiato o usare una protezione non supportata.';
          finish(failure(code, message));
          return;
        }
        if (!(data.bytes instanceof ArrayBuffer) || !data.bytes.byteLength || data.bytes.byteLength > MAX_BYTES) {
          finish(failure('INVALID_RESULT', 'Non riesco a preparare questo PDF. Il file originale è intatto.'));
          return;
        }
        try {
          finish(null, new File([data.bytes], file.name, { type: file.type || 'application/pdf', lastModified: file.lastModified }));
        } catch {
          finish(failure('INVALID_RESULT', 'Non riesco a preparare questo PDF. Il file originale è intatto.'));
        }
      };
      file.arrayBuffer().then(bytes => {
        if (settled) return;
        worker.postMessage({ bytes, password }, [bytes]);
        password = '';
      }).catch(() => finish(failure('FILE_READ_FAILED', 'Non riesco a leggere il file. Selezionalo di nuovo.')));
    } catch {
      finish(failure('ENGINE_UNAVAILABLE', 'Questo browser non può aprire questo PDF. Prova un browser aggiornato.'));
    }
  });
}
