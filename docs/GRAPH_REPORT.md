# Graph Report - .  (2026-09-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 410 nodes · 1012 edges · 30 communities (25 shown, 5 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c6911c9a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- downloadBlob
- app.js
- PageHistory
- isToolCompatible
- package.json
- verify-account.test.mjs
- verify-local.js
- finishEditorStroke
- extractTextFromPdfFile
- audit-zero-cost.js
- verify-security.test.js
- vendor-qpdf.mjs
- escapeHtml
- vendor-pdfjs.mjs
- vercel.json
- collectPdfNameTreeNames
- pageSizeReport
- generate-encrypted.mjs
- docxDocumentXml
- toggleFavorite
- verify-browsers.mjs
- sw.js
- blankPageIndicesFromRenderDoc
- blankPdf
- enhanceCanvas
- playwright.config.mjs

## God Nodes (most connected - your core abstractions)
1. `downloadBlob()` - 77 edges
2. `getPdfFiles()` - 72 edges
3. `sanitizeFileName()` - 60 edges
4. `savePdfBytes()` - 58 edges
5. `zipOutputs()` - 54 edges
6. `loadPdf()` - 41 edges
7. `renderPdfPageCanvas()` - 15 edges
8. `PageHistory` - 15 edges
9. `isToolCompatible()` - 13 edges
10. `renderFiles()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `saveEditedPdf()` --calls--> `annotationGeometry()`  [EXTRACTED]
  app.js → editor-geometry.mjs
- `initAccount()` --calls--> `createPreferenceJournal()`  [EXTRACTED]
  account.mjs → account-preferences.mjs
- `initAccount()` --calls--> `createPreferenceSync()`  [EXTRACTED]
  account.mjs → account-preferences.mjs
- `initFlow()` --calls--> `createHome()`  [EXTRACTED]
  workspace-flow.mjs → home.mjs
- `initWorkspace()` --calls--> `viewportFor()`  [EXTRACTED]
  workspace.mjs → pdf-engine.mjs

## Import Cycles
- None detected.

## Communities (30 total, 5 thin omitted)

### Community 0 - "downloadBlob"
Cohesion: 0.11
Nodes (83): addBlankPages(), addMargins(), attachFilesToPdf(), attachmentsReport(), auditAccessibility(), autoTrim(), batesNumbering(), booklet() (+75 more)

### Community 1 - "app.js"
Cohesion: 0.03
Nodes (52): canvasToGrayscale(), catalogInsights, categories, categoryBar, clearQueueButton, compatibilityNote, drawCropMarkLines(), dropzone (+44 more)

### Community 2 - "PageHistory"
Cohesion: 0.08
Nodes (16): annotationGeometry(), createPageRenderer(), base, limits, normalizedFiles, readBytes(), readEditable(), readEditableSource() (+8 more)

### Community 3 - "isToolCompatible"
Cohesion: 0.12
Nodes (31): addFiles(), compatibilityMessage(), fileExt(), firstCompatibleSuggestion(), formatBytes(), getFileProfile(), getImageFiles(), getOptions() (+23 more)

### Community 4 - "package.json"
Cohesion: 0.07
Nodes (26): esbuild, author, bugs, url, dependencies, @supabase/supabase-js, description, devDependencies (+18 more)

### Community 5 - "verify-account.test.mjs"
Cohesion: 0.11
Nodes (13): accountConfig, initAccount(), cleanPreferences(), createPreferenceJournal(), createPreferenceSync(), createHome(), active, report (+5 more)

### Community 6 - "verify-local.js"
Cohesion: 0.12
Nodes (18): test, cdpJson(), fs, http, main(), mimeType(), os, path (+10 more)

### Community 7 - "finishEditorStroke"
Cohesion: 0.15
Nodes (16): clearCurrentEditorPage(), drawEditorOverlay(), editorCanvasPoint(), finishEditorStroke(), openPdfEditorTool(), renderEditorPage(), renderEditorPreview, resetEditor() (+8 more)

### Community 8 - "extractTextFromPdfFile"
Cohesion: 0.20
Nodes (11): csvCell(), csvDate(), documentReport(), extractedTextBody(), extractTextFromPdfFile(), joinPdfTextLine(), pdfTextItemsToLines(), pdfToWord() (+3 more)

### Community 9 - "audit-zero-cost.js"
Cohesion: 0.20
Nodes (8): blockedRuntimePatterns, failures, files, fs, ignoredDirs, path, runtimeFiles, textExtensions

### Community 10 - "verify-security.test.js"
Cohesion: 0.20
Nodes (6): assert, { createHash }, fs, path, { test }, vm

### Community 11 - "vendor-qpdf.mjs"
Cohesion: 0.25
Nodes (5): files, glue, target, upstreamGlueSha256, wanted

### Community 12 - "escapeHtml"
Cohesion: 0.40
Nodes (6): compareCanvases(), compareText(), compareVisual(), diffLines(), escapeHtml(), renderPageForCompare()

### Community 13 - "vendor-pdfjs.mjs"
Cohesion: 0.33
Nodes (5): archive, dest, files, manifest, root

### Community 14 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, $schema

### Community 15 - "collectPdfNameTreeNames"
Cohesion: 0.50
Nodes (5): collectPdfNameTreeNames(), embeddedFileNames(), lookupPdfKey(), pdfArrayItem(), pdfObjectText()

### Community 16 - "pageSizeReport"
Cohesion: 0.40
Nodes (5): csvValue(), detectPageFormat(), getPageSizeInfo(), pageSizeReport(), pointsToMm()

### Community 17 - "generate-encrypted.mjs"
Cohesion: 0.40
Nodes (4): field, { PDFDocument, StandardFonts, PDFName }, require, root

### Community 18 - "docxDocumentXml"
Cohesion: 0.50
Nodes (4): docxDocumentXml(), docxParagraph(), makeDocxBlob(), xmlEscape()

### Community 19 - "toggleFavorite"
Cohesion: 0.50
Nodes (4): renderCategories(), saveFavorites(), setFilter(), toggleFavorite()

### Community 20 - "verify-browsers.mjs"
Cohesion: 0.50
Nodes (3): args, child, cli

## Knowledge Gaps
- **118 isolated node(s):** `editorHistory`, `signatureDraft`, `signatureFaces`, `categories`, `state` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `tools` connect `verify-account.test.mjs` to `app.js`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `AnnotationHistory` connect `finishEditorStroke` to `app.js`, `PageHistory`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `editorHistory`, `signatureDraft`, `signatureFaces` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `downloadBlob` be split into smaller, more focused modules?**
  _Cohesion score 0.10990302674111078 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.034482758620689655 - nodes in this community are weakly interconnected._
- **Should `PageHistory` be split into smaller, more focused modules?**
  _Cohesion score 0.08250355618776671 - nodes in this community are weakly interconnected._
- **Should `isToolCompatible` be split into smaller, more focused modules?**
  _Cohesion score 0.12043010752688173 - nodes in this community are weakly interconnected._