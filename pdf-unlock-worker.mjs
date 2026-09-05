import createQpdfModule from './vendor/qpdf/qpdf.mjs';

const MAX_BYTES = 100 * 1024 * 1024;
let started = false;

// One module per job: qpdf has process-global state. The parent terminates this
// worker on success, failure, cancellation or timeout, releasing WASM and MEMFS.
self.onmessage = async ({ data }) => {
  if (started) return;
  started = true;
  let module, stderr = '';
  const input = '/input.pdf', output = '/output.pdf', passwordPath = '/password.txt';
  try {
    if (!(data?.bytes instanceof ArrayBuffer) || !data.bytes.byteLength || data.bytes.byteLength > MAX_BYTES) {
      self.postMessage({ ok: false, code: 'FILE_TOO_LARGE' });
      return;
    }
    module = await createQpdfModule({
      noInitialRun: true,
      locateFile: () => new URL('./vendor/qpdf/qpdf.wasm', import.meta.url).href,
      print: () => {},
      printErr: line => { stderr = (stderr + '\n' + line).slice(-32_768); },
    });
    module.FS.writeFile(input, new Uint8Array(data.bytes));
    // Pass a MEMFS password file, never an argument that might be echoed.
    // qpdf reads the first line; PDF passwords containing newlines cannot be
    // supplied through this adapter. The automatic empty-password path is exact.
    if (typeof data.password !== 'string' || /[\r\n\0]/.test(data.password)) {
      self.postMessage({ ok: false, code: 'PASSWORD_REQUIRED' });
      return;
    }
    module.FS.writeFile(passwordPath, new TextEncoder().encode(data.password));
    data.password = '';
    let exitCode;
    try {
      exitCode = module.callMain(['--password-file=' + passwordPath, '--decrypt', '--decode-level=none', input, output]);
    } catch (error) {
      if (error?.name === 'ExitStatus') exitCode = error.status;
      else throw error;
    }
    if (exitCode !== 0 && exitCode !== 3) {
      self.postMessage({ ok: false, code: /invalid password|password.*(required|incorrect)/i.test(stderr) ? 'PASSWORD_REQUIRED' : 'UNSUPPORTED_PDF' });
      return;
    }
    if (module.FS.stat(output).size > MAX_BYTES) {
      self.postMessage({ ok: false, code: 'FILE_TOO_LARGE' });
      return;
    }
    const bytes = module.FS.readFile(output);
    self.postMessage({ ok: true, bytes: bytes.buffer }, [bytes.buffer]);
  } catch {
    self.postMessage({ ok: false, code: 'UNSUPPORTED_PDF' });
  } finally {
    data.password = '';
    stderr = '';
    for (const path of [input, output, passwordPath]) {
      try { module?.FS.unlink(path); } catch { /* Already absent. */ }
    }
    self.close();
  }
};
