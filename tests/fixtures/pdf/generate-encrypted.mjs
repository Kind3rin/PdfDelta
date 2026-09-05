import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import createQpdfModule from '../../../vendor/qpdf/qpdf.mjs';

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, PDFName } = require('../../../vendor/pdf-lib.min.js');
const root = new URL('./', import.meta.url);
const doc = await PDFDocument.create();
doc.setTitle('PdfDelta encrypted fixture');
doc.setAuthor('PdfDelta test suite');
doc.setCreationDate(new Date('2026-01-01T00:00:00Z'));
doc.setModificationDate(new Date('2026-01-01T00:00:00Z'));
const font = await doc.embedFont(StandardFonts.Helvetica);
for (let pageNumber = 1; pageNumber <= 2; pageNumber++) {
  const page = doc.addPage([400, 500]);
  page.drawText(`PdfDelta editable fixture - page ${pageNumber}`, { x: 30, y: 440, size: 15, font });
  page.drawText('Visible text must survive local decryption.', { x: 30, y: 400, size: 13, font });
}
const field = doc.getForm().createTextField('sample');
field.setText('Form value');
field.addToPage(doc.getPage(0), { x: 30, y: 320, width: 180, height: 24, font });
await doc.attach(new TextEncoder().encode('Synthetic attachment - no personal data.'), 'fixture.txt', { mimeType: 'text/plain', creationDate: new Date('2026-01-01T00:00:00Z'), modificationDate: new Date('2026-01-01T00:00:00Z') });
const ordinary = await doc.save();
await mkdir(root, { recursive: true });
await writeFile(new URL('ordinary.pdf', root), ordinary);

for (const [name, userPassword] of [['owner-restricted.pdf', ''], ['password-required.pdf', 'fixture-password']]) {
  let stderr = '';
  const engine = await createQpdfModule({ noInitialRun: true, print: () => {}, printErr: line => { stderr += line; } });
  engine.FS.writeFile('/input.pdf', ordinary);
  const result = engine.callMain(['--encrypt', '--user-password=' + userPassword, '--owner-password=fixture-owner', '--bits=256', '--modify=none', '--extract=n', '--', '/input.pdf', '/output.pdf']);
  if (result !== 0 && result !== 3) throw new Error('Fixture encryption failed: ' + stderr);
  await writeFile(new URL(name, root), engine.FS.readFile('/output.pdf'));
}

// Verify genuine encryption plus decryption, form values, metadata and attachment
// references. Browser tests separately verify rendering and extracted text.
for (const [name, password] of [['owner-restricted.pdf', ''], ['password-required.pdf', 'fixture-password']]) {
  const input = await readFile(new URL(name, root));
  let rejected = false;
  try { await PDFDocument.load(input); } catch (error) { rejected = /encrypt/i.test(error.message); }
  if (!rejected) throw new Error('Fixture is not really encrypted');
  let stderr = '';
  const engine = await createQpdfModule({ noInitialRun: true, print: () => {}, printErr: line => { stderr += line; } });
  engine.FS.writeFile('/input.pdf', input);
  engine.FS.writeFile('/password.txt', new TextEncoder().encode(password));
  const result = engine.callMain(['--password-file=/password.txt', '--decrypt', '--decode-level=none', '/input.pdf', '/output.pdf']);
  if (result !== 0 && result !== 3) throw new Error('Fixture decryption failed: ' + stderr);
  const decoded = await PDFDocument.load(engine.FS.readFile('/output.pdf'));
  if (decoded.getPageCount() !== 2 || decoded.getTitle() !== 'PdfDelta encrypted fixture' || decoded.getForm().getTextField('sample').getText() !== 'Form value') throw new Error('Content was lost during decryption');
  const names = decoded.catalog.lookup(PDFName.of('Names'));
  if (!names?.lookup(PDFName.of('EmbeddedFiles'))) throw new Error('Attachment was lost');
}
console.log('Created and verified 3 synthetic fixtures: ordinary, owner restrictions, opening password.');
