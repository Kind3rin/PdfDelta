# Third-party browser libraries

These files are served as static assets by PdfDelta to avoid runtime CDN dependency.

Manrope variable font: `fonts/manrope-variable.ttf`, SIL Open Font License 1.1
(`fonts/OFL-Manrope.txt`). Source: https://github.com/google/fonts/tree/main/ofl/manrope.
Served locally, including offline; no font CDN requests.

| File | Package | Version | License | Source |
| --- | --- | --- | --- | --- |
| `pdf-lib.min.js` | pdf-lib | 1.17.1 | MIT | https://pdf-lib.js.org/ |
| `jszip.min.js` | JSZip | 3.10.1 | MIT or GPLv3 | https://stuk.github.io/jszip/ |
| `pdfjs/build/pdf.min.mjs` | PDF.js | 6.3.289 | Apache-2.0 | https://github.com/mozilla/pdf.js/releases/tag/v6.3.289 |
| `pdfjs/build/pdf.worker.min.mjs` | PDF.js worker | 6.3.289 | Apache-2.0 | https://github.com/mozilla/pdf.js/releases/tag/v6.3.289 |
| `qrcode-generator.js` | qrcode-generator | 1.4.4 | MIT | https://github.com/kazuhikoarase/qrcode-generator |

PDF.js local auxiliary assets: `pdfjs/cmaps`, `pdfjs/standard_fonts`, `pdfjs/wasm`,
`pdfjs/iccs`. License files are preserved in those directories and `pdfjs/LICENSE`.
Pinned archive integrity and per-file SHA-256: `pdfjs-manifest.json`.
Rebuild: `node scripts/vendor-pdfjs.mjs` (Node 22 and tar; network only at vendoring time).
