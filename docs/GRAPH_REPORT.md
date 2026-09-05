# Graph Report - .  (2026-09-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 294 nodes · 856 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 89 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6270bece`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- downloadBlob
- app.js
- PageHistory
- isToolCompatible
- verify-local.js
- renderPdfPageCanvas
- extractTextFromPdfFile
- openPdfEditorTool
- removeAttachments
- fileExt
- audit-zero-cost.js
- escapeHtml
- verify-security.test.js
- vendor-pdfjs.mjs
- pageSizeReport
- toggleFavorite
- docxDocumentXml
- textToPdf
- sw.js
- blankPdf
- tool-catalog.mjs

## God Nodes (most connected - your core abstractions)
1. `downloadBlob()` - 77 edges
2. `getPdfFiles()` - 72 edges
3. `sanitizeFileName()` - 60 edges
4. `savePdfBytes()` - 58 edges
5. `zipOutputs()` - 54 edges
6. `loadPdf()` - 41 edges
7. `renderPdfPageCanvas()` - 15 edges
8. `PageHistory` - 14 edges
9. `isToolCompatible()` - 13 edges
10. `renderFiles()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `initWorkspace()` --calls--> `viewportFor()`  [EXTRACTED]
  workspace.mjs → pdf-engine.mjs
- `main()` --calls--> `cdpJson()`  [EXTRACTED]
  verify-workspace.cjs → verify-local.js
- `main()` --calls--> `startStaticServer()`  [EXTRACTED]
  verify-workspace.cjs → verify-local.js

## Import Cycles
- None detected.

## Communities (23 total, 3 thin omitted)

### Community 0 - "downloadBlob"
Cohesion: 0.16
Nodes (60): addBlankPages(), addMargins(), attachFilesToPdf(), autoTrim(), batesNumbering(), booklet(), cleanActions(), cleanMetadata() (+52 more)

### Community 1 - "app.js"
Cohesion: 0.04
Nodes (47): catalogInsights, categories, categoryBar, clearQueueButton, compatibilityNote, drawCropMarkLines(), dropzone, editorClear (+39 more)

### Community 2 - "PageHistory"
Cohesion: 0.13
Nodes (9): base, limits, readBytes(), readEditable(), tasks, viewportFor(), make(), initWorkspace() (+1 more)

### Community 3 - "isToolCompatible"
Cohesion: 0.20
Nodes (19): addFiles(), compatibilityMessage(), firstCompatibleSuggestion(), getFileProfile(), isToolCompatible(), matchesTool(), profileSummaryText(), renderCatalogInsights() (+11 more)

### Community 4 - "verify-local.js"
Cohesion: 0.16
Nodes (17): cdpJson(), fs, http, main(), mimeType(), os, path, { spawn } (+9 more)

### Community 5 - "renderPdfPageCanvas"
Cohesion: 0.16
Nodes (18): blankPageIndicesFromRenderDoc(), canvasHasVisibleInk(), canvasToBlob(), canvasToGrayscale(), canvasToImageBytes(), canvasToPngBytes(), clampChannel(), enhanceCanvas() (+10 more)

### Community 6 - "extractTextFromPdfFile"
Cohesion: 0.17
Nodes (13): auditAccessibility(), csvCell(), csvDate(), documentReport(), extractedTextBody(), extractTextFromPdfFile(), joinPdfTextLine(), makeDocxBlob() (+5 more)

### Community 7 - "openPdfEditorTool"
Cohesion: 0.22
Nodes (11): clearCurrentEditorPage(), drawEditorOverlay(), editorCanvasPoint(), openPdfEditorTool(), renderEditorPage(), resetEditor(), safePdfText(), saveEditedPdf() (+3 more)

### Community 8 - "removeAttachments"
Cohesion: 0.27
Nodes (10): attachmentsReport(), collectPdfNameTreeNames(), deletePdfKeys(), embeddedFileNames(), lookupPdfKey(), pdfArrayItem(), pdfName(), pdfObjectText() (+2 more)

### Community 9 - "fileExt"
Cohesion: 0.27
Nodes (10): fileExt(), formatBytes(), getImageFiles(), imageStamp(), imageStampPosition(), imagesToPdf(), mergeMixedFiles(), metadataReport() (+2 more)

### Community 10 - "audit-zero-cost.js"
Cohesion: 0.20
Nodes (8): blockedRuntimePatterns, failures, files, fs, ignoredDirs, path, runtimeFiles, textExtensions

### Community 11 - "escapeHtml"
Cohesion: 0.29
Nodes (8): compareCanvases(), compareText(), compareVisual(), diffLines(), escapeHtml(), getOptions(), renderPageForCompare(), runSelectedTool()

### Community 12 - "verify-security.test.js"
Cohesion: 0.25
Nodes (6): assert, { createHash }, fs, path, { test }, vm

### Community 13 - "vendor-pdfjs.mjs"
Cohesion: 0.33
Nodes (5): archive, dest, files, manifest, root

### Community 14 - "pageSizeReport"
Cohesion: 0.40
Nodes (5): csvValue(), detectPageFormat(), getPageSizeInfo(), pageSizeReport(), pointsToMm()

### Community 15 - "toggleFavorite"
Cohesion: 0.50
Nodes (4): renderCategories(), saveFavorites(), setFilter(), toggleFavorite()

### Community 16 - "docxDocumentXml"
Cohesion: 0.67
Nodes (3): docxDocumentXml(), docxParagraph(), xmlEscape()

### Community 17 - "textToPdf"
Cohesion: 0.67
Nodes (3): getTextFiles(), textToPdf(), wrapText()

## Knowledge Gaps
- **71 isolated node(s):** `categories`, `state`, `grid`, `categoryBar`, `searchInput` (+66 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `downloadBlob()` connect `downloadBlob` to `app.js`, `isToolCompatible`, `renderPdfPageCanvas`, `extractTextFromPdfFile`, `openPdfEditorTool`, `removeAttachments`, `fileExt`, `escapeHtml`, `pageSizeReport`, `textToPdf`, `blankPdf`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `getPdfFiles()` connect `downloadBlob` to `app.js`, `isToolCompatible`, `renderPdfPageCanvas`, `extractTextFromPdfFile`, `openPdfEditorTool`, `removeAttachments`, `fileExt`, `escapeHtml`, `pageSizeReport`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `savePdfBytes()` connect `downloadBlob` to `app.js`, `renderPdfPageCanvas`, `openPdfEditorTool`, `removeAttachments`, `fileExt`, `textToPdf`, `blankPdf`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `categories`, `state`, `grid` to the rest of the system?**
  _71 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0392156862745098 - nodes in this community are weakly interconnected._
- **Should `PageHistory` be split into smaller, more focused modules?**
  _Cohesion score 0.13230769230769232 - nodes in this community are weakly interconnected._