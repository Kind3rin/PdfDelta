import { mkdtemp, writeFile, mkdir, cp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const version = '6.3.289';
const integrity = 'ZHjSVpDa3D6izMq8/04lvkhkATUmL9px6ChPaXc1k6nU2Mrhlg1/7F0bdUqCwUjw3NsPTfPZsMDUU6ZIcRaeQw==';
const root = path.resolve(import.meta.dirname, '..');
const temp = await mkdtemp(path.join(tmpdir(), 'pdfdelta-vendor-'));
const response = await fetch(`https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-${version}.tgz`);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const archive = Buffer.from(await response.arrayBuffer());
if (createHash('sha512').update(archive).digest('base64') !== integrity) throw new Error('Integrity mismatch');
await writeFile(path.join(temp, 'package.tgz'), archive);
execFileSync('tar', ['-xzf', path.join(temp, 'package.tgz'), '-C', temp]);
const dest = path.join(root, 'vendor/pdfjs');
await mkdir(dest, { recursive: true });
for (const file of ['build/pdf.min.mjs', 'build/pdf.worker.min.mjs', 'LICENSE', 'cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  await cp(path.join(temp, 'package', file), path.join(dest, file), { recursive: true });
}
const files = (await readdir(dest, { recursive: true, withFileTypes: true })).filter(f => f.isFile());
const manifest = [];
for (const file of files) {
  const absolute = path.join(file.parentPath, file.name);
  manifest.push({ path: path.relative(root, absolute).replaceAll('\\', '/'), sha256: createHash('sha256').update(await readFile(absolute)).digest('hex') });
}
manifest.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(path.join(root, 'vendor/pdfjs-manifest.json'), JSON.stringify({ version, integrity: `sha512-${integrity}`, files: manifest }, null, 2) + '\n');
await writeFile(path.join(root, 'vendor/pdfjs-assets.js'), `self.PDFJS_ASSETS = ${JSON.stringify(manifest.map(f => './' + f.path))};\n`);
console.log(`Vendored PDF.js ${version}: ${manifest.length} verified assets`);
