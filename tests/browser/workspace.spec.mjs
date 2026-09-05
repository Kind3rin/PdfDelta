import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import localVerification from '../../verify-local.js';

const test = base.extend({
  site: [async ({}, use) => {
    const local = await localVerification.startStaticServer();
    try {
      await use(process.env.PDFDELTA_TEST_URL?.replace(/\/$/, '') || local.origin);
    } finally {
      await new Promise(resolve => local.server.close(resolve));
    }
  }, { scope: 'worker' }],
});

async function ready(page, site) {
  await page.goto(site);
  await expect(page.locator('#visualWorkspace')).toHaveAttribute('data-flow', 'ready');
  await page.evaluate(() => document.fonts.ready);
}

async function noHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ), { message: 'The document must fit the selected viewport' }).toBe(true);
}

async function orientation(page, landscape) {
  await expect.poll(() => page.locator('[data-page] canvas').first().evaluate(canvas =>
    canvas.width > canvas.height
  ), { message: landscape ? 'Rotated page should be landscape' : 'Undo should restore portrait' }).toBe(landscape);
}

test('home, example, rotation, undo/redo and downloaded PDF reopened', async ({ page, site }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page, site);
  await expect(page.locator('#homeTitle')).toBeVisible();
  await expect(page.locator('[data-home-tool]')).toHaveCount(12);
  await noHorizontalOverflow(page);
  await testInfo.attach('home', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  const start = performance.now();
  const activate = locator => testInfo.project.use.hasTouch ? locator.tap() : locator.click();
  await activate(page.getByRole('button', { name: 'Prova con un esempio', exact: true }));
  await expect(page.locator('[data-page]')).toHaveCount(3);
  await expect(page.locator('#wsExport')).toBeEnabled();
  const openedMs = performance.now() - start;
  await noHorizontalOverflow(page);

  await activate(page.getByRole('button', { name: /^Pagina 1, Proposta-studio.pdf/ }));
  await expect(page.locator('[data-page]').first()).toHaveAttribute('aria-pressed', 'true');
  await activate(page.getByRole('button', { name: 'Ruota 90°', exact: true }));
  await orientation(page, true);
  await activate(page.getByRole('button', { name: 'Annulla modifica', exact: true }));
  await orientation(page, false);
  await activate(page.getByRole('button', { name: 'Ripeti modifica', exact: true }));
  await orientation(page, true);
  await noHorizontalOverflow(page);
  await testInfo.attach('workspace-rotated', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  const exportStart = performance.now();
  const downloading = page.waitForEvent('download');
  await activate(page.getByRole('button', { name: 'Scarica PDF', exact: true }));
  const download = await downloading;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  const outputPath = testInfo.outputPath('rotated.pdf');
  await download.saveAs(outputPath);
  const output = await readFile(outputPath);
  const exportedMs = performance.now() - exportStart;
  const inspection = await page.evaluate(async data => {
    const bytes = new Uint8Array(data);
    const document = await PDFLib.PDFDocument.load(bytes);
    const task = pdfjsLib.getDocument({ data: bytes.slice(), owner: 'workspace' });
    try {
      const reader = await task.promise;
      const text = [];
      for (let pageNumber = 1; pageNumber <= reader.numPages; pageNumber++) {
        text.push((await (await reader.getPage(pageNumber)).getTextContent()).items.map(item => item.str).join(' '));
      }
      return { pages: document.getPageCount(), rotations: document.getPages().map(page => page.getRotation().angle), text };
    } finally { await task.destroy(); }
  }, [...output]);
  expect(inspection.pages).toBe(3);
  expect(inspection.rotations).toEqual([90, 0, 0]);
  expect(inspection.text[0]).toContain('Proposta di progetto');
  expect(inspection.text[1]).toContain('Obiettivi e attivita');
  expect(inspection.text[2]).toContain('Tempi e consegne');

  // A fresh page has no document session: reopen the actual downloaded file through upload.
  const reopened = await page.context().newPage();
  reopened.on('pageerror', error => errors.push(error.message));
  try {
    await ready(reopened, site);
    const choosing = reopened.waitForEvent('filechooser');
    const uploadButton = reopened.getByRole('button', { name: 'Apri un documento', exact: true });
    if (testInfo.project.use.hasTouch) await uploadButton.tap(); else await uploadButton.click();
    await (await choosing).setFiles(outputPath);
    await expect(reopened.locator('[data-page]')).toHaveCount(3);
    await expect(reopened.locator('#wsExport')).toBeEnabled();
    await orientation(reopened, true);
    await noHorizontalOverflow(reopened);
    await testInfo.attach('reopened-pdf', { body: await reopened.screenshot({ fullPage: true }), contentType: 'image/png' });
  } finally { await reopened.close(); }

  await testInfo.attach('output-inspection', {
    body: Buffer.from(JSON.stringify({ ...inspection, openedMs, exportedMs, outputBytes: output.length }, null, 2)),
    contentType: 'application/json',
  });
  expect(errors, 'No uncaught browser exceptions in the complete flow').toEqual([]);
});

test('failed PDF import shows a visible recoverable error', async ({ page, site }, testInfo) => {
  await ready(page, site);
  const choosing = page.waitForEvent('filechooser');
  const upload = page.getByRole('button', { name: 'Apri un documento', exact: true });
  if (testInfo.project.use.hasTouch) await upload.tap(); else await upload.click();
  await (await choosing).setFiles({
    name: 'documento-non-valido.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a valid PDF'),
  });
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(page.locator('#wsErrorMessage')).toHaveText(/.+/);
  await expect(alert).toBeFocused();
  await noHorizontalOverflow(page);
  const bounds = await alert.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize().height);
  await testInfo.attach('visible-upload-error', { body: await page.screenshot(), contentType: 'image/png' });

  // Recover using the visible action and a locally generated valid one-page PDF.
  const valid = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create();
    pdf.addPage([300, 400]).drawText('Documento recuperato', { x: 25, y: 300, size: 14 });
    return [...await pdf.save()];
  });
  const retrying = page.waitForEvent('filechooser');
  const retry = page.getByRole('button', { name: 'Scegli un altro file', exact: true });
  if (testInfo.project.use.hasTouch) await retry.tap(); else await retry.click();
  await (await retrying).setFiles({ name: 'documento-valido.pdf', mimeType: 'application/pdf', buffer: Buffer.from(valid) });
  await expect(page.locator('[data-page]')).toHaveCount(1);
  await expect(page.locator('#wsExport')).toBeEnabled();
  await expect(page.locator('#wsError')).toBeHidden();
  await noHorizontalOverflow(page);
});

test('locally opens a restricted PDF and preserves it after a password-required import', async ({ page, site }, testInfo) => {
  const external = [], errors = [];
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(site).origin) external.push(request.url());
  });
  page.on('pageerror', error => errors.push(error.message));
  const restricted = fileURLToPath(new URL('../fixtures/pdf/owner-restricted.pdf', import.meta.url));
  const protectedPdf = fileURLToPath(new URL('../fixtures/pdf/password-required.pdf', import.meta.url));
  const originalBytes = await readFile(restricted);
  const activate = locator => testInfo.project.use.hasTouch ? locator.tap() : locator.click();
  await ready(page, site);
  const choosing = page.waitForEvent('filechooser');
  await activate(page.getByRole('button', { name: 'Apri un documento', exact: true }));
  await (await choosing).setFiles(restricted);
  await expect(page.locator('[data-page]')).toHaveCount(2);
  await expect(page.locator('#wsExport')).toBeEnabled();
  await expect(page.locator('#wsTitle')).toHaveText('owner-restricted.pdf');
  await expect(page.locator('#wsError')).toBeHidden();
  await noHorizontalOverflow(page);
  await activate(page.getByRole('button', { name: /^Pagina 1, owner-restricted.pdf/ }));
  await activate(page.getByRole('button', { name: 'Ruota 90°', exact: true }));
  await orientation(page, true);

  const choosingProtected = page.waitForEvent('filechooser');
  await activate(page.getByRole('button', { name: 'Aggiungi file', exact: true }));
  await (await choosingProtected).setFiles(protectedPdf);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#wsErrorMessage')).toContainText('password di apertura');
  await expect(page.locator('[data-page]')).toHaveCount(2);
  await expect(page.locator('#wsTitle')).toHaveText('owner-restricted.pdf');
  await expect(page.locator('#wsExport')).toBeEnabled();
  await orientation(page, true);
  await noHorizontalOverflow(page);
  await testInfo.attach('password-error-preserves-document', { body: await page.screenshot(), contentType: 'image/png' });

  const downloading = page.waitForEvent('download');
  await activate(page.getByRole('button', { name: 'Scarica PDF', exact: true }));
  const download = await downloading;
  expect(await download.failure()).toBeNull();
  const path = testInfo.outputPath('restricted-rotated.pdf');
  await download.saveAs(path);
  const output = await readFile(path);
  const inspection = await page.evaluate(async input => {
    const bytes = new Uint8Array(input);
    const document = await PDFLib.PDFDocument.load(bytes);
    const task = pdfjsLib.getDocument({ data: bytes.slice(), owner: 'workspace' });
    try {
      const reader = await task.promise;
      const text = (await (await reader.getPage(1)).getTextContent()).items.map(item => item.str).join(' ');
      return { pages: document.getPageCount(), encrypted: document.isEncrypted, rotations: document.getPages().map(page => page.getRotation().angle), text };
    } finally { await task.destroy(); }
  }, [...output]);
  expect(inspection).toMatchObject({ pages: 2, encrypted: false, rotations: [90, 0] });
  expect(inspection.text).toContain('Visible text must survive local decryption.');
  expect(await readFile(restricted), 'The source fixture remains unchanged').toEqual(originalBytes);
  expect(external, 'PDF processing must not send documents or requests to an external service').toEqual([]);
  expect(errors, 'No uncaught browser exceptions during local decryption').toEqual([]);
  await testInfo.attach('restricted-output-inspection', { body: Buffer.from(JSON.stringify(inspection, null, 2)), contentType: 'application/json' });
});
