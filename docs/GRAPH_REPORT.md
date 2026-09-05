# Graph Report - .  (2026-09-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 351 nodes · 923 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05b82761`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- downloadBlob
- app.js
- isToolCompatible
- PageHistory
- package.json
- account.mjs
- verify-local.js
- renderPdfPageCanvas
- extractTextFromPdfFile
- setEditorStatus
- audit-zero-cost.js
- verify-security.test.js
- escapeHtml
- vendor-pdfjs.mjs
- vercel.json
- collectPdfNameTreeNames
- pageSizeReport
- toggleFavorite
- sw.js
- blankPdf
- enhanceCanvas

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
- `initAccount()` --calls--> `createPreferenceSync()`  [EXTRACTED]
  account.mjs → account-preferences.mjs
- `initFlow()` --calls--> `createHome()`  [EXTRACTED]
  workspace-flow.mjs → home.mjs
- `initWorkspace()` --calls--> `viewportFor()`  [EXTRACTED]
  workspace.mjs → pdf-engine.mjs
- `main()` --calls--> `cdpJson()`  [EXTRACTED]
  verify-workspace.cjs → verify-local.js
- `main()` --calls--> `startStaticServer()`  [EXTRACTED]
  verify-workspace.cjs → verify-local.js

## Import Cycles
- None detected.

## Communities (24 total, 3 thin omitted)

### Community 0 - "downloadBlob"
Cohesion: 0.14
Nodes (66): addBlankPages(), addMargins(), attachFilesToPdf(), attachmentsReport(), autoTrim(), batesNumbering(), booklet(), cleanActions() (+58 more)

### Community 1 - "app.js"
Cohesion: 0.04
Nodes (49): catalogInsights, categories, categoryBar, clearQueueButton, compatibilityNote, drawCropMarkLines(), dropzone, editorClear (+41 more)

### Community 2 - "isToolCompatible"
Cohesion: 0.11
Nodes (33): addFiles(), compatibilityMessage(), fileExt(), firstCompatibleSuggestion(), formatBytes(), getFileProfile(), getImageFiles(), getOptions() (+25 more)

### Community 3 - "PageHistory"
Cohesion: 0.12
Nodes (10): base, limits, readBytes(), readEditable(), tasks, viewportAtScale(), viewportFor(), make() (+2 more)

### Community 4 - "package.json"
Cohesion: 0.09
Nodes (22): esbuild, author, bugs, url, dependencies, @supabase/supabase-js, description, devDependencies (+14 more)

### Community 5 - "account.mjs"
Cohesion: 0.14
Nodes (12): accountConfig, initAccount(), cleanPreferences(), createPreferenceSync(), createHome(), active, report, rows (+4 more)

### Community 6 - "verify-local.js"
Cohesion: 0.16
Nodes (17): cdpJson(), fs, http, main(), mimeType(), os, path, { spawn } (+9 more)

### Community 7 - "renderPdfPageCanvas"
Cohesion: 0.16
Nodes (18): blankPageIndicesFromRenderDoc(), canvasHasVisibleInk(), canvasToBlob(), canvasToGrayscale(), canvasToImageBytes(), canvasToPngBytes(), contactSheet(), enhanceScan() (+10 more)

### Community 8 - "extractTextFromPdfFile"
Cohesion: 0.13
Nodes (16): auditAccessibility(), csvCell(), csvDate(), documentReport(), docxDocumentXml(), docxParagraph(), extractedTextBody(), extractTextFromPdfFile() (+8 more)

### Community 9 - "setEditorStatus"
Cohesion: 0.24
Nodes (11): clearCurrentEditorPage(), drawEditorOverlay(), editorCanvasPoint(), openPdfEditorTool(), renderEditorPage(), resetEditor(), safePdfText(), saveEditedPdf() (+3 more)

### Community 10 - "audit-zero-cost.js"
Cohesion: 0.20
Nodes (8): blockedRuntimePatterns, failures, files, fs, ignoredDirs, path, runtimeFiles, textExtensions

### Community 11 - "verify-security.test.js"
Cohesion: 0.25
Nodes (6): assert, { createHash }, fs, path, { test }, vm

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

### Community 17 - "toggleFavorite"
Cohesion: 0.50
Nodes (4): renderCategories(), saveFavorites(), setFilter(), toggleFavorite()

## Knowledge Gaps
- **99 isolated node(s):** `signatureDraft`, `signatureFaces`, `categories`, `state`, `grid` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `tools` connect `account.mjs` to `app.js`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `downloadBlob()` connect `downloadBlob` to `app.js`, `isToolCompatible`, `renderPdfPageCanvas`, `extractTextFromPdfFile`, `setEditorStatus`, `escapeHtml`, `pageSizeReport`, `blankPdf`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `getPdfFiles()` connect `downloadBlob` to `app.js`, `isToolCompatible`, `renderPdfPageCanvas`, `extractTextFromPdfFile`, `setEditorStatus`, `escapeHtml`, `pageSizeReport`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `signatureDraft`, `signatureFaces`, `categories` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `downloadBlob` be split into smaller, more focused modules?**
  _Cohesion score 0.14032634032634034 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.03636363636363636 - nodes in this community are weakly interconnected._
- **Should `isToolCompatible` be split into smaller, more focused modules?**
  _Cohesion score 0.11174242424242424 - nodes in this community are weakly interconnected._