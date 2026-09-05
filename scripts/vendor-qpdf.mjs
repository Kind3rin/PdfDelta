import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

// Download only this pinned release. No package lifecycle scripts are executed.
const source = 'https://registry.npmjs.org/pdfstudio/-/pdfstudio-0.4.0.tgz';
const integrity = 'sha512-yFHlp/VHxKmrYxYA45ACkh24c4mCBa/Al3EmajnlBnN9FzfynZz63sR2do2kBH34XoTAQSXy+ywijAcq0DUcSQ==';
const target = new URL('../vendor/qpdf/', import.meta.url);
async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${url} (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
const archive = await fetchBytes(source);
if (`sha512-${createHash('sha512').update(archive).digest('base64')}` !== integrity) throw new Error('qpdf package integrity mismatch');
const wanted = new Map([
  ['package/dist/wasm/qpdf.js', 'qpdf.mjs'],
  ['package/dist/wasm/qpdf.wasm', 'qpdf.wasm'],
  ['package/LICENSE', 'LICENSE.txt'],
]);
function extractSelected(compressed, names) {
  const tar = gunzipSync(compressed), selected = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString().replace(/\0.*$/, '');
    if (!name) break;
    const size = Number.parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, '').trim(), 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('Invalid package archive');
    if (names.has(name)) selected.set(names.get(name), Buffer.from(tar.subarray(offset + 512, offset + 512 + size)));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return selected;
}
const files = extractSelected(archive, wanted);
for (const path of wanted.values()) if (!files.has(path)) throw new Error(`Missing vendored file: ${path}`);
const upstreamGlueSha256 = createHash('sha256').update(files.get('qpdf.mjs')).digest('hex');
const heapLimitOriginal = 'var getHeapMax=()=>2147483648';
const heapLimitPatched = 'var getHeapMax=()=>536870912';
const glue = files.get('qpdf.mjs').toString('utf8');
if (glue.split(heapLimitOriginal).length !== 2) throw new Error('Expected exactly one Emscripten heap-limit definition');
files.set('qpdf.mjs', Buffer.from('// Modified by PdfDelta: cap Emscripten heap growth at 512 MiB. See manifest.json.\n' + glue.replace(heapLimitOriginal, heapLimitPatched)));
files.set('NOTICE-qpdf.md', await fetchBytes('https://raw.githubusercontent.com/qpdf/qpdf/v12.3.2/NOTICE.md'));
files.set('LICENSE-zlib.txt', await fetchBytes('https://raw.githubusercontent.com/madler/zlib/v1.3.1/LICENSE'));
const jpegArchive = await fetchBytes('https://storage.googleapis.com/webassembly/emscripten-ports/jpegsrc.v9f.tar.gz');
if (createHash('sha512').update(jpegArchive).digest('hex') !== '7f733d79cf176c690dcf127352f9aa7ec48000455944f286faae606cdeada6f6865b4a3f9f01bda8947b5b1089bb3e52d2b56879b6e871279ec5cbd1829304dc') throw new Error('JPEG archive integrity mismatch');
files.set('LICENSE-jpeg.txt', extractSelected(jpegArchive, new Map([['jpeg-9f/README', 'license']])).get('license'));
for (const [name, expected] of Object.entries({
  'NOTICE-qpdf.md': 'b207f65a9e5491195ded63b2941199b19a4d30148871f2742c88eae7bfc513a6',
  'LICENSE-zlib.txt': '845efc77857d485d91fb3e0b884aaa929368c717ae8186b66fe1ed2495753243',
  'LICENSE-jpeg.txt': '7c25493a9f64fed34d01445467341bda77bc1cdbeccbe33558659ef173fb9ff2',
})) {
  if (createHash('sha256').update(files.get(name)).digest('hex') !== expected) throw new Error(`License integrity mismatch: ${name}`);
}
await mkdir(target, { recursive: true });
for (const [name, bytes] of files) await writeFile(new URL(name, target), bytes);
await writeFile(new URL('manifest.json', target), JSON.stringify({
  package: 'pdfstudio', version: '0.4.0', engine: 'qpdf 12.3.2', source, integrity,
  sourceCommit: 'c5c1f2d9f378199d1e2d333dbe4ca20e9ff737ad',
  buildSource: 'https://github.com/fayazara/pdfstudio/blob/c5c1f2d9f378199d1e2d333dbe4ca20e9ff737ad/scripts/build-wasm.sh',
  note: 'Only the Emscripten module and wasm are used. qpdf.js is renamed qpdf.mjs and patched to cap heap growth at 512 MiB. The wasm binary is unchanged.',
  patch: { file: 'qpdf.mjs', upstreamSha256: upstreamGlueSha256, from: heapLimitOriginal, to: heapLimitPatched, heapBytes: 536870912 },
  files: Object.fromEntries([...files].map(([name, bytes]) => [name, { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }])),
}, null, 2) + '\n');
console.log(`Vendored qpdf 12.3.2 (${files.size} files; npm integrity verified).`);
