# Browser verification

The Playwright dependency is pinned in `package-lock.json`. Browser runtimes and
reports stay under ignored `dist/`; they are not runtime dependencies or site assets.

```sh
npm ci
npm run test:browsers:install
npm run test:browsers
```

On Linux install OS dependencies with
`npm run test:browsers:install -- --with-deps` (used by CI). The static test server
starts and stops automatically. `PDFDELTA_TEST_URL` optionally targets a published
deployment. `PLAYWRIGHT_BROWSERS_PATH` can override the project-local runtime path.

The suite runs Chromium, Firefox and WebKit at desktop (1440×1050) and mobile
(390×844) sizes. Mobile cases use touch interactions; Firefox uses a narrow viewport
because Playwright does not support Firefox's mobile emulation option. This is not
physical-device testing and the WebKit runtime is not the Safari application.

Covered journeys:

- Home → demonstration PDF → rotate → undo/redo → real download → upload the
  downloaded file in a fresh tab. Output page count, rotations and extracted text
  are checked independently with pdf-lib and PDF.js.
- Invalid PDF → visible, focused error inside the viewport → choose another file
  → successful import, without horizontal overflow.
- Synthetic owner-restricted PDF → local decryption → rotation → failed import of
  a password-protected document preserves the existing pages → downloadable,
  readable output. The source is unchanged and no external requests are allowed.

HTML report: `dist/browser-report/index.html`. JSON, exported PDFs and failure
traces: `dist/browser-results/`. Successful cases attach desktop/mobile screenshots
and PDF inspection results. Opening/export timings describe synthetic fixtures on
the test machine and are not general performance guarantees.

GitHub Actions runs an independent Linux matrix for the three engines. Pages
deployment requires this matrix **and** the existing Windows verification to pass.
