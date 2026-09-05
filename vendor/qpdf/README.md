# Local PDF normalization

The browser loads qpdf only after pdf-lib identifies an encrypted document.
`pdf-unlock-worker.mjs` produces an unencrypted working copy entirely in memory.
The user's original File is not modified. Passwords are not sent, logged or stored.

## Provenance and licenses

- Engine: qpdf 12.3.2, Apache-2.0 (LICENSE.txt and NOTICE-qpdf.md).
- WASM distribution: pdfstudio 0.4.0 by Fayaz Ahmed, Apache-2.0.
- Emscripten glue: `dist/wasm/qpdf.js`, renamed `qpdf.mjs` for ESM and patched
  to cap heap growth at 512 MiB. The patch is exact-match checked by the vendor
  script; the manifest records upstream and final hashes. WASM bytes are unchanged.
- Bundled native crypto, zlib (zlib license), IJG libjpeg (LICENSE-jpeg.txt).
  This software is based in part on the work of the Independent JPEG Group.
- `manifest.json` records the pinned npm archive integrity and every asset hash.
- Run `node scripts/vendor-qpdf.mjs` to reproduce the vendor copy. No npm lifecycle
  scripts execute. Upstream build instructions are linked in the manifest.

## Security review, 2026-09-05

Primary sources checked:

- https://github.com/qpdf/qpdf/security/advisories (no published advisories).
- https://qpdf.readthedocs.io/en/stable/release-notes.html
- https://qpdf.readthedocs.io/en/stable/encryption.html

This port uses 12.3.2, not the newer native release 12.4.1. Version 12.4.0 adds
further recursion/page-tree limits and handling of malformed AcroForm hierarchies.
An upgrade of the WASM build remains necessary when a reviewed build is available.
The adapter uses a disposable Worker, a 60-second default timeout, 100 MB input
and output limits, and leaves compressed streams encoded during normalization.
The allocator's heap growth is capped at 512 MiB. This is not a hard process-memory
limit: JavaScript, MEMFS file copies and the browser need additional memory.
A Worker timeout cannot prevent every transient memory peak.

No rasterization or replacement of text with images takes place. Rewriting a PDF
can invalidate existing digital signatures; the original remains the only exact
original copy. Unsupported security handlers or files requiring a nonempty
password are reported explicitly by the application.
