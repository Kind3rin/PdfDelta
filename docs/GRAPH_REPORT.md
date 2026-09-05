# Graph Report - .  (2026-09-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 316 nodes · 884 edges · 23 communities (21 shown, 2 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d2ac7ef0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- downloadBlob
- app.js
- PageHistory
- isToolCompatible
- verify-local.js
- extractTextFromPdfFile
- renderPdfPageCanvas
- setEditorStatus
- removeAttachments
- fileExt
- audit-zero-cost.js
- report-output-verification.mjs
- verify-security.test.js
- escapeHtml
- vendor-pdfjs.mjs
- vercel.json
- pageSizeReport
- toggleFavorite
- textToPdf
- sw.js
- blankPdf

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

## Communities (23 total, 2 thin omitted)

### Community 0 - "downloadBlob"
Cohesion: 0.16
Nodes (61): addBlankPages(), addMargins(), attachFilesToPdf(), autoTrim(), batesNumbering(), booklet(), cleanActions(), cleanMetadata() (+53 more)

### Community 1 - "app.js"
Cohesion: 0.04
Nodes (51): canvasToGrayscale(), catalogInsights, categories, categoryBar, clearQueueButton, compatibilityNote, drawCropMarkLines(), dropzone (+43 more)

### Community 2 - "PageHistory"
Cohesion: 0.12
Nodes (10): base, limits, readBytes(), readEditable(), tasks, viewportAtScale(), viewportFor(), make() (+2 more)

### Community 3 - "isToolCompatible"
Cohesion: 0.18
Nodes (22): addFiles(), compatibilityMessage(), firstCompatibleSuggestion(), getFileProfile(), getOptions(), isToolCompatible(), matchesTool(), profileSummaryText() (+14 more)

### Community 4 - "verify-local.js"
Cohesion: 0.16
Nodes (17): cdpJson(), fs, http, main(), mimeType(), os, path, { spawn } (+9 more)

### Community 5 - "extractTextFromPdfFile"
Cohesion: 0.13
Nodes (16): auditAccessibility(), csvCell(), csvDate(), documentReport(), docxDocumentXml(), docxParagraph(), extractedTextBody(), extractTextFromPdfFile() (+8 more)

### Community 6 - "renderPdfPageCanvas"
Cohesion: 0.17
Nodes (16): blankPageIndicesFromRenderDoc(), canvasHasVisibleInk(), canvasToBlob(), canvasToImageBytes(), canvasToPngBytes(), clampChannel(), enhanceCanvas(), enhanceScan() (+8 more)

### Community 7 - "setEditorStatus"
Cohesion: 0.24
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

### Community 11 - "report-output-verification.mjs"
Cohesion: 0.29
Nodes (6): createHome(), active, report, rows, tools, initFlow()

### Community 12 - "verify-security.test.js"
Cohesion: 0.25
Nodes (6): assert, { createHash }, fs, path, { test }, vm

### Community 13 - "escapeHtml"
Cohesion: 0.40
Nodes (6): compareCanvases(), compareText(), compareVisual(), diffLines(), escapeHtml(), renderPageForCompare()

### Community 14 - "vendor-pdfjs.mjs"
Cohesion: 0.33
Nodes (5): archive, dest, files, manifest, root

### Community 15 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, $schema

### Community 16 - "pageSizeReport"
Cohesion: 0.40
Nodes (5): csvValue(), detectPageFormat(), getPageSizeInfo(), pageSizeReport(), pointsToMm()

### Community 17 - "toggleFavorite"
Cohesion: 0.50
Nodes (4): renderCategories(), saveFavorites(), setFilter(), toggleFavorite()

### Community 18 - "textToPdf"
Cohesion: 0.67
Nodes (3): getTextFiles(), textToPdf(), wrapText()

## Knowledge Gaps
- **82 isolated node(s):** `signatureDraft`, `signatureFaces`, `categories`, `state`, `grid` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `tools` connect `report-output-verification.mjs` to `app.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `downloadBlob()` connect `downloadBlob` to `app.js`, `isToolCompatible`, `extractTextFromPdfFile`, `renderPdfPageCanvas`, `setEditorStatus`, `removeAttachments`, `fileExt`, `escapeHtml`, `pageSizeReport`, `textToPdf`, `blankPdf`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `getPdfFiles()` connect `downloadBlob` to `app.js`, `isToolCompatible`, `extractTextFromPdfFile`, `renderPdfPageCanvas`, `setEditorStatus`, `removeAttachments`, `fileExt`, `escapeHtml`, `pageSizeReport`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `signatureDraft`, `signatureFaces`, `categories` to the rest of the system?**
  _82 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._
- **Should `PageHistory` be split into smaller, more focused modules?**
  _Cohesion score 0.1164021164021164 - nodes in this community are weakly interconnected._
- **Should `extractTextFromPdfFile` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._