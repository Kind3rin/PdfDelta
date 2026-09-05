# Graph Report - .  (2026-09-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 362 nodes · 944 edges · 25 communities (21 shown, 4 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b49e825e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- downloadBlob
- app.js
- isToolCompatible
- PageHistory
- verify-account.test.mjs
- package.json
- verify-local.js
- extractTextFromPdfFile
- setEditorStatus
- removeAttachments
- audit-zero-cost.js
- verify-security.test.js
- vendor-pdfjs.mjs
- vercel.json
- pageSizeReport
- toggleFavorite
- compareVisual
- textToPdf
- sw.js
- blankPageIndicesFromRenderDoc
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

## Communities (25 total, 4 thin omitted)

### Community 0 - "downloadBlob"
Cohesion: 0.14
Nodes (71): addBlankPages(), addMargins(), attachFilesToPdf(), autoTrim(), batesNumbering(), booklet(), canvasToBlob(), canvasToImageBytes() (+63 more)

### Community 1 - "app.js"
Cohesion: 0.03
Nodes (53): canvasToGrayscale(), catalogInsights, categories, categoryBar, clearQueueButton, compatibilityNote, drawCropMarkLines(), dropzone (+45 more)

### Community 2 - "isToolCompatible"
Cohesion: 0.10
Nodes (35): addFiles(), compareText(), compatibilityMessage(), diffLines(), escapeHtml(), fileExt(), firstCompatibleSuggestion(), formatBytes() (+27 more)

### Community 3 - "PageHistory"
Cohesion: 0.10
Nodes (12): annotationGeometry(), createPageRenderer(), base, limits, readBytes(), readEditable(), tasks, viewportAtScale() (+4 more)

### Community 4 - "verify-account.test.mjs"
Cohesion: 0.11
Nodes (13): accountConfig, initAccount(), cleanPreferences(), createPreferenceJournal(), createPreferenceSync(), createHome(), active, report (+5 more)

### Community 5 - "package.json"
Cohesion: 0.09
Nodes (22): esbuild, author, bugs, url, dependencies, @supabase/supabase-js, description, devDependencies (+14 more)

### Community 6 - "verify-local.js"
Cohesion: 0.16
Nodes (17): cdpJson(), fs, http, main(), mimeType(), os, path, { spawn } (+9 more)

### Community 7 - "extractTextFromPdfFile"
Cohesion: 0.13
Nodes (16): auditAccessibility(), csvCell(), csvDate(), documentReport(), docxDocumentXml(), docxParagraph(), extractedTextBody(), extractTextFromPdfFile() (+8 more)

### Community 8 - "setEditorStatus"
Cohesion: 0.21
Nodes (12): clearCurrentEditorPage(), drawEditorOverlay(), editorCanvasPoint(), openPdfEditorTool(), renderEditorPage(), renderEditorPreview, resetEditor(), safePdfText() (+4 more)

### Community 9 - "removeAttachments"
Cohesion: 0.27
Nodes (10): attachmentsReport(), collectPdfNameTreeNames(), deletePdfKeys(), embeddedFileNames(), lookupPdfKey(), pdfArrayItem(), pdfName(), pdfObjectText() (+2 more)

### Community 10 - "audit-zero-cost.js"
Cohesion: 0.20
Nodes (8): blockedRuntimePatterns, failures, files, fs, ignoredDirs, path, runtimeFiles, textExtensions

### Community 11 - "verify-security.test.js"
Cohesion: 0.25
Nodes (6): assert, { createHash }, fs, path, { test }, vm

### Community 12 - "vendor-pdfjs.mjs"
Cohesion: 0.33
Nodes (5): archive, dest, files, manifest, root

### Community 13 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, $schema

### Community 14 - "pageSizeReport"
Cohesion: 0.40
Nodes (5): csvValue(), detectPageFormat(), getPageSizeInfo(), pageSizeReport(), pointsToMm()

### Community 15 - "toggleFavorite"
Cohesion: 0.50
Nodes (4): renderCategories(), saveFavorites(), setFilter(), toggleFavorite()

### Community 16 - "compareVisual"
Cohesion: 0.67
Nodes (3): compareCanvases(), compareVisual(), renderPageForCompare()

### Community 17 - "textToPdf"
Cohesion: 0.67
Nodes (3): getTextFiles(), textToPdf(), wrapText()

## Knowledge Gaps
- **99 isolated node(s):** `signatureDraft`, `signatureFaces`, `categories`, `state`, `grid` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `tools` connect `verify-account.test.mjs` to `app.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `annotationGeometry()` connect `PageHistory` to `setEditorStatus`, `app.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `signatureDraft`, `signatureFaces`, `categories` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `downloadBlob` be split into smaller, more focused modules?**
  _Cohesion score 0.13601609657947686 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.03389830508474576 - nodes in this community are weakly interconnected._
- **Should `isToolCompatible` be split into smaller, more focused modules?**
  _Cohesion score 0.10420168067226891 - nodes in this community are weakly interconnected._
- **Should `PageHistory` be split into smaller, more focused modules?**
  _Cohesion score 0.09659090909090909 - nodes in this community are weakly interconnected._