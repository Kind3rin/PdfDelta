# Graph Report - .  (2026-09-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 301 nodes · 863 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 89 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `434d36c8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- downloadBlob
- app.js
- isToolCompatible
- PageHistory
- verify-local.js
- renderPdfPageCanvas
- extractTextFromPdfFile
- openPdfEditorTool
- removeAttachments
- fileExt
- audit-zero-cost.js
- verify-security.test.js
- report-output-verification.mjs
- vendor-pdfjs.mjs
- pageSizeReport
- docxDocumentXml
- compareVisual
- textToPdf
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
Cohesion: 0.16
Nodes (61): addBlankPages(), addMargins(), attachFilesToPdf(), autoTrim(), batesNumbering(), booklet(), cleanActions(), cleanMetadata() (+53 more)

### Community 1 - "app.js"
Cohesion: 0.04
Nodes (48): canvasToGrayscale(), catalogInsights, categories, categoryBar, clearQueueButton, compatibilityNote, drawCropMarkLines(), dropzone (+40 more)

### Community 2 - "isToolCompatible"
Cohesion: 0.13
Nodes (28): addFiles(), compareText(), compatibilityMessage(), diffLines(), escapeHtml(), firstCompatibleSuggestion(), getFileProfile(), getOptions() (+20 more)

### Community 3 - "PageHistory"
Cohesion: 0.13
Nodes (9): base, limits, readBytes(), readEditable(), tasks, viewportFor(), make(), initWorkspace() (+1 more)

### Community 4 - "verify-local.js"
Cohesion: 0.16
Nodes (17): cdpJson(), fs, http, main(), mimeType(), os, path, { spawn } (+9 more)

### Community 5 - "renderPdfPageCanvas"
Cohesion: 0.21
Nodes (14): blankPageIndicesFromRenderDoc(), canvasHasVisibleInk(), canvasToBlob(), canvasToImageBytes(), canvasToPngBytes(), enhanceScan(), pdfToImages(), pdfToJpg() (+6 more)

### Community 6 - "extractTextFromPdfFile"
Cohesion: 0.18
Nodes (12): auditAccessibility(), csvCell(), csvDate(), documentReport(), extractedTextBody(), extractTextFromPdfFile(), joinPdfTextLine(), pdfTextItemsToLines() (+4 more)

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

### Community 11 - "verify-security.test.js"
Cohesion: 0.25
Nodes (6): assert, { createHash }, fs, path, { test }, vm

### Community 12 - "report-output-verification.mjs"
Cohesion: 0.40
Nodes (4): active, report, rows, tools

### Community 13 - "vendor-pdfjs.mjs"
Cohesion: 0.33
Nodes (5): archive, dest, files, manifest, root

### Community 14 - "pageSizeReport"
Cohesion: 0.40
Nodes (5): csvValue(), detectPageFormat(), getPageSizeInfo(), pageSizeReport(), pointsToMm()

### Community 15 - "docxDocumentXml"
Cohesion: 0.50
Nodes (4): docxDocumentXml(), docxParagraph(), makeDocxBlob(), xmlEscape()

### Community 16 - "compareVisual"
Cohesion: 0.67
Nodes (3): compareCanvases(), compareVisual(), renderPageForCompare()

### Community 17 - "textToPdf"
Cohesion: 0.67
Nodes (3): getTextFiles(), textToPdf(), wrapText()

## Knowledge Gaps
- **74 isolated node(s):** `categories`, `state`, `grid`, `categoryBar`, `searchInput` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `downloadBlob()` connect `downloadBlob` to `app.js`, `isToolCompatible`, `renderPdfPageCanvas`, `extractTextFromPdfFile`, `openPdfEditorTool`, `removeAttachments`, `fileExt`, `pageSizeReport`, `compareVisual`, `textToPdf`, `blankPdf`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `getPdfFiles()` connect `downloadBlob` to `app.js`, `isToolCompatible`, `renderPdfPageCanvas`, `extractTextFromPdfFile`, `openPdfEditorTool`, `removeAttachments`, `fileExt`, `pageSizeReport`, `compareVisual`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `tools` connect `report-output-verification.mjs` to `app.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `categories`, `state`, `grid` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.038461538461538464 - nodes in this community are weakly interconnected._
- **Should `isToolCompatible` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._
- **Should `PageHistory` be split into smaller, more focused modules?**
  _Cohesion score 0.12535612535612536 - nodes in this community are weakly interconnected._