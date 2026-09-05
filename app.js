import { tools } from "./tool-catalog.mjs";
const { PDFDocument, StandardFonts, rgb, degrees, PDFName } = window.PDFLib || {};


const FAVORITES_KEY = "pdfdelta-favorites";
let workspaceBusy = () => false;
let reusableSignature = null;
let editorSequence = 0;
let signatureDraft = [], signatureStroke = null;
const signatureFaces = { TimesRomanItalic: 'italic Georgia', HelveticaOblique: 'italic Arial', CourierOblique: 'italic Courier New' };

function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
  window.dispatchEvent(new Event('pdfdelta-preferences'));
}

const categories = ["Tutti", "Preferiti", "Organizza", "Ottimizza", "Converti", "Modifica", "Privacy", "Analisi", "Roadmap", "AI"];

const state = {
  busy: false,
  filter: "Tutti",
  query: "",
  selectedTool: null,
  files: [],
  favorites: loadFavorites(),
  lastDownloadUrl: null,
  editor: {
    file: null,
    pdfBytes: null,
    pdf: null,
    pageNumber: 1,
    pageCount: 0,
    mode: "text",
    marks: [],
    strokes: [],
    pageSize: { width: 0, height: 0 },
    canvasSize: { width: 0, height: 0 },
    drawing: false,
    currentStroke: null,
  },
};

const $ = (selector) => document.querySelector(selector);
const grid = $("#toolsGrid");
const categoryBar = $("#categoryBar");
const searchInput = $("#toolSearch");
const selectedTool = $("#selectedTool");
const toolOptions = $("#toolOptions");
const fileList = $("#fileList");
const runButton = $("#runTool");
const resultPanel = $("#resultPanel");
const dropzone = $("#dropzone");
const fileInput = $("#fileInput");
const clearQueueButton = $("#clearQueue");
const topbar = $(".topbar");
const smartSuggestions = $("#smartSuggestions");
const compatibilityNote = $("#compatibilityNote");
const queueSummary = $("#queueSummary");
const toolBrief = $("#toolBrief");
const catalogInsights = $("#catalogInsights");
const stepItems = Array.from(document.querySelectorAll(".step"));
const editorPanel = $("#editorPanel");
const editorStatus = $("#editorStatus");
const editorStage = $("#editorStage");
const pdfEditorCanvas = $("#pdfEditorCanvas");
const editorInkCanvas = $("#editorInkCanvas");
const editorTextInput = $("#editorTextInput");
const editorPageInfo = $("#editorPageInfo");
const editorModes = $("#editorModes");
const editorSave = $("#editorSave");
const editorClear = $("#editorClear");
const editorPrev = $("#editorPrev");
const editorNext = $("#editorNext");

function fileExt(file) {
  return (file.name.split(".").pop() || "").toLowerCase();
}

function sanitizeFileName(name) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "pdfdelta";
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getPdfFiles() {
  return state.files.filter((file) => fileExt(file) === "pdf");
}

function getImageFiles() {
  return state.files.filter((file) => ["jpg", "jpeg", "png"].includes(fileExt(file)));
}

function getTextFiles() {
  return state.files.filter((file) => fileExt(file) === "txt");
}

function isToolCompatible(tool) {
  if (!tool || tool.status === "bloccato") return false;

  const min = Object.hasOwn(tool, "minFiles") ? tool.minFiles : 1;
  const max = tool.maxFiles || Infinity;
  if (state.files.length < min || state.files.length > max) return false;
  if (!tool.accepts) return true;

  return state.files.every((file) => tool.accepts.includes(fileExt(file)));
}

function toolRequirementText(tool) {
  const accepts = tool.accepts?.length ? tool.accepts.map((item) => item.toUpperCase()).join(", ") : "qualsiasi file";
  const min = Object.hasOwn(tool, "minFiles") ? tool.minFiles : 1;
  const max = tool.maxFiles || Infinity;
  const count =
    max === Infinity
      ? min > 1
        ? `${min}+ file`
        : "1+ file"
      : min === max
        ? `${min} file`
        : `${min}-${max} file`;
  return `${accepts} · ${count}`;
}

function toolOutputText(tool) {
  const outputHints = {
    merge: "PDF unico",
    "merge-mixed": "PDF unico",
    interleave: "PDF fronte/retro",
    split: "ZIP con PDF separati",
    "split-ranges": "ZIP con PDF per range",
    "split-odd-even": "ZIP pari/dispari",
    "extract-pages": "PDF con pagine scelte",
    "remove-pages": "PDF ripulito",
    "reorder-pages": "PDF riordinato",
    "rotate": "PDF ruotato",
    "pdf-to-word": "DOCX testuale editabile",
    "pdf-to-jpg": "ZIP JPG",
    "pdf-to-images": "ZIP PNG",
    "pdf-to-webp": "ZIP WebP",
    "images-to-pdf": "PDF da immagini",
    "text-to-pdf": "PDF da TXT",
    "extract-text": "TXT",
    "pdf-to-markdown": "Markdown",
    "edit-pdf": "PDF compilato e firmato",
    "clean-metadata": "PDF con metadati puliti",
    "queue-report": "CSV coda",
    "document-report": "CSV documento",
    "word-count": "CSV parole",
    audit: "TXT audit base",
  };
  return outputHints[tool.id] || (tool.category === "Analisi" ? "Report locale" : "File scaricabile");
}

function getFileProfile() {
  const pdf = getPdfFiles().length;
  const images = getImageFiles().length;
  const text = getTextFiles().length;
  return {
    pdf,
    images,
    text,
    total: state.files.length,
    mixed: [pdf > 0, images > 0, text > 0].filter(Boolean).length > 1,
  };
}

function profileSummaryText(profile) {
  if (!profile.total) return "Nessun file in coda.";
  const parts = [];
  if (profile.pdf) parts.push(`${profile.pdf} PDF`);
  if (profile.images) parts.push(`${profile.images} immagini`);
  if (profile.text) parts.push(`${profile.text} TXT`);
  const unsupported = profile.total - profile.pdf - profile.images - profile.text;
  if (unsupported) parts.push(`${unsupported} non supportati`);
  return parts.join(", ");
}

function suggestionIds() {
  const profile = getFileProfile();
  if (!profile.total) return ["edit-pdf", "merge-mixed", "pdf-to-jpg", "images-to-pdf", "clean-metadata"];
  if (profile.images && !profile.pdf && !profile.text) return ["images-to-pdf", "merge-mixed", "queue-report"];
  if (profile.text && !profile.pdf && !profile.images) return ["text-to-pdf", "queue-report"];
  if (profile.mixed) return ["merge-mixed", "queue-report"];
  if (profile.pdf > 1) return ["merge", "merge-mixed", "interleave", "compress-scan", "queue-report"];
  if (profile.pdf === 1) return ["edit-pdf", "pdf-to-jpg", "pdf-to-word", "compress-scan", "clean-metadata"];
  return ["queue-report", "merge-mixed"];
}

function firstCompatibleSuggestion() {
  return suggestionIds()
    .map((id) => tools.find((tool) => tool.id === id))
    .find((tool) => tool && tool.status !== "bloccato" && (!state.files.length || isToolCompatible(tool)));
}

function renderQueueSummary() {
  if (!queueSummary) return;
  const profile = getFileProfile();
  if (!profile.total) {
    queueSummary.hidden = true;
    queueSummary.innerHTML = "";
    return;
  }

  const recommended = suggestionIds()
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool) => tool && isToolCompatible(tool))
    .slice(0, 3);

  queueSummary.hidden = false;
  queueSummary.innerHTML = `
    <div>
      <span>Coda pronta</span>
      <strong>${profileSummaryText(profile)}</strong>
    </div>
    <div class="queue-actions">
      ${recommended
        .map((tool) => `<button class="mini-action" type="button" data-tool-shortcut="${tool.id}">${tool.name}</button>`)
        .join("")}
    </div>
  `;
}

function updateStepStrip() {
  const activeIndex = resultPanel?.querySelector("a[download]")
    ? 2
    : isToolCompatible(state.selectedTool)
      ? 1
      : 0;
  stepItems.forEach((step, index) => {
    step.classList.toggle("active", index === activeIndex);
    step.classList.toggle("done", index < activeIndex);
  });
}

function renderSuggestions() {
  if (!smartSuggestions) return;
  smartSuggestions.innerHTML = suggestionIds()
    .map((id, index) => tools.find((tool) => tool.id === id))
    .filter(Boolean)
    .map((tool, index) => {
      const selected = state.selectedTool?.id === tool.id ? " selected" : "";
      const primary = index === 0 ? " primary" : "";
      const disabled = state.files.length && !isToolCompatible(tool) ? " disabled" : "";
      return `
        <button class="launcher-card${primary}${selected}${disabled}" type="button" data-tool-shortcut="${tool.id}">
          <span>${tool.category}</span>
          <strong>${tool.name}</strong>
        </button>
      `;
    })
    .join("");
}

function renderToolBrief() {
  if (!toolBrief) return;
  const tool = state.selectedTool;
  if (!tool) {
    toolBrief.hidden = true;
    toolBrief.innerHTML = "";
    return;
  }

  const ready = isToolCompatible(tool);
  const statusText =
    tool.status === "bloccato"
      ? "Non attivo: evitati costi/server"
      : ready
        ? "Pronto sul dispositivo"
        : `Serve ${toolRequirementText(tool).toLowerCase()}`;

  toolBrief.hidden = false;
  toolBrief.innerHTML = `
    <div>
      <span>Risultato</span>
      <strong>${toolOutputText(tool)}</strong>
    </div>
    <div>
      <span>Input</span>
      <strong>${toolRequirementText(tool)}</strong>
    </div>
    <div>
      <span>Stato</span>
      <strong>${statusText}</strong>
    </div>
  `;
}

function compatibilityMessage() {
  const tool = state.selectedTool;
  const profile = getFileProfile();
  if (!profile.total && !tool) return "Carica file o scegli una card consigliata.";
  if (!profile.total && tool) return `${tool.name}: carica ${toolRequirementText(tool).toLowerCase()}.`;
  if (!tool) return "Scegli una delle azioni consigliate.";
  if (tool.status === "bloccato") return "Bloccato: servirebbero server o servizi a pagamento.";
  if (!isToolCompatible(tool)) return `${tool.name} richiede ${toolRequirementText(tool).toLowerCase()}.`;
  if (tool.id === "pdf-to-word") return "Word testo pronto: estrae solo testo selezionabile, senza OCR o ricostruzione layout.";
  return `${tool.name} pronto. I file restano sul dispositivo.`;
}

function matchesTool(tool) {
  const query = state.query.trim().toLowerCase();
  if (!query && state.filter === "Tutti" && tool.status === "bloccato") return false;

  const categoryMatch =
    state.filter === "Tutti" ||
    (state.filter === "Preferiti" && state.favorites.has(tool.id)) ||
    (state.filter === "Roadmap" && tool.status === "bloccato") ||
    tool.category === state.filter ||
    tool.badge === state.filter ||
    (state.filter === "Attivo" && ["attivo", "parziale"].includes(tool.status));

  if (!categoryMatch) return false;
  if (!query) return true;

  return [tool.name, tool.category, tool.badge, tool.status, tool.description]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function renderCategories() {
  categoryBar.innerHTML = categories
    .map((category) => {
      const active = category === state.filter ? " active" : "";
      return `<button class="chip${active}" type="button" data-category="${category}">${category}</button>`;
    })
    .join("");
}

function renderTools() {
  const visibleTools = tools
    .filter(matchesTool)
    .sort((left, right) => {
      const favoriteScore = Number(state.favorites.has(right.id)) - Number(state.favorites.has(left.id));
      if (favoriteScore) return favoriteScore;
      const compatibleScore = Number(isToolCompatible(right)) - Number(isToolCompatible(left));
      if (state.files.length && compatibleScore) return compatibleScore;
      return Number(left.status === "bloccato") - Number(right.status === "bloccato");
    });

  renderCatalogInsights(visibleTools);

  if (!visibleTools.length) {
    grid.innerHTML =
      state.filter === "Preferiti"
        ? '<div class="no-results">Nessun preferito salvato. Usa la stella su uno strumento.</div>'
        : '<div class="no-results">Nessuno strumento trovato. Prova con ruota, testo, privacy o stampa.</div>';
    return;
  }

  grid.innerHTML = visibleTools
    .map((tool) => {
      const selected = state.selectedTool?.id === tool.id ? " selected" : "";
      const disabled = tool.status === "bloccato" ? " blocked" : "";
      const favorite = state.favorites.has(tool.id);
      const compatible = state.files.length && isToolCompatible(tool) ? " compatible" : "";
      const incompatible = state.files.length && tool.status !== "bloccato" && !isToolCompatible(tool) ? " incompatible" : "";
      return `
        <article class="tool-card${selected}${disabled}${compatible}${incompatible}${favorite ? " favorite" : ""}" tabindex="0" role="button" data-tool="${tool.id}" data-status="${tool.status}">
          <div class="tool-top">
            <span class="tool-icon" aria-hidden="true">${tool.icon}</span>
            <div class="tool-actions">
              <button class="favorite-button${favorite ? " active" : ""}" type="button" data-favorite="${tool.id}" aria-pressed="${favorite}" aria-label="${favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}">★</button>
              <span class="tool-badge ${tool.status}">${tool.badge}</span>
            </div>
          </div>
          <h3>${tool.name}</h3>
          <p>${tool.description}</p>
          <small class="tool-meta">${toolRequirementText(tool)}</small>
        </article>
      `;
    })
    .join("");
}

function renderCatalogInsights(visibleTools) {
  if (!catalogInsights) return;
  const activeCount = tools.filter((tool) => tool.status !== "bloccato").length;
  const blockedCount = tools.length - activeCount;
  const compatibleCount = state.files.length ? visibleTools.filter(isToolCompatible).length : 0;
  const scope =
    state.filter === "Roadmap"
      ? `${blockedCount} funzioni visibili solo se diventano gratis senza costi nascosti.`
      : state.query
        ? `${visibleTools.length} risultati per la ricerca.`
        : `${activeCount} strumenti realmente eseguibili nel browser.`;
  const compatibility = state.files.length ? `${compatibleCount} compatibili con la coda attuale.` : "Carica file per vedere solo i compatibili.";
  catalogInsights.textContent = `${scope} ${compatibility}`;
}

function toggleFavorite(toolId) {
  if (state.favorites.has(toolId)) state.favorites.delete(toolId);
  else state.favorites.add(toolId);
  saveFavorites();
  renderCategories();
  renderTools();
}

function renderFiles() {
  window.dispatchEvent(new CustomEvent('pdfdelta-files', { detail: [...state.files] }));
  runButton.disabled = !isToolCompatible(state.selectedTool);
  if (compatibilityNote) compatibilityNote.textContent = compatibilityMessage();
  if (clearQueueButton) clearQueueButton.hidden = !state.files.length;
  renderSuggestions();
  renderQueueSummary();
  renderToolBrief();
  updateStepStrip();

  if (!state.selectedTool) {
    runButton.innerHTML = state.files.length
      ? '<span aria-hidden="true">▶</span> Scegli azione'
      : '<span aria-hidden="true">+</span> Carica file';
  } else if (state.selectedTool.status === "bloccato") {
    runButton.textContent = "Bloccato per zero costi";
  } else if (!isToolCompatible(state.selectedTool)) {
    runButton.textContent = "File non compatibili";
  } else {
    runButton.innerHTML = `<span aria-hidden="true">▶</span> ${state.selectedTool.name}`;
  }

  if (!state.files.length) {
    fileList.innerHTML = '<li class="empty-state">Nessun file caricato.</li>';
    return;
  }

  fileList.innerHTML = state.files
    .map(
      (file, index) => `
        <li>
          <span class="file-name">${escapeHtml(file.name)}<small>${fileExt(file).toUpperCase()}</small></span>
          <span>${formatBytes(file.size)}</span>
          <button class="remove-file" type="button" data-remove-file="${index}" aria-label="Rimuovi ${escapeHtml(file.name)}">×</button>
        </li>
      `
    )
    .join("");
}

function renderOptions() {
  const tool = state.selectedTool;
  if (!tool) {
    toolOptions.hidden = true;
    toolOptions.innerHTML = "";
    return;
  }

  const blocks = [];
  if (tool.status === "bloccato") {
    blocks.push(`<div class="option-note">${tool.description}</div>`);
  }

  (tool.options || []).forEach((option) => {
    if (option.type === "select") {
      blocks.push(`
        <label>
          <span>${option.label}</span>
          <select data-option="${option.id}">
            ${option.choices.map(([value, label]) => `<option value="${value}" ${value === option.value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
      `);
      return;
    }

    blocks.push(`
      <label>
        <span>${option.label}</span>
        <input type="text" data-option="${option.id}" value="${option.value || ""}" placeholder="${option.hint || ""}" />
      </label>
    `);
  });

  toolOptions.hidden = blocks.length === 0;
  toolOptions.innerHTML = blocks.join("");
}

function getOptions() {
  return Object.fromEntries(
    Array.from(toolOptions.querySelectorAll("[data-option]")).map((input) => [input.dataset.option, input.value])
  );
}

function selectTool(toolId, options = {}) {
  if (state.busy || workspaceBusy()) return;
  const tool = tools.find((item) => item.id === toolId);
  if (!tool) return;

  state.selectedTool = tool;
  selectedTool.textContent =
    tool.status === "bloccato" ? `${tool.name}: non disponibile in modalita zero costi` : `${tool.name} selezionato`;
  resultPanel.textContent = "";
  renderOptions();
  renderTools();
  renderFiles();

  window.dispatchEvent(new CustomEvent('pdfdelta-tool', { detail: { tool, automatic: options.scrollEditor === false } }));
  if (tool.id === "edit-pdf") {
    setEditorStatus("Carica un PDF per compilare e firmare.");
  }
}

function addFiles(fileCollection) {
  if (state.busy || workspaceBusy()) return;
  const incoming = Array.from(fileCollection || []);
  const totalBytes = [...state.files, ...incoming].reduce((sum, file) => sum + file.size, 0);
  if (incoming.some(file => file.size > window.PdfEngine.limits.fileBytes) || totalBytes > 200 * 1024 * 1024) {
    resultPanel.textContent = 'Limite locale: 100 MB per file e 200 MB nella coda. Scegli meno file o documenti più piccoli.';
    return;
  }
  const known = new Set(state.files.map((file) => `${file.name}-${file.size}-${file.lastModified}`));

  incoming.forEach((file) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!known.has(key)) {
      state.files.push(file);
      known.add(key);
    }
  });

  if (!state.selectedTool || !isToolCompatible(state.selectedTool)) {
    const suggested = firstCompatibleSuggestion();
    if (suggested) {
      selectTool(suggested.id, { scrollEditor: false });
      return;
    }
  }

  renderTools();
  renderFiles();
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });
  renderCategories();
  renderTools();
}

function setEditorStatus(message) {
  if (editorStatus) editorStatus.textContent = message;
}

function setEditorReady(ready) {
  editorPanel?.classList.toggle("editor-ready", Boolean(ready));
}

function resetEditor() {
  state.editor.file = null;
  state.editor.pdfBytes = null;
  state.editor.pdf = null;
  state.editor.pageNumber = 1;
  state.editor.pageCount = 0;
  state.editor.marks = [];
  state.editor.strokes = [];
  state.editor.pageSize = { width: 0, height: 0 };
  state.editor.canvasSize = { width: 0, height: 0 };
  if (pdfEditorCanvas) {
    pdfEditorCanvas.width = 0;
    pdfEditorCanvas.height = 0;
  }
  if (editorInkCanvas) {
    editorInkCanvas.width = 0;
    editorInkCanvas.height = 0;
  }
  if (editorPageInfo) editorPageInfo.textContent = "0 / 0";
  setEditorReady(false);
  setEditorStatus("Carica un PDF e scegli Compila e firma.");
}

function setEditorMode(mode) {
  state.editor.mode = mode;
  editorModes?.querySelectorAll("[data-editor-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.editorMode === mode);
  });
  if (editorInkCanvas) editorInkCanvas.style.cursor = mode === "draw" ? "crosshair" : "copy";
  document.getElementById('signatureFontField').hidden = mode !== 'signature';
  document.getElementById('signatureSizeField').hidden = mode !== 'signature-drawing';
  if (mode === 'signature') setEditorStatus('Scegli uno stile e clicca nei punti dove inserire la firma. Per firmare a mano, scegli Disegna una firma.');
}

function editorPdfPoint(event) {
  const rect = editorInkCanvas.getBoundingClientRect();
  const canvasX = (event.clientX - rect.left) * (editorInkCanvas.width / rect.width);
  const canvasY = (event.clientY - rect.top) * (editorInkCanvas.height / rect.height);
  return {
    x: (canvasX / state.editor.canvasSize.width) * state.editor.pageSize.width,
    y: state.editor.pageSize.height - (canvasY / state.editor.canvasSize.height) * state.editor.pageSize.height,
  };
}

function editorCanvasPoint(point) {
  return {
    x: (point.x / state.editor.pageSize.width) * state.editor.canvasSize.width,
    y: ((state.editor.pageSize.height - point.y) / state.editor.pageSize.height) * state.editor.canvasSize.height,
  };
}

function editorTextValue() {
  const fallback = state.editor.mode === "signature" ? "Firma" : "Testo";
  return (editorTextInput?.value || fallback).trim() || fallback;
}

function safePdfText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7EÀ-ÖØ-öø-ÿ]/g, " ")
    .slice(0, 180);
}

function drawEditorOverlay() {
  document.getElementById('editorUndoInsertion').disabled = !state.editor.marks.length && !state.editor.strokes.length;
  if (!editorInkCanvas || !state.editor.canvasSize.width) return;
  const context = editorInkCanvas.getContext("2d");
  context.clearRect(0, 0, editorInkCanvas.width, editorInkCanvas.height);
  context.lineCap = "round";
  context.lineJoin = "round";

  state.editor.strokes
    .filter((stroke) => stroke.page === state.editor.pageNumber)
    .forEach((stroke) => {
      if (stroke.points.length < 2) return;
      context.beginPath();
      stroke.points.forEach((point, index) => {
        const canvasPoint = editorCanvasPoint(point);
        if (index === 0) context.moveTo(canvasPoint.x, canvasPoint.y);
        else context.lineTo(canvasPoint.x, canvasPoint.y);
      });
      context.strokeStyle = "#123f8c";
      context.lineWidth = Math.max(2, stroke.thickness * (state.editor.canvasSize.width / state.editor.pageSize.width));
      context.stroke();
    });

  state.editor.marks
    .filter((mark) => mark.page === state.editor.pageNumber)
    .forEach((mark) => {
      if (mark.type === 'signature-drawing') {
        context.strokeStyle = '#123f8c'; context.lineWidth = 1.5 * state.editor.canvasSize.width / state.editor.pageSize.width;
        for (const stroke of mark.strokes) {
          context.beginPath();
          stroke.forEach((p, i) => { const c = editorCanvasPoint({ x: mark.x + p.x, y: mark.y - p.y }); if (i) context.lineTo(c.x, c.y); else context.moveTo(c.x, c.y); });
          context.stroke();
        }
        return;
      }
      const point = editorCanvasPoint(mark);
      const size = Math.round(mark.size * (state.editor.canvasSize.width / state.editor.pageSize.width));
      const face = mark.type === 'signature' ? (signatureFaces[mark.font] || signatureFaces.TimesRomanItalic) : 'Arial';
      context.font = face.startsWith('italic ') ? `italic ${size}px "${face.slice(7)}"` : `${size}px ${face}`;
      context.fillStyle = mark.type === "signature" ? "#123f8c" : "#17211f";
      context.fillText(mark.text, point.x, point.y);
    });
}

async function renderEditorPage() {
  if (!state.editor.pdf || !pdfEditorCanvas || !editorInkCanvas) return;
  const page = await state.editor.pdf.getPage(state.editor.pageNumber);
  const base = page.getViewport({ scale: 1 });
  const maxWidth = Math.max(300, Math.min(920, (editorStage?.clientWidth || 760) - 36));
  const scale = Math.min(1.8, Math.max(0.6, maxWidth / base.width));
  const viewport = page.getViewport({ scale });

  pdfEditorCanvas.width = Math.ceil(viewport.width);
  pdfEditorCanvas.height = Math.ceil(viewport.height);
  editorInkCanvas.width = pdfEditorCanvas.width;
  editorInkCanvas.height = pdfEditorCanvas.height;
  state.editor.pageSize = { width: base.width, height: base.height };
  state.editor.canvasSize = { width: pdfEditorCanvas.width, height: pdfEditorCanvas.height };

  const context = pdfEditorCanvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, pdfEditorCanvas.width, pdfEditorCanvas.height);
  await page.render({ canvasContext: context, viewport }).promise;

  editorPageInfo.textContent = `${state.editor.pageNumber} / ${state.editor.pageCount}`;
  editorPrev.disabled = state.editor.pageNumber <= 1;
  editorNext.disabled = state.editor.pageNumber >= state.editor.pageCount;
  drawEditorOverlay();
}

async function openPdfEditorTool() {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const file = getPdfFiles()[0];
  if (!file) throw new Error("Carica un PDF per usare l'editor.");

  state.editor.file = file;
  state.editor.pdfBytes = await file.arrayBuffer();
  state.editor.pdf = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: new Uint8Array(state.editor.pdfBytes.slice(0)) }).promise;
  state.editor.pageNumber = 1;
  state.editor.pageCount = state.editor.pdf.numPages;
  state.editor.marks = [];
  state.editor.strokes = [];
  setEditorMode(state.editor.mode || "text");
  setEditorReady(true);
  setEditorStatus(`${file.name} pronto per compilazione e firma.`);
  resultPanel.innerHTML = "<strong>Editor pronto.</strong> Compila, firma e scarica il PDF modificato.";
  window.dispatchEvent(new Event('pdfdelta-editor'));
  await renderEditorPage();
  document.querySelector("#editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveEditedPdf() {
  if (!state.editor.file || !state.editor.pdfBytes) throw new Error("Apri un PDF nell'editor.");
  const pdfDoc = await PDFDocument.load(state.editor.pdfBytes.slice(0), { ignoreEncryption: true });
  const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const signatureFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const signatureFonts = { TimesRomanItalic: signatureFont, HelveticaOblique: await pdfDoc.embedFont(StandardFonts.HelveticaOblique), CourierOblique: await pdfDoc.embedFont(StandardFonts.CourierOblique) };

  state.editor.marks.forEach((mark) => {
    const page = pdfDoc.getPage(mark.page - 1);
    if (mark.type === 'signature-drawing') {
      for (const stroke of mark.strokes) for (let i = 1; i < stroke.length; i++) page.drawLine({ start: { x: mark.x + stroke[i - 1].x, y: mark.y - stroke[i - 1].y }, end: { x: mark.x + stroke[i].x, y: mark.y - stroke[i].y }, thickness: 1.5, color: rgb(.07, .25, .55) });
      return;
    }
    page.drawText(safePdfText(mark.text), {
      x: mark.x,
      y: mark.y,
      size: mark.size,
      font: mark.type === "signature" ? (signatureFonts[mark.font] || signatureFont) : textFont,
      color: mark.type === "signature" ? rgb(0.07, 0.25, 0.55) : rgb(0.09, 0.13, 0.12),
    });
  });

  state.editor.strokes.forEach((stroke) => {
    const page = pdfDoc.getPage(stroke.page - 1);
    for (let index = 1; index < stroke.points.length; index += 1) {
      page.drawLine({
        start: stroke.points[index - 1],
        end: stroke.points[index],
        thickness: stroke.thickness,
        color: rgb(0.07, 0.25, 0.55),
      });
    }
  });

  const bytes = await savePdfBytes(pdfDoc);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${sanitizeFileName(state.editor.file.name)}-compilato-firmato.pdf`, { apply: true });
  setEditorStatus("PDF modificato pronto.");
}

function clearCurrentEditorPage() {
  state.editor.marks = state.editor.marks.filter((mark) => mark.page !== state.editor.pageNumber);
  state.editor.strokes = state.editor.strokes.filter((stroke) => stroke.page !== state.editor.pageNumber);
  drawEditorOverlay();
  setEditorStatus(`Pagina ${state.editor.pageNumber} pulita.`);
}

function parseRanges(input, pageCount) {
  const ranges = String(input || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!ranges.length) throw new Error("Inserisci almeno una pagina o intervallo.");

  const indices = [];
  ranges.forEach((part) => {
    const normalized = part.toLowerCase();
    if (normalized === "last") {
      indices.push(pageCount - 1);
      return;
    }

    if (normalized.includes("-")) {
      const [startRaw, endRaw] = normalized.split("-");
      const start = startRaw === "last" ? pageCount : Number.parseInt(startRaw, 10);
      const end = endRaw === "last" ? pageCount : Number.parseInt(endRaw, 10);
      if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`Intervallo non valido: ${part}`);
      const step = start <= end ? 1 : -1;
      for (let page = start; step > 0 ? page <= end : page >= end; page += step) {
        if (page < 1 || page > pageCount) throw new Error(`Pagina fuori range: ${page}`);
        indices.push(page - 1);
      }
      return;
    }

    const page = Number.parseInt(normalized, 10);
    if (!Number.isInteger(page) || page < 1 || page > pageCount) throw new Error(`Pagina non valida: ${part}`);
    indices.push(page - 1);
  });

  return indices;
}

function parseRangeGroups(input, pageCount) {
  const groups = String(input || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!groups.length) throw new Error("Inserisci almeno un blocco di pagine.");
  return groups.map((group) => parseRanges(group, pageCount));
}

async function loadPdf(file) {
  return window.PdfEngine.readEditable(file);
}

function downloadBlob(blob, filename, options = {}) {
  const apply = /\.pdf$/i.test(filename) && (state.busy || options.apply === true);
  window.dispatchEvent(new CustomEvent('pdfdelta-output', { detail: { blob, filename, apply } }));
  if (state.lastDownloadUrl) URL.revokeObjectURL(state.lastDownloadUrl);
  const url = URL.createObjectURL(blob);
  state.lastDownloadUrl = url;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  if (!apply) link.click();
  link.remove();

  resultPanel.innerHTML = `
    <strong>Pronto.</strong>
    <a href="${url}" download="${escapeHtml(filename)}">Scarica di nuovo ${escapeHtml(filename)}</a>
  `;
  if (apply) resultPanel.textContent = `Modifica applicata: ${filename}`;
  updateStepStrip();
}

async function zipOutputs(outputs, filename) {
  if (!window.JSZip) throw new Error("JSZip non caricato. Controlla la connessione.");
  const zip = new window.JSZip();
  outputs.forEach((item) => zip.file(item.name, item.bytes));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

async function savePdfBytes(pdfDoc) {
  return pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
}

async function mergePdfs() {
  const output = await PDFDocument.create();
  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const copied = await output.copyPages(source, source.getPageIndices());
    copied.forEach((page) => output.addPage(page));
  }
  const bytes = await savePdfBytes(output);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), "pdfdelta-unito.pdf");
}

async function mergeMixedFiles() {
  const output = await PDFDocument.create();

  for (const file of state.files) {
    const ext = fileExt(file);
    if (ext === "pdf") {
      const source = await loadPdf(file);
      const copied = await output.copyPages(source, source.getPageIndices());
      copied.forEach((page) => output.addPage(page));
      continue;
    }

    if (["jpg", "jpeg", "png"].includes(ext)) {
      const bytes = await file.arrayBuffer();
      const image = ext === "png" ? await output.embedPng(bytes) : await output.embedJpg(bytes);
      const page = output.addPage([595.28, 841.89]);
      const maxWidth = page.getWidth() - 56;
      const maxHeight = page.getHeight() - 56;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      page.drawImage(image, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height,
      });
    }
  }

  if (!output.getPageCount()) throw new Error("Aggiungi almeno un PDF, JPG o PNG.");
  const bytes = await savePdfBytes(output);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), "pdfdelta-unito-misto.pdf");
}

async function interleavePdfs(options) {
  const [frontFile, backFile] = getPdfFiles();
  const front = await loadPdf(frontFile);
  const back = await loadPdf(backFile);
  const output = await PDFDocument.create();
  const frontIndices = front.getPageIndices();
  const backIndices =
    options.secondOrder === "normal" ? back.getPageIndices() : back.getPageIndices().slice().reverse();
  const maxPages = Math.max(frontIndices.length, backIndices.length);

  for (let index = 0; index < maxPages; index += 1) {
    if (frontIndices[index] !== undefined) {
      const [page] = await output.copyPages(front, [frontIndices[index]]);
      output.addPage(page);
    }
    if (backIndices[index] !== undefined) {
      const [page] = await output.copyPages(back, [backIndices[index]]);
      output.addPage(page);
    }
  }

  const bytes = await savePdfBytes(output);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), "pdfdelta-intercalato.pdf");
}

async function splitPdfs() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    for (let index = 0; index < source.getPageCount(); index += 1) {
      const output = await PDFDocument.create();
      const [page] = await output.copyPages(source, [index]);
      output.addPage(page);
      const bytes = await savePdfBytes(output);
      outputs.push({ name: `${sanitizeFileName(file.name)}-pagina-${index + 1}.pdf`, bytes });
    }
  }
  const zip = await zipOutputs(outputs, "pdfdelta-divisi.zip");
  downloadBlob(zip, "pdfdelta-divisi.zip");
}

async function splitByRanges(options) {
  const outputs = [];

  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const groups = parseRangeGroups(options.ranges, source.getPageCount());
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, groups[groupIndex]);
      pages.forEach((page) => output.addPage(page));
      outputs.push({
        name: `${sanitizeFileName(file.name)}-range-${groupIndex + 1}.pdf`,
        bytes: await savePdfBytes(output),
      });
    }
  }

  downloadBlob(await zipOutputs(outputs, "pdfdelta-range.zip"), "pdfdelta-range.zip");
}

async function splitOddEven() {
  const outputs = [];

  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const buckets = {
      dispari: source.getPageIndices().filter((index) => index % 2 === 0),
      pari: source.getPageIndices().filter((index) => index % 2 === 1),
    };

    for (const [label, indices] of Object.entries(buckets)) {
      if (!indices.length) continue;
      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, indices);
      pages.forEach((page) => output.addPage(page));
      outputs.push({ name: `${sanitizeFileName(file.name)}-${label}.pdf`, bytes: await savePdfBytes(output) });
    }
  }

  downloadBlob(await zipOutputs(outputs, "pdfdelta-pari-dispari.zip"), "pdfdelta-pari-dispari.zip");
}

async function extractPages(options) {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const indices = parseRanges(options.ranges, source.getPageCount());
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    pages.forEach((page) => output.addPage(page));
    outputs.push({ name: `${sanitizeFileName(file.name)}-estratto.pdf`, bytes: await savePdfBytes(output) });
  }

  if (outputs.length === 1) {
    downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  } else {
    downloadBlob(await zipOutputs(outputs, "pdfdelta-estratti.zip"), "pdfdelta-estratti.zip");
  }
}

async function removePages(options) {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const remove = new Set(parseRanges(options.ranges, source.getPageCount()));
    const keep = source.getPageIndices().filter((index) => !remove.has(index));
    if (!keep.length) throw new Error("Non puoi rimuovere tutte le pagine.");
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, keep);
    pages.forEach((page) => output.addPage(page));
    outputs.push({ name: `${sanitizeFileName(file.name)}-senza-pagine.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-senza-pagine.zip"), "pdfdelta-senza-pagine.zip");
}

async function reorderPages(options) {
  const file = getPdfFiles()[0];
  const source = await loadPdf(file);
  const indices = parseRanges(options.order, source.getPageCount());
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, indices);
  pages.forEach((page) => output.addPage(page));
  const bytes = await savePdfBytes(output);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${sanitizeFileName(file.name)}-riordinato.pdf`);
}

async function rotatePdfs(options) {
  const outputs = [];
  const angle = Number.parseInt(options.angle, 10);
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    pdfDoc.getPages().forEach((page) => page.setRotation(degrees(angle)));
    outputs.push({ name: `${sanitizeFileName(file.name)}-ruotato.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-ruotati.zip"), "pdfdelta-ruotati.zip");
}

async function reversePages() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const indices = source.getPageIndices().reverse();
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    pages.forEach((page) => output.addPage(page));
    outputs.push({ name: `${sanitizeFileName(file.name)}-invertito.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-invertiti.zip"), "pdfdelta-invertiti.zip");
}

async function duplicatePages(options) {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const output = await PDFDocument.create();
    const originalPages = await output.copyPages(source, source.getPageIndices());
    originalPages.forEach((page) => output.addPage(page));
    const duplicateIndices = parseRanges(options.ranges, source.getPageCount());
    const duplicatePagesToAdd = await output.copyPages(source, duplicateIndices);
    duplicatePagesToAdd.forEach((page) => output.addPage(page));
    outputs.push({ name: `${sanitizeFileName(file.name)}-pagine-duplicate.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-pagine-duplicate.zip"), "pdfdelta-pagine-duplicate.zip");
}

async function optimizePdfs() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    outputs.push({ name: `${sanitizeFileName(file.name)}-ottimizzato.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-ottimizzati.zip"), "pdfdelta-ottimizzati.zip");
}

async function imagesToPdf() {
  const pdfDoc = await PDFDocument.create();
  for (const file of getImageFiles()) {
    const bytes = await file.arrayBuffer();
    const image = fileExt(file) === "png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = image.scale(1);
    const maxWidth = page.getWidth() - 56;
    const maxHeight = page.getHeight() - 56;
    const scale = Math.min(maxWidth / width, maxHeight / height);
    const scaled = image.scale(scale);
    page.drawImage(image, {
      x: (page.getWidth() - scaled.width) / 2,
      y: (page.getHeight() - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });
  }
  const bytes = await savePdfBytes(pdfDoc);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), "pdfdelta-immagini.pdf");
}

function wrapText(text, maxChars) {
  const words = text.replace(/\r/g, "").split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    if ((line + " " + word).trim().length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  });
  if (line) lines.push(line);
  return lines;
}

async function textToPdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  for (const file of getTextFiles()) {
    const text = await file.text();
    const lines = wrapText(text, 86);
    let page = pdfDoc.addPage([595.28, 841.89]);
    let y = page.getHeight() - 54;
    page.drawText(file.name, { x: 42, y, size: 13, font, color: rgb(0.95, 0.31, 0.24) });
    y -= 30;
    lines.forEach((line) => {
      if (y < 42) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = page.getHeight() - 54;
      }
      page.drawText(line, { x: 42, y, size: 10.5, font, color: rgb(0.09, 0.13, 0.12) });
      y -= 16;
    });
  }
  const bytes = await savePdfBytes(pdfDoc);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), "pdfdelta-testo.pdf");
}

async function blankPdf(options) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = Math.min(200, Math.max(1, Number.parseInt(options.pages || "1", 10) || 1));
  const size = pageSizeFromOption(options.pageSize);

  for (let index = 0; index < pages; index += 1) {
    const page = pdfDoc.addPage(size);
    const { width, height } = page.getSize();
    if (options.style === "lined" || options.style === "grid") {
      for (let y = 54; y < height - 42; y += 24) {
        page.drawLine({
          start: { x: 42, y },
          end: { x: width - 42, y },
          thickness: 0.4,
          color: rgb(0.82, 0.84, 0.8),
        });
      }
    }
    if (options.style === "grid") {
      for (let x = 42; x < width - 42; x += 24) {
        page.drawLine({
          start: { x, y: 42 },
          end: { x, y: height - 42 },
          thickness: 0.28,
          color: rgb(0.9, 0.91, 0.88),
        });
      }
    }
    page.drawText(`PdfDelta - ${index + 1}`, {
      x: 42,
      y: 24,
      size: 8,
      font,
      color: rgb(0.55, 0.58, 0.55),
    });
  }

  const bytes = await savePdfBytes(pdfDoc);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), "pdfdelta-vuoto.pdf");
}

function joinPdfTextLine(items) {
  let text = "";
  let previousEnd = null;

  items
    .sort((left, right) => left.x - right.x)
    .forEach((item) => {
      const chunk = item.str.replace(/\s+/g, " ").trim();
      if (!chunk) return;

      const gap = previousEnd === null ? 0 : item.x - previousEnd;
      const needsSpace = text && gap > Math.max(1.5, item.height * 0.12) && !/^[,.;:!?%)\]}]/.test(chunk);
      if (needsSpace) text += " ";

      text += chunk;
      previousEnd = Math.max(previousEnd ?? item.x, item.x + item.width);
    });

  return text.replace(/\s+/g, " ").trim();
}

function pdfTextItemsToLines(items) {
  const lines = [];
  items
    .map((item) => {
      const transform = item.transform || [];
      return {
        str: String(item.str || ""),
        x: Number(transform[4]) || 0,
        y: Number(transform[5]) || 0,
        width: Number(item.width) || 0,
        height: Number(item.height) || 8,
      };
    })
    .filter((item) => item.str.trim())
    .sort((left, right) => right.y - left.y || left.x - right.x)
    .forEach((item) => {
      const tolerance = Math.max(2.5, item.height * 0.45);
      const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
      if (line) {
        line.items.push(item);
        line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length;
      } else {
        lines.push({ y: item.y, items: [item] });
      }
    });

  return lines
    .sort((left, right) => right.y - left.y)
    .map((line) => joinPdfTextLine(line.items))
    .filter(Boolean);
}

function extractedTextBody(text) {
  return text.replace(/^--- Pagina \d+ ---$/gm, "").trim();
}

async function extractTextFromPdfFile(file) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: bytes }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = pdfTextItemsToLines(content.items).join("\n");
    pages.push(`--- Pagina ${pageNumber} ---\n${text}`);
  }
  return pages.join("\n\n");
}

async function extractText() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const text = await extractTextFromPdfFile(file);
    outputs.push({ name: `${sanitizeFileName(file.name)}.txt`, bytes: text });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "text/plain;charset=utf-8" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-testo.zip"), "pdfdelta-testo.zip");
}

function markdownFromExtractedText(fileName, text) {
  const sections = text
    .split(/\n\n(?=--- Pagina \d+ ---\n)/)
    .map((section) => {
      const match = section.match(/^--- Pagina (\d+) ---\n?([\s\S]*)$/);
      if (!match) return section.trim();
      const body = match[2].trim() || "_Nessun testo estraibile rilevato._";
      return `## Pagina ${match[1]}\n\n${body}`;
    })
    .filter(Boolean);

  return `# ${fileName}\n\n${sections.join("\n\n")}\n`;
}

async function pdfToMarkdown() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const text = await extractTextFromPdfFile(file);
    outputs.push({ name: `${sanitizeFileName(file.name)}.md`, bytes: markdownFromExtractedText(file.name, text) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "text/markdown;charset=utf-8" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-markdown.zip"), "pdfdelta-markdown.zip");
}

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function docxParagraph(text, style = "") {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function docxDocumentXml(fileName, text) {
  const sections = text
    .split(/\n\n(?=--- Pagina \d+ ---\n)/)
    .map((section) => {
      const match = section.match(/^--- Pagina (\d+) ---\n?([\s\S]*)$/);
      if (!match) return [docxParagraph(section.trim())].join("");
      const lines = match[2].trim().split(/\n+/).filter(Boolean);
      return [docxParagraph(`Pagina ${match[1]}`, "Heading1"), ...(lines.length ? lines : [""]).map((line) => docxParagraph(line))].join("");
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docxParagraph(`${fileName} - testo estratto`, "Title")}
    ${docxParagraph("Conversione locale: conserva il testo selezionabile, non ricostruisce layout complesso, tabelle o scansioni.", "Subtitle")}
    ${sections}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;
}

async function makeDocxBlob(fileName, text) {
  if (!window.JSZip) throw new Error("JSZip non caricato. Controlla la connessione.");
  const zip = new window.JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );
  zip.folder("_rels").file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.folder("word").file("document.xml", docxDocumentXml(fileName, text));
  zip.folder("word").folder("_rels").file(
    "document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  );
  zip.folder("word").file(
    "styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="64748B"/><w:sz w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
</w:styles>`
  );
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

async function pdfToWord() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const text = await extractTextFromPdfFile(file);
    if (!extractedTextBody(text)) {
      throw new Error(`${file.name}: nessun testo selezionabile. Word testo funziona gratis solo con PDF digitali; OCR e layout avanzato richiederebbero compute/server.`);
    }
    outputs.push({ name: `${sanitizeFileName(file.name)}-testo.docx`, bytes: await makeDocxBlob(file.name, text) });
  }
  if (outputs.length === 1) {
    downloadBlob(
      outputs[0].bytes,
      outputs[0].name
    );
  } else {
    downloadBlob(await zipOutputs(outputs, "pdfdelta-word-testo.zip"), "pdfdelta-word-testo.zip");
  }
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function wordCountFromText(text) {
  return (text.match(/[0-9A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’-][0-9A-Za-zÀ-ÖØ-öø-ÿ]+)*/g) || []).length;
}

async function wordCountReport() {
  const rows = ["file,pagine,parole,caratteri"];
  for (const file of getPdfFiles()) {
    const text = await extractTextFromPdfFile(file);
    const body = extractedTextBody(text);
    rows.push(
      [
        csvCell(file.name),
        (text.match(/--- Pagina \d+ ---/g) || []).length,
        wordCountFromText(body),
        body.length,
      ].join(",")
    );
  }

  downloadBlob(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }), "pdfdelta-conteggio-parole.csv");
}

function readPdfMetadata(pdfDoc, getter) {
  try {
    return getter.call(pdfDoc) || "";
  } catch {
    return "";
  }
}

function csvDate(value) {
  return value instanceof Date ? value.toISOString() : "";
}

async function documentReport() {
  const rows = [
    "file,byte,pagine,verticali,orizzontali,formati,titolo,autore,oggetto,creato,modificato",
  ];

  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const pages = pdfDoc.getPages();
    let portrait = 0;
    let landscape = 0;
    const sizes = pages.map((page) => {
      const { width, height } = page.getSize();
      if (height >= width) portrait += 1;
      else landscape += 1;
      return `${Math.round(width)}x${Math.round(height)}`;
    });

    rows.push(
      [
        csvCell(file.name),
        file.size,
        pages.length,
        portrait,
        landscape,
        csvCell([...new Set(sizes)].join(" | ")),
        csvCell(readPdfMetadata(pdfDoc, pdfDoc.getTitle)),
        csvCell(readPdfMetadata(pdfDoc, pdfDoc.getAuthor)),
        csvCell(readPdfMetadata(pdfDoc, pdfDoc.getSubject)),
        csvCell(csvDate(readPdfMetadata(pdfDoc, pdfDoc.getCreationDate))),
        csvCell(csvDate(readPdfMetadata(pdfDoc, pdfDoc.getModificationDate))),
      ].join(",")
    );
  }

  downloadBlob(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }), "pdfdelta-report-documenti.csv");
}

async function queueReport() {
  const rows = ["file,estensione,tipo,byte,dimensione"];
  state.files.forEach((file) => {
    rows.push([csvCell(file.name), csvCell(fileExt(file)), csvCell(mimeTypeForFile(file)), file.size, csvCell(formatBytes(file.size))].join(","));
  });

  downloadBlob(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }), "pdfdelta-coda.csv");
}

function canvasToBlob(canvas, type = "image/png", quality = 0.95) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Impossibile generare l'immagine raster."));
    }, type, quality);
  });
}

async function canvasToPngBytes(canvas) {
  const blob = await canvasToBlob(canvas);
  return blob.arrayBuffer();
}

async function canvasToImageBytes(canvas, type, quality) {
  const blob = await canvasToBlob(canvas, type, quality);
  return blob.arrayBuffer();
}

async function renderPdfPageCanvas(page, scale) {
  const viewport = window.PdfEngine.viewportAtScale(page, scale);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

async function pdfToImages(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const scale = Number.parseFloat(options.scale || "1.5");
  for (const file of getPdfFiles()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: bytes }).promise;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const canvas = await renderPdfPageCanvas(page, scale);
      outputs.push({
        name: `${sanitizeFileName(file.name)}-pagina-${pageNumber}.png`,
        bytes: await canvasToBlob(canvas),
      });
    }
  }
  downloadBlob(await zipOutputs(outputs, "pdfdelta-png.zip"), "pdfdelta-png.zip");
}

async function pdfToJpg(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const quality = Number.parseFloat(options.quality || "0.82");
  const scale = Number.parseFloat(options.scale || "1.5");

  for (const file of getPdfFiles()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: bytes }).promise;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const canvas = await renderPdfPageCanvas(page, scale);
      outputs.push({
        name: `${sanitizeFileName(file.name)}-pagina-${pageNumber}.jpg`,
        bytes: await canvasToBlob(canvas, "image/jpeg", quality),
      });
    }
  }

  downloadBlob(await zipOutputs(outputs, "pdfdelta-jpg.zip"), "pdfdelta-jpg.zip");
}

async function pdfToWebp(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const quality = Number.parseFloat(options.quality || "0.8");
  const scale = Number.parseFloat(options.scale || "1.5");

  for (const file of getPdfFiles()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: bytes }).promise;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const canvas = await renderPdfPageCanvas(page, scale);
      outputs.push({
        name: `${sanitizeFileName(file.name)}-pagina-${pageNumber}.webp`,
        bytes: await canvasToBlob(canvas, "image/webp", quality),
      });
    }
  }

  downloadBlob(await zipOutputs(outputs, "pdfdelta-webp.zip"), "pdfdelta-webp.zip");
}

function socialPreset(preset) {
  const presets = {
    square: { width: 1080, height: 1080, label: "quadrato" },
    story: { width: 1080, height: 1920, label: "story" },
    link: { width: 1200, height: 630, label: "link" },
  };
  return presets[preset] || presets.square;
}

function socialBackground(background) {
  const backgrounds = {
    warm: "#f7f3ea",
    white: "#ffffff",
    dark: "#17211f",
  };
  return backgrounds[background] || backgrounds.warm;
}

async function pdfToSocialImages(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const preset = socialPreset(options.preset);
  const background = socialBackground(options.background);
  const scale = 1.5;

  for (const file of getPdfFiles()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: bytes }).promise;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const source = await renderPdfPageCanvas(page, scale);
      const output = document.createElement("canvas");
      output.width = preset.width;
      output.height = preset.height;
      const context = output.getContext("2d");
      context.fillStyle = background;
      context.fillRect(0, 0, preset.width, preset.height);

      const fit = Math.min((preset.width * 0.86) / source.width, (preset.height * 0.82) / source.height);
      const width = Math.round(source.width * fit);
      const height = Math.round(source.height * fit);
      const x = Math.round((preset.width - width) / 2);
      const y = Math.round((preset.height - height) / 2);

      context.shadowColor = background === "#17211f" ? "rgba(0, 0, 0, 0.36)" : "rgba(23, 33, 31, 0.2)";
      context.shadowBlur = 28;
      context.shadowOffsetY = 16;
      context.fillStyle = "#ffffff";
      context.fillRect(x, y, width, height);
      context.shadowColor = "transparent";
      context.drawImage(source, x, y, width, height);

      outputs.push({
        name: `${sanitizeFileName(file.name)}-social-${preset.label}-pagina-${pageNumber}.jpg`,
        bytes: await canvasToBlob(output, "image/jpeg", 0.88),
      });
    }
  }

  downloadBlob(await zipOutputs(outputs, "pdfdelta-social.zip"), "pdfdelta-social.zip");
}

async function pdfToLongJpg(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const quality = Number.parseFloat(options.quality || "0.82");
  const scale = Number.parseFloat(options.scale || "1");
  const gap = 18;

  for (const file of getPdfFiles()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: bytes }).promise;
    const pages = [];
    let width = 0;
    let height = 0;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = window.PdfEngine.viewportAtScale(page, scale);
      const pageWidth = Math.ceil(viewport.width), pageHeight = Math.ceil(viewport.height);
      pages.push({ page, width: pageWidth, height: pageHeight });
      width = Math.max(width, pageWidth);
      height += pageHeight + (pageNumber > 1 ? gap : 0);
      const limits = window.PdfEngine.limits;
      if (width > limits.canvasSide || height > limits.canvasSide || width * height > limits.canvasPixels) {
        throw new Error(`${file.name}: troppe pagine o dimensioni eccessive per una sola immagine. Usa PDF in JPG per ottenere un'immagine per pagina, oppure scegli meno pagine.`);
      }
    }

    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    let y = 0;
    for (const [index, item] of pages.entries()) {
      if (index > 0) y += gap;
      const canvas = await renderPdfPageCanvas(item.page, scale);
      context.drawImage(canvas, Math.round((width - item.width) / 2), y);
      y += item.height;
      canvas.width = canvas.height = 0;
    }

    outputs.push({ name: `${sanitizeFileName(file.name)}-immagine-lunga.jpg`, bytes: await canvasToBlob(output, "image/jpeg", quality) });
    output.width = output.height = 0;
  }

  if (outputs.length === 1) downloadBlob(outputs[0].bytes, outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-immagini-lunghe.zip"), "pdfdelta-immagini-lunghe.zip");
}

function fitIntoBox(width, height, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
}

async function contactSheet(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const columns = Number.parseInt(options.columns || "3", 10) === 2 ? 2 : 3;
  const rows = columns === 2 ? 3 : 4;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const gap = 16;
  const labelHeight = 14;
  const cellWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;

  for (const file of getPdfFiles()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const source = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: bytes }).promise;
    const output = await PDFDocument.create();
    const font = await output.embedFont(StandardFonts.Helvetica);
    let sheetPage;

    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      const cellIndex = (pageNumber - 1) % (columns * rows);
      if (cellIndex === 0) sheetPage = output.addPage([pageWidth, pageHeight]);

      const sourcePage = await source.getPage(pageNumber);
      const canvas = await renderPdfPageCanvas(sourcePage, 0.35);
      const image = await output.embedJpg(await canvasToImageBytes(canvas, "image/jpeg", 0.78));
      const column = cellIndex % columns;
      const row = Math.floor(cellIndex / columns);
      const x = margin + column * (cellWidth + gap);
      const y = pageHeight - margin - (row + 1) * cellHeight - row * gap;
      const fitted = fitIntoBox(image.width, image.height, cellWidth, cellHeight - labelHeight);

      sheetPage.drawRectangle({
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        borderColor: rgb(0.86, 0.86, 0.82),
        borderWidth: 0.8,
        color: rgb(1, 1, 1),
      });
      sheetPage.drawImage(image, {
        x: x + (cellWidth - fitted.width) / 2,
        y: y + labelHeight + (cellHeight - labelHeight - fitted.height) / 2,
        width: fitted.width,
        height: fitted.height,
      });
      sheetPage.drawText(`${pageNumber}`, {
        x: x + 8,
        y: y + 5,
        size: 8,
        font,
        color: rgb(0.19, 0.24, 0.22),
      });
    }

    outputs.push({ name: `${sanitizeFileName(file.name)}-anteprime.pdf`, bytes: await savePdfBytes(output) });
  }

  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-anteprime.zip"), "pdfdelta-anteprime.zip");
}

async function watermark(options) {
  const outputs = [];
  const text = options.text || "PdfDelta";
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    pdfDoc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width * 0.18,
        y: height * 0.48,
        size: Math.max(28, width / 13),
        font,
        color: rgb(0.95, 0.31, 0.24),
        opacity: 0.18,
        rotate: degrees(34),
      });
    });
    outputs.push({ name: `${sanitizeFileName(file.name)}-filigrana.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-filigrana.zip"), "pdfdelta-filigrana.zip");
}

function imageStampPosition(position, pageWidth, pageHeight, imageWidth, imageHeight) {
  const margin = Math.min(pageWidth, pageHeight) * 0.06;
  const positions = {
    "top-right": { x: pageWidth - imageWidth - margin, y: pageHeight - imageHeight - margin },
    "top-left": { x: margin, y: pageHeight - imageHeight - margin },
    "bottom-right": { x: pageWidth - imageWidth - margin, y: margin },
    "bottom-left": { x: margin, y: margin },
    center: { x: (pageWidth - imageWidth) / 2, y: (pageHeight - imageHeight) / 2 },
  };
  return positions[position] || positions["top-right"];
}

async function imageStamp(options) {
  const imageFile = getImageFiles()[0];
  const pdfFiles = getPdfFiles();
  if (!imageFile) throw new Error("Aggiungi almeno un'immagine JPG o PNG.");
  if (!pdfFiles.length) throw new Error("Aggiungi almeno un PDF.");

  const imageBytes = await imageFile.arrayBuffer();
  const outputs = [];
  const sizeRatio = Number.parseFloat(options.size || "0.16");

  for (const file of pdfFiles) {
    const pdfDoc = await loadPdf(file);
    const image = fileExt(imageFile) === "png" ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

    pdfDoc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      const targetWidth = Math.min(width, height) * sizeRatio;
      const targetHeight = targetWidth * (image.height / image.width);
      const position = imageStampPosition(options.position, width, height, targetWidth, targetHeight);
      page.drawImage(image, { ...position, width: targetWidth, height: targetHeight });
    });

    outputs.push({ name: `${sanitizeFileName(file.name)}-logo.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }

  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-logo.zip"), "pdfdelta-logo.zip");
}

async function pageNumbers() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      const { width } = page.getSize();
      const label = `${index + 1} / ${pages.length}`;
      page.drawText(label, { x: width - 72, y: 24, size: 9, font, color: rgb(0.38, 0.43, 0.41) });
    });
    outputs.push({ name: `${sanitizeFileName(file.name)}-numerato.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-numerati.zip"), "pdfdelta-numerati.zip");
}

function textStampPosition(position, pageWidth, pageHeight, textWidth) {
  const margin = 30;
  const positions = {
    "top-right": { x: pageWidth - textWidth - margin, y: pageHeight - margin },
    "top-left": { x: margin, y: pageHeight - margin },
    "bottom-right": { x: pageWidth - textWidth - margin, y: margin },
    "bottom-left": { x: margin, y: margin },
  };
  return positions[position] || positions["bottom-left"];
}

async function stampFileName(options) {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const label = file.name.slice(0, 90);
    pdfDoc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      const size = Math.max(8, Math.min(11, width / 58));
      const textWidth = font.widthOfTextAtSize(label, size);
      const position = textStampPosition(options.position, width, height, textWidth);
      page.drawText(label, {
        ...position,
        size,
        font,
        color: rgb(0.09, 0.13, 0.12),
        opacity: 0.72,
      });
    });
    outputs.push({ name: `${sanitizeFileName(file.name)}-nome-file.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-nome-file.zip"), "pdfdelta-nome-file.zip");
}

async function coverPage(options) {
  const outputs = [];
  const title = String(options.title || "Documento PdfDelta").trim();
  const subtitle = String(options.subtitle || "").trim();

  for (const file of getPdfFiles()) {
    const sourceBytes = await file.arrayBuffer();
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const titleFont = await output.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await output.embedFont(StandardFonts.Helvetica);
    const cover = output.addPage([595.28, 841.89]);

    cover.drawText(title.slice(0, 90), {
      x: 54,
      y: 570,
      size: 28,
      font: titleFont,
      color: rgb(0.09, 0.13, 0.12),
      maxWidth: 488,
    });
    if (subtitle) {
      cover.drawText(subtitle.slice(0, 120), {
        x: 54,
        y: 526,
        size: 14,
        font: bodyFont,
        color: rgb(0.34, 0.38, 0.36),
        maxWidth: 488,
      });
    }
    cover.drawLine({
      start: { x: 54, y: 492 },
      end: { x: 541, y: 492 },
      thickness: 1.2,
      color: rgb(0.95, 0.31, 0.24),
    });
    cover.drawText(`File: ${file.name}`.slice(0, 110), {
      x: 54,
      y: 444,
      size: 10,
      font: bodyFont,
      color: rgb(0.34, 0.38, 0.36),
    });
    cover.drawText(`Pagine originali: ${source.getPageCount()}`, {
      x: 54,
      y: 424,
      size: 10,
      font: bodyFont,
      color: rgb(0.34, 0.38, 0.36),
    });
    cover.drawText(`Generato localmente con PdfDelta`, {
      x: 54,
      y: 72,
      size: 9,
      font: bodyFont,
      color: rgb(0.55, 0.58, 0.55),
    });

    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
    outputs.push({ name: `${sanitizeFileName(file.name)}-copertina.pdf`, bytes: await savePdfBytes(output) });
  }

  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-copertine.zip"), "pdfdelta-copertine.zip");
}

async function headerFooter(options) {
  const outputs = [];
  const header = options.header || "";
  const footer = options.footer || "";
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    pdfDoc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      if (header) {
        page.drawText(header, { x: 36, y: height - 28, size: 9, font, color: rgb(0.38, 0.43, 0.41) });
      }
      if (footer) {
        page.drawText(footer, { x: 36, y: 20, size: 9, font, color: rgb(0.38, 0.43, 0.41) });
      }
      page.drawLine({
        start: { x: 36, y: height - 36 },
        end: { x: width - 36, y: height - 36 },
        thickness: 0.4,
        color: rgb(0.85, 0.82, 0.75),
      });
    });
    outputs.push({ name: `${sanitizeFileName(file.name)}-header-footer.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-header-footer.zip"), "pdfdelta-header-footer.zip");
}

async function letterhead(options) {
  const [documentFile, templateFile] = getPdfFiles();
  const documentBytes = await documentFile.arrayBuffer();
  const templateBytes = await templateFile.arrayBuffer();
  const source = await PDFDocument.load(documentBytes, { ignoreEncryption: true });
  const template = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const output = await PDFDocument.create();
  const documentPages = await output.embedPdf(documentBytes, source.getPageIndices());
  const [templatePage] = await output.embedPdf(templateBytes, [0]);

  if (!template.getPageCount()) throw new Error("Il PDF template non contiene pagine.");

  documentPages.forEach((documentPage) => {
    const page = output.addPage([documentPage.width, documentPage.height]);
    const slot = [0, 0, page.getWidth(), page.getHeight()];
    if (options.layer !== "foreground") drawEmbeddedPageFit(page, templatePage, slot, 0);
    drawEmbeddedPageFit(page, documentPage, slot, 0);
    if (options.layer === "foreground") drawEmbeddedPageFit(page, templatePage, slot, 0);
  });

  const bytes = await savePdfBytes(output);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${sanitizeFileName(documentFile.name)}-carta-intestata.pdf`);
}

async function batesNumbering(options) {
  const outputs = [];
  const prefix = options.prefix || "";
  let current = Math.max(1, Number.parseInt(options.start || "1", 10) || 1);
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    pdfDoc.getPages().forEach((page) => {
      const { width } = page.getSize();
      const label = `${prefix}${String(current).padStart(6, "0")}`;
      page.drawText(label, { x: width - 112, y: 20, size: 9, font, color: rgb(0.09, 0.13, 0.12) });
      current += 1;
    });
    outputs.push({ name: `${sanitizeFileName(file.name)}-bates.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-bates.zip"), "pdfdelta-bates.zip");
}

async function signText(options) {
  const outputs = [];
  const signature = options.signature || "Firma testuale";
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const page = pages[pages.length - 1];
    page.drawText(signature, {
      x: 42,
      y: 42,
      size: 12,
      font,
      color: rgb(0.09, 0.13, 0.12),
    });
    outputs.push({ name: `${sanitizeFileName(file.name)}-firmato.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-firmati.zip"), "pdfdelta-firmati.zip");
}

async function nUp(options) {
  const sourceFile = getPdfFiles()[0];
  const sourceBytes = await sourceFile.arrayBuffer();
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const output = await PDFDocument.create();
  const perSheet = Number.parseInt(options.layout, 10);
  const embeddedPages = await output.embedPdf(sourceBytes, source.getPageIndices());
  const sheetSize = [595.28, 841.89];
  const slots =
    perSheet === 4
      ? [
          [28, 441, 255, 360],
          [312, 441, 255, 360],
          [28, 42, 255, 360],
          [312, 42, 255, 360],
        ]
      : [
          [42, 441, 511, 360],
          [42, 42, 511, 360],
        ];

  embeddedPages.forEach((embeddedPage, index) => {
    if (index % perSheet === 0) output.addPage(sheetSize);
    const sheet = output.getPages()[output.getPageCount() - 1];
    const [x, y, maxWidth, maxHeight] = slots[index % perSheet];
    const scale = Math.min(maxWidth / embeddedPage.width, maxHeight / embeddedPage.height);
    sheet.drawPage(embeddedPage, { x, y, width: embeddedPage.width * scale, height: embeddedPage.height * scale });
  });

  const bytes = await savePdfBytes(output);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${sanitizeFileName(sourceFile.name)}-${perSheet}up.pdf`);
}

function drawEmbeddedPageFit(sheet, embeddedPage, slot, padding = 12) {
  const [x, y, maxWidth, maxHeight] = slot;
  const usableWidth = maxWidth - padding * 2;
  const usableHeight = maxHeight - padding * 2;
  const scale = Math.min(usableWidth / embeddedPage.width, usableHeight / embeddedPage.height);
  const width = embeddedPage.width * scale;
  const height = embeddedPage.height * scale;
  sheet.drawPage(embeddedPage, {
    x: x + (maxWidth - width) / 2,
    y: y + (maxHeight - height) / 2,
    width,
    height,
  });
}

async function booklet() {
  const sourceFile = getPdfFiles()[0];
  const sourceBytes = await sourceFile.arrayBuffer();
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const output = await PDFDocument.create();
  const originalCount = source.getPageCount();
  const total = Math.ceil(originalCount / 4) * 4;
  const embeddedPages = await output.embedPdf(sourceBytes, source.getPageIndices());
  const sheetSize = [841.89, 595.28];
  const leftSlot = [24, 24, (sheetSize[0] - 48) / 2, sheetSize[1] - 48];
  const rightSlot = [sheetSize[0] / 2, 24, (sheetSize[0] - 48) / 2, sheetSize[1] - 48];

  const drawPageNumber = (sheet, pageNumber, slot) => {
    if (pageNumber < 1 || pageNumber > originalCount) return;
    drawEmbeddedPageFit(sheet, embeddedPages[pageNumber - 1], slot);
  };

  for (let sheetIndex = 0; sheetIndex < total / 4; sheetIndex += 1) {
    const front = output.addPage(sheetSize);
    drawPageNumber(front, total - sheetIndex * 2, leftSlot);
    drawPageNumber(front, 1 + sheetIndex * 2, rightSlot);

    const back = output.addPage(sheetSize);
    drawPageNumber(back, 2 + sheetIndex * 2, leftSlot);
    drawPageNumber(back, total - 1 - sheetIndex * 2, rightSlot);
  }

  const bytes = await savePdfBytes(output);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${sanitizeFileName(sourceFile.name)}-booklet.pdf`);
}

function parsePosterGrid(value) {
  const [columns, rows] = String(value || "2x2")
    .split("x")
    .map((part) => Math.max(1, Number.parseInt(part, 10) || 1));
  return { columns: Math.min(columns, 3), rows: Math.min(rows, 3) };
}

async function posterTiles(options) {
  const outputs = [];
  const { columns, rows } = parsePosterGrid(options.grid);

  for (const file of getPdfFiles()) {
    const sourceBytes = await file.arrayBuffer();
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const embeddedPages = await output.embedPdf(sourceBytes, source.getPageIndices());

    embeddedPages.forEach((embeddedPage) => {
      const tileWidth = embeddedPage.width;
      const tileHeight = embeddedPage.height;
      const posterWidth = tileWidth * columns;
      const posterHeight = tileHeight * rows;

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const page = output.addPage([tileWidth, tileHeight]);
          page.drawPage(embeddedPage, {
            x: -column * tileWidth,
            y: -(rows - 1 - row) * tileHeight,
            width: posterWidth,
            height: posterHeight,
          });
        }
      }
    });

    outputs.push({
      name: `${sanitizeFileName(file.name)}-poster-${columns}x${rows}.pdf`,
      bytes: await savePdfBytes(output),
    });
  }

  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-poster.zip"), "pdfdelta-poster.zip");
}

function makeQrCanvas(text) {
  if (typeof window.qrcode !== "function") throw new Error("Generatore QR non caricato.");
  const qr = window.qrcode(0, "M");
  qr.addData(text || "PdfDelta");
  qr.make();
  const modules = qr.getModuleCount();
  const cell = 8;
  const quiet = 4;
  const size = (modules + quiet * 2) * cell;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = size;
  canvas.height = size;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#000000";
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (qr.isDark(row, col)) {
        context.fillRect((col + quiet) * cell, (row + quiet) * cell, cell, cell);
      }
    }
  }
  return canvas;
}

async function qrOnPdf(options) {
  const outputs = [];
  const qrPng = await canvasToPngBytes(makeQrCanvas(options.text));
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const qrImage = await pdfDoc.embedPng(qrPng);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    const size = Math.min(width, height) * 0.16;
    const pad = 28;
    const positions = {
      "bottom-right": [width - size - pad, pad],
      "bottom-left": [pad, pad],
      "top-right": [width - size - pad, height - size - pad],
      "top-left": [pad, height - size - pad],
    };
    const [x, y] = positions[options.position] || positions["bottom-right"];
    page.drawRectangle({
      x: x - 6,
      y: y - 6,
      width: size + 12,
      height: size + 12,
      color: rgb(1, 1, 1),
      opacity: 0.95,
    });
    page.drawImage(qrImage, { x, y, width: size, height: size });
    outputs.push({ name: `${sanitizeFileName(file.name)}-qr.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-qr.zip"), "pdfdelta-qr.zip");
}

async function addMargins(options) {
  const outputs = [];
  const margin = Number.parseInt(options.margin, 10);
  for (const file of getPdfFiles()) {
    const sourceBytes = await file.arrayBuffer();
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const embeddedPages = await output.embedPdf(sourceBytes, source.getPageIndices());
    embeddedPages.forEach((embeddedPage) => {
      const page = output.addPage([595.28, 841.89]);
      const maxWidth = page.getWidth() - margin * 2;
      const maxHeight = page.getHeight() - margin * 2;
      const scale = Math.min(maxWidth / embeddedPage.width, maxHeight / embeddedPage.height);
      const width = embeddedPage.width * scale;
      const height = embeddedPage.height * scale;
      page.drawPage(embeddedPage, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height,
      });
    });
    outputs.push({ name: `${sanitizeFileName(file.name)}-margini.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-margini.zip"), "pdfdelta-margini.zip");
}

async function printSafeScale(options) {
  const outputs = [];
  const scaleFactor = Number.parseFloat(options.scale || "0.94");

  for (const file of getPdfFiles()) {
    const sourceBytes = await file.arrayBuffer();
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const embeddedPages = await output.embedPdf(sourceBytes, source.getPageIndices());

    embeddedPages.forEach((embeddedPage) => {
      const page = output.addPage([embeddedPage.width, embeddedPage.height]);
      const width = embeddedPage.width * scaleFactor;
      const height = embeddedPage.height * scaleFactor;
      page.drawPage(embeddedPage, {
        x: (embeddedPage.width - width) / 2,
        y: (embeddedPage.height - height) / 2,
        width,
        height,
      });
    });

    outputs.push({ name: `${sanitizeFileName(file.name)}-margine-stampa.pdf`, bytes: await savePdfBytes(output) });
  }

  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-margine-stampa.zip"), "pdfdelta-margine-stampa.zip");
}

function drawCropMarkLines(page, x, y, dirX, dirY, slug) {
  const length = Math.min(18, slug * 0.75);
  const gap = Math.min(6, slug * 0.25);
  page.drawLine({
    start: { x: x + dirX * gap, y },
    end: { x: x + dirX * (gap + length), y },
    thickness: 0.45,
    color: rgb(0.05, 0.05, 0.05),
  });
  page.drawLine({
    start: { x, y: y + dirY * gap },
    end: { x, y: y + dirY * (gap + length) },
    thickness: 0.45,
    color: rgb(0.05, 0.05, 0.05),
  });
}

async function cropMarks(options) {
  const outputs = [];
  const slug = Math.max(12, Number.parseInt(options.slug || "24", 10) || 24);

  for (const file of getPdfFiles()) {
    const sourceBytes = await file.arrayBuffer();
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const embeddedPages = await output.embedPdf(sourceBytes, source.getPageIndices());

    embeddedPages.forEach((embeddedPage) => {
      const page = output.addPage([embeddedPage.width + slug * 2, embeddedPage.height + slug * 2]);
      page.drawPage(embeddedPage, { x: slug, y: slug, width: embeddedPage.width, height: embeddedPage.height });
      const left = slug;
      const right = slug + embeddedPage.width;
      const bottom = slug;
      const top = slug + embeddedPage.height;
      drawCropMarkLines(page, left, bottom, -1, -1, slug);
      drawCropMarkLines(page, right, bottom, 1, -1, slug);
      drawCropMarkLines(page, left, top, -1, 1, slug);
      drawCropMarkLines(page, right, top, 1, 1, slug);
    });

    outputs.push({ name: `${sanitizeFileName(file.name)}-segni-taglio.pdf`, bytes: await savePdfBytes(output) });
  }

  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-segni-taglio.zip"), "pdfdelta-segni-taglio.zip");
}

async function addBlankPages(options) {
  const outputs = [];
  const count = Math.min(100, Math.max(1, Number.parseInt(options.count || "1", 10) || 1));
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const firstPage = pdfDoc.getPages()[0];
    const size = firstPage ? [firstPage.getWidth(), firstPage.getHeight()] : [595.28, 841.89];
    for (let index = 0; index < count; index += 1) {
      if (options.position === "start") pdfDoc.insertPage(index, size);
      else pdfDoc.addPage(size);
    }
    outputs.push({ name: `${sanitizeFileName(file.name)}-pagine-vuote.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-pagine-vuote.zip"), "pdfdelta-pagine-vuote.zip");
}

async function cropMargins(options) {
  const outputs = [];
  const crop = Number.parseInt(options.crop, 10);
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    pdfDoc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      const safeCrop = Math.min(crop, width / 4, height / 4);
      page.setCropBox(safeCrop, safeCrop, width - safeCrop * 2, height - safeCrop * 2);
      page.setTrimBox(safeCrop, safeCrop, width - safeCrop * 2, height - safeCrop * 2);
    });
    outputs.push({ name: `${sanitizeFileName(file.name)}-ritagliato.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-ritagliati.zip"), "pdfdelta-ritagliati.zip");
}

function findInkBounds(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      const alpha = data[index + 3];
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (alpha > 24 && (red < 245 || green < 245 || blue < 245)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

async function autoTrim(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const padding = Number.parseInt(options.padding || "12", 10);
  for (const file of getPdfFiles()) {
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const renderDoc = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: pdfBytes.slice() }).promise;
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    for (let pageNumber = 1; pageNumber <= renderDoc.numPages; pageNumber += 1) {
      const renderPage = await renderDoc.getPage(pageNumber);
      const canvas = await renderPdfPageCanvas(renderPage, 0.35);
      const bounds = findInkBounds(canvas);
      if (!bounds) continue;
      const page = pages[pageNumber - 1];
      const { width, height } = page.getSize();
      const ratioX = width / canvas.width;
      const ratioY = height / canvas.height;
      const x = Math.max(0, bounds.minX * ratioX - padding);
      const y = Math.max(0, (canvas.height - bounds.maxY - 1) * ratioY - padding);
      const cropWidth = Math.min(width - x, (bounds.maxX - bounds.minX + 1) * ratioX + padding * 2);
      const cropHeight = Math.min(height - y, (bounds.maxY - bounds.minY + 1) * ratioY + padding * 2);
      if (cropWidth > 24 && cropHeight > 24) {
        page.setCropBox(x, y, cropWidth, cropHeight);
        page.setTrimBox(x, y, cropWidth, cropHeight);
      }
    }
    outputs.push({ name: `${sanitizeFileName(file.name)}-auto-trim.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-auto-trim.zip"), "pdfdelta-auto-trim.zip");
}

function pageSizeFromOption(value) {
  const sizes = {
    "a4-portrait": [595.28, 841.89],
    "a4-landscape": [841.89, 595.28],
    "letter-portrait": [612, 792],
    "letter-landscape": [792, 612],
  };
  return sizes[value] || sizes["a4-portrait"];
}

async function normalizeSize(options) {
  const outputs = [];
  const targetSize = pageSizeFromOption(options.pageSize);
  for (const file of getPdfFiles()) {
    const sourceBytes = await file.arrayBuffer();
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const embeddedPages = await output.embedPdf(sourceBytes, source.getPageIndices());
    embeddedPages.forEach((embeddedPage) => {
      const page = output.addPage(targetSize);
      const padding = 24;
      const maxWidth = page.getWidth() - padding * 2;
      const maxHeight = page.getHeight() - padding * 2;
      const scale = Math.min(maxWidth / embeddedPage.width, maxHeight / embeddedPage.height);
      const width = embeddedPage.width * scale;
      const height = embeddedPage.height * scale;
      page.drawPage(embeddedPage, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height,
      });
    });
    outputs.push({ name: `${sanitizeFileName(file.name)}-normalizzato.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-normalizzati.zip"), "pdfdelta-normalizzati.zip");
}

async function flattenForms() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    try {
      pdfDoc.getForm().flatten();
    } catch {
      // PDFs without AcroForm fields are still re-saved as normal PDFs.
    }
    outputs.push({ name: `${sanitizeFileName(file.name)}-moduli-statici.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-moduli-statici.zip"), "pdfdelta-moduli-statici.zip");
}

async function metadataReport() {
  const reports = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const keywords = pdfDoc.getKeywords();
    reports.push([
      `File: ${file.name}`,
      `Dimensione: ${formatBytes(file.size)}`,
      `Pagine: ${pdfDoc.getPageCount()}`,
      `Titolo: ${pdfDoc.getTitle() || ""}`,
      `Autore: ${pdfDoc.getAuthor() || ""}`,
      `Oggetto: ${pdfDoc.getSubject() || ""}`,
      `Keywords: ${Array.isArray(keywords) ? keywords.join(", ") : keywords || ""}`,
      `Creatore: ${pdfDoc.getCreator() || ""}`,
      `Producer: ${pdfDoc.getProducer() || ""}`,
      `Creato: ${pdfDoc.getCreationDate()?.toISOString?.() || ""}`,
      `Modificato: ${pdfDoc.getModificationDate()?.toISOString?.() || ""}`,
    ].join("\n"));
  }
  downloadBlob(new Blob([reports.join("\n\n---\n\n")], { type: "text/plain;charset=utf-8" }), "pdfdelta-metadati.txt");
}

function splitKeywords(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function removeMetadataStreams(pdfDoc) {
  deletePdfKeys(pdfDoc.catalog, ["Metadata"]);
  pdfDoc.getPages().forEach((page) => deletePdfKeys(page.node, ["Metadata"]));
}

async function setMetadata(options) {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    removeMetadataStreams(pdfDoc);
    pdfDoc.setTitle(String(options.title || "").trim());
    pdfDoc.setAuthor(String(options.author || "").trim());
    pdfDoc.setSubject(String(options.subject || "").trim());
    pdfDoc.setKeywords(splitKeywords(options.keywords));
    pdfDoc.setCreator("PdfDelta");
    pdfDoc.setProducer("PdfDelta");
    pdfDoc.setModificationDate(new Date());
    outputs.push({ name: `${sanitizeFileName(file.name)}-metadati.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-metadati-scritti.zip"), "pdfdelta-metadati-scritti.zip");
}

async function cleanMetadata() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    removeMetadataStreams(pdfDoc);
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator("PdfDelta");
    pdfDoc.setProducer("PdfDelta");
    pdfDoc.setCreationDate(new Date(0));
    pdfDoc.setModificationDate(new Date(0));
    outputs.push({ name: `${sanitizeFileName(file.name)}-metadati-puliti.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-metadati-puliti.zip"), "pdfdelta-metadati-puliti.zip");
}

function pdfName(key) {
  if (!PDFName) throw new Error("PDFName non disponibile nella libreria PDF locale.");
  return PDFName.of(key);
}

function deletePdfKeys(target, keys) {
  if (!target || typeof target.delete !== "function") return;
  keys.forEach((key) => target.delete(pdfName(key)));
}

async function removeAnnotations() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    pdfDoc.getPages().forEach((page) => deletePdfKeys(page.node, ["Annots"]));
    outputs.push({ name: `${sanitizeFileName(file.name)}-senza-annotazioni.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-senza-annotazioni.zip"), "pdfdelta-senza-annotazioni.zip");
}

async function cleanActions() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    deletePdfKeys(pdfDoc.catalog, ["OpenAction", "AA"]);

    const names = pdfDoc.catalog.lookup(pdfName("Names"));
    if (names && typeof names.delete === "function") names.delete(pdfName("JavaScript"));

    pdfDoc.getPages().forEach((page) => deletePdfKeys(page.node, ["AA", "Trans", "PresSteps"]));
    outputs.push({ name: `${sanitizeFileName(file.name)}-azioni-pulite.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-azioni-pulite.zip"), "pdfdelta-azioni-pulite.zip");
}

function lookupPdfKey(target, key) {
  try {
    return target && typeof target.lookup === "function" ? target.lookup(pdfName(key)) : undefined;
  } catch {
    return undefined;
  }
}

function pdfObjectText(value) {
  if (!value) return "";
  if (typeof value.decodeText === "function") return value.decodeText();
  if (typeof value.asString === "function") return value.asString();
  return String(value).replace(/[()]/g, "");
}

function pdfArrayItem(array, index) {
  if (!array) return undefined;
  if (typeof array.lookup === "function") return array.lookup(index);
  if (typeof array.get === "function") return array.get(index);
  return undefined;
}

function collectPdfNameTreeNames(node) {
  const found = [];
  const names = lookupPdfKey(node, "Names");
  if (names && typeof names.size === "function") {
    for (let index = 0; index < names.size(); index += 2) {
      const name = pdfObjectText(pdfArrayItem(names, index));
      if (name) found.push(name);
    }
  }

  const kids = lookupPdfKey(node, "Kids");
  if (kids && typeof kids.size === "function") {
    for (let index = 0; index < kids.size(); index += 1) {
      found.push(...collectPdfNameTreeNames(pdfArrayItem(kids, index)));
    }
  }

  return found;
}

function embeddedFileNames(pdfDoc) {
  const names = lookupPdfKey(pdfDoc.catalog, "Names");
  const embeddedFiles = lookupPdfKey(names, "EmbeddedFiles");
  return embeddedFiles ? collectPdfNameTreeNames(embeddedFiles) : [];
}

async function attachmentsReport() {
  const reports = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const names = embeddedFileNames(pdfDoc);
    reports.push(
      [
        `File: ${file.name}`,
        `Allegati rilevati: ${names.length}`,
        names.length ? names.map((name) => `- ${name}`).join("\n") : "Nessun allegato incorporato rilevato.",
      ].join("\n")
    );
  }
  downloadBlob(new Blob([reports.join("\n\n---\n\n")], { type: "text/plain;charset=utf-8" }), "pdfdelta-allegati.txt");
}

async function removeAttachments() {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const names = lookupPdfKey(pdfDoc.catalog, "Names");
    if (names && typeof names.delete === "function") names.delete(pdfName("EmbeddedFiles"));
    deletePdfKeys(pdfDoc.catalog, ["AF"]);
    pdfDoc.getPages().forEach((page) => deletePdfKeys(page.node, ["AF"]));
    outputs.push({ name: `${sanitizeFileName(file.name)}-senza-allegati.pdf`, bytes: await savePdfBytes(pdfDoc) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-senza-allegati.zip"), "pdfdelta-senza-allegati.zip");
}

function mimeTypeForFile(file) {
  const ext = fileExt(file);
  const known = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    txt: "text/plain",
  };
  return file.type || known[ext] || "application/octet-stream";
}

async function attachFilesToPdf() {
  const pdfFiles = getPdfFiles();
  const baseFile = pdfFiles[0];
  if (!baseFile) throw new Error("Aggiungi un PDF come documento principale.");

  const pdfDoc = await loadPdf(baseFile);
  const attachments = state.files.filter((file) => file !== baseFile);
  if (!attachments.length) throw new Error("Aggiungi almeno un file da allegare.");

  for (const file of attachments) {
    await pdfDoc.attach(await file.arrayBuffer(), file.name, {
      mimeType: mimeTypeForFile(file),
      description: "Allegato aggiunto localmente con PdfDelta",
      creationDate: new Date(file.lastModified || Date.now()),
      modificationDate: new Date(file.lastModified || Date.now()),
    });
  }

  const bytes = await savePdfBytes(pdfDoc);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${sanitizeFileName(baseFile.name)}-con-allegati.pdf`);
}

async function compressScan(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const quality = Number.parseFloat(options.quality || "0.72");
  const scale = Number.parseFloat(options.scale || "1.1");

  for (const file of getPdfFiles()) {
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const source = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: pdfBytes }).promise;
    const output = await PDFDocument.create();

    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      const sourcePage = await source.getPage(pageNumber);
      const viewport = sourcePage.getViewport({ scale: 1 });
      const canvas = await renderPdfPageCanvas(sourcePage, scale);
      const image = await output.embedJpg(await canvasToImageBytes(canvas, "image/jpeg", quality));
      canvas.width = canvas.height = 0;
      const page = output.addPage([viewport.width, viewport.height]);
      page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }

    output.setTitle("");
    output.setAuthor("");
    output.setCreator("PdfDelta");
    output.setProducer("PdfDelta");
    outputs.push({ name: `${sanitizeFileName(file.name)}-compresso.pdf`, bytes: await savePdfBytes(output) });
  }

  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-scansioni-compresse.zip"), "pdfdelta-scansioni-compresse.zip");
}

async function sanitizeRaster(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const scale = Number.parseFloat(options.scale || "1.25");
  for (const file of getPdfFiles()) {
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const source = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: pdfBytes }).promise;
    const output = await PDFDocument.create();
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      const sourcePage = await source.getPage(pageNumber);
      const viewport = sourcePage.getViewport({ scale: 1 });
      const canvas = await renderPdfPageCanvas(sourcePage, scale);
      const image = await output.embedPng(await canvasToPngBytes(canvas));
      const page = output.addPage([viewport.width, viewport.height]);
      page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }
    output.setTitle("");
    output.setAuthor("");
    output.setSubject("");
    output.setKeywords([]);
    output.setCreator("PdfDelta");
    output.setProducer("PdfDelta");
    outputs.push({ name: `${sanitizeFileName(file.name)}-sanitizzato.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-sanitizzati.zip"), "pdfdelta-sanitizzati.zip");
}

function canvasToGrayscale(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function enhanceCanvas(canvas, mode) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);

    if (mode === "bw") {
      const value = gray > 178 ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    } else {
      data[i] = clampChannel((data[i] - 128) * 1.3 + 138);
      data[i + 1] = clampChannel((data[i + 1] - 128) * 1.3 + 138);
      data[i + 2] = clampChannel((data[i + 2] - 128) * 1.3 + 138);
    }

    data[i + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

async function enhanceScan(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const mode = options.mode || "contrast";
  const scale = Number.parseFloat(options.scale || "1.25");

  for (const file of getPdfFiles()) {
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const source = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: pdfBytes }).promise;
    const output = await PDFDocument.create();

    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      const sourcePage = await source.getPage(pageNumber);
      const viewport = sourcePage.getViewport({ scale: 1 });
      const canvas = enhanceCanvas(await renderPdfPageCanvas(sourcePage, scale), mode);
      const bytes =
        mode === "bw" ? await canvasToPngBytes(canvas) : await canvasToImageBytes(canvas, "image/jpeg", 0.9);
      const image = mode === "bw" ? await output.embedPng(bytes) : await output.embedJpg(bytes);
      const page = output.addPage([viewport.width, viewport.height]);
      page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }

    output.setTitle("");
    output.setAuthor("");
    output.setCreator("PdfDelta");
    output.setProducer("PdfDelta");
    outputs.push({
      name: `${sanitizeFileName(file.name)}-scansione-migliorata.pdf`,
      bytes: await savePdfBytes(output),
    });
  }

  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-scansioni-migliorate.zip"), "pdfdelta-scansioni-migliorate.zip");
}

async function grayscaleRaster(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const scale = Number.parseFloat(options.scale || "1.25");
  for (const file of getPdfFiles()) {
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const source = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: pdfBytes }).promise;
    const output = await PDFDocument.create();
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      const sourcePage = await source.getPage(pageNumber);
      const viewport = sourcePage.getViewport({ scale: 1 });
      const canvas = canvasToGrayscale(await renderPdfPageCanvas(sourcePage, scale));
      const image = await output.embedPng(await canvasToPngBytes(canvas));
      const page = output.addPage([viewport.width, viewport.height]);
      page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }
    output.setTitle("");
    output.setAuthor("");
    output.setCreator("PdfDelta");
    output.setProducer("PdfDelta");
    outputs.push({ name: `${sanitizeFileName(file.name)}-grigio.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-grigio.zip"), "pdfdelta-grigio.zip");
}

function diffLines(leftText, rightText) {
  const left = leftText.split(/\n+/);
  const right = rightText.split(/\n+/);
  const max = Math.max(left.length, right.length);
  const rows = [];
  for (let i = 0; i < max; i += 1) {
    const a = left[i] || "";
    const b = right[i] || "";
    if (a !== b) {
      rows.push(`<tr><td>${i + 1}</td><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td></tr>`);
    }
  }
  return rows.join("") || "<tr><td colspan=\"3\">Nessuna differenza testuale rilevata.</td></tr>";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

async function compareText() {
  const [first, second] = getPdfFiles();
  const firstText = await extractTextFromPdfFile(first);
  const secondText = await extractTextFromPdfFile(second);
  const html = `<!doctype html>
<html lang="it">
<meta charset="utf-8" />
<title>Confronto PdfDelta</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#17211f}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
th{background:#f7f3ea;text-align:left}
td:first-child{width:54px;font-weight:bold}
</style>
<h1>Confronto testo PDF</h1>
<p>${escapeHtml(first.name)} vs ${escapeHtml(second.name)}</p>
<table><thead><tr><th>#</th><th>${escapeHtml(first.name)}</th><th>${escapeHtml(second.name)}</th></tr></thead><tbody>${diffLines(firstText, secondText)}</tbody></table>
</html>`;
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), "pdfdelta-confronto.html");
}

function compareCanvases(leftCanvas, rightCanvas, threshold) {
  const width = Math.max(leftCanvas?.width || 0, rightCanvas?.width || 0);
  const height = Math.max(leftCanvas?.height || 0, rightCanvas?.height || 0);
  if (!width || !height) return { changed: 1, pixels: 1, ratio: 1 };

  const left = document.createElement("canvas");
  const right = document.createElement("canvas");
  left.width = right.width = width;
  left.height = right.height = height;

  const leftContext = left.getContext("2d", { willReadFrequently: true });
  const rightContext = right.getContext("2d", { willReadFrequently: true });
  [leftContext, rightContext].forEach((context) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  });
  if (leftCanvas) leftContext.drawImage(leftCanvas, 0, 0);
  if (rightCanvas) rightContext.drawImage(rightCanvas, 0, 0);

  const leftData = leftContext.getImageData(0, 0, width, height).data;
  const rightData = rightContext.getImageData(0, 0, width, height).data;
  let changed = 0;
  const pixels = width * height;

  for (let index = 0; index < leftData.length; index += 4) {
    const delta =
      Math.abs(leftData[index] - rightData[index]) +
      Math.abs(leftData[index + 1] - rightData[index + 1]) +
      Math.abs(leftData[index + 2] - rightData[index + 2]);
    if (delta > threshold) changed += 1;
  }

  return { changed, pixels, ratio: changed / pixels };
}

async function renderPageForCompare(pdf, pageNumber) {
  if (pageNumber > pdf.numPages) return null;
  const page = await pdf.getPage(pageNumber);
  return renderPdfPageCanvas(page, 0.45);
}

async function compareVisual(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const [firstFile, secondFile] = getPdfFiles();
  const threshold = Number.parseInt(options.sensitivity || "32", 10);
  const firstBytes = new Uint8Array(await firstFile.arrayBuffer());
  const secondBytes = new Uint8Array(await secondFile.arrayBuffer());
  const first = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: firstBytes }).promise;
  const second = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: secondBytes }).promise;
  const maxPages = Math.max(first.numPages, second.numPages);
  const rows = [];
  let changedPages = 0;

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const left = await renderPageForCompare(first, pageNumber);
    const right = await renderPageForCompare(second, pageNumber);
    const result = compareCanvases(left, right, threshold);
    const changed = result.ratio > 0.002 || !left || !right;
    if (changed) changedPages += 1;
    rows.push(`
      <tr>
        <td>${pageNumber}</td>
        <td>${left ? "presente" : "mancante"}</td>
        <td>${right ? "presente" : "mancante"}</td>
        <td>${(result.ratio * 100).toFixed(2)}%</td>
        <td>${changed ? "Differenze" : "Uguale"}</td>
      </tr>
    `);
  }

  const html = `<!doctype html>
<html lang="it">
<meta charset="utf-8" />
<title>Confronto visuale PdfDelta</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#17211f}
table{border-collapse:collapse;width:100%;margin-top:16px}
th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f7f3ea}
.summary{padding:12px;background:#f7f3ea;border:1px solid #ddd}
</style>
<h1>Confronto visuale PDF</h1>
<div class="summary">
  <strong>${escapeHtml(firstFile.name)}</strong> vs <strong>${escapeHtml(secondFile.name)}</strong><br>
  Pagine analizzate: ${maxPages}. Pagine con differenze: ${changedPages}.
</div>
<table>
  <thead><tr><th>Pagina</th><th>Primo PDF</th><th>Secondo PDF</th><th>Pixel diversi</th><th>Esito</th></tr></thead>
  <tbody>${rows.join("")}</tbody>
</table>
</html>`;

  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), "pdfdelta-confronto-visuale.html");
}

async function auditAccessibility() {
  const reports = [];
  for (const file of getPdfFiles()) {
    const pdfDoc = await loadPdf(file);
    const text = await extractTextFromPdfFile(file);
    const words = text.split(/\s+/).filter(Boolean).length;
    reports.push([
      `File: ${file.name}`,
      `Pagine: ${pdfDoc.getPageCount()}`,
      `Parole estraibili: ${words}`,
      `Titolo presente: ${pdfDoc.getTitle() ? "si" : "no"}`,
      `Autore presente: ${pdfDoc.getAuthor() ? "si" : "no"}`,
      `Nota: audit base. Tag PDF/ordine lettura richiedono parser dedicati.`,
    ].join("\n"));
  }
  downloadBlob(new Blob([reports.join("\n\n---\n\n")], { type: "text/plain;charset=utf-8" }), "pdfdelta-audit-accessibilita.txt");
}

async function pageIndicesContainingText(file, query) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) throw new Error("Inserisci un testo da cercare.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: bytes }).promise;
  const matches = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").toLowerCase();
    if (text.includes(normalizedQuery)) matches.push(pageNumber - 1);
  }

  return matches;
}

async function extractByText(options) {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const matches = await pageIndicesContainingText(file, options.query);
    if (!matches.length) throw new Error(`${file.name}: nessuna pagina contiene "${options.query}".`);
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, matches);
    pages.forEach((page) => output.addPage(page));
    outputs.push({ name: `${sanitizeFileName(file.name)}-testo-trovato.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-testo-trovato.zip"), "pdfdelta-testo-trovato.zip");
}

async function removeByText(options) {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const matches = new Set(await pageIndicesContainingText(file, options.query));
    const keep = source.getPageIndices().filter((index) => !matches.has(index));
    if (!matches.size) throw new Error(`${file.name}: nessuna pagina contiene "${options.query}".`);
    if (!keep.length) throw new Error(`${file.name}: tutte le pagine contengono "${options.query}".`);
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, keep);
    pages.forEach((page) => output.addPage(page));
    outputs.push({ name: `${sanitizeFileName(file.name)}-senza-testo.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-senza-testo.zip"), "pdfdelta-senza-testo.zip");
}

function rangesFromMarkers(markers, pageCount) {
  const starts = [...new Set(markers)].sort((left, right) => left - right);
  const ranges = [];

  if (starts[0] > 0) ranges.push({ label: "prima-marker", indices: Array.from({ length: starts[0] }, (_, index) => index) });

  starts.forEach((start, index) => {
    const end = index + 1 < starts.length ? starts[index + 1] : pageCount;
    ranges.push({
      label: `blocco-${String(index + 1).padStart(2, "0")}`,
      indices: Array.from({ length: end - start }, (_, offset) => start + offset),
    });
  });

  return ranges.filter((range) => range.indices.length);
}

async function splitByText(options) {
  const outputs = [];
  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const markers = await pageIndicesContainingText(file, options.query);
    if (!markers.length) throw new Error(`${file.name}: nessuna pagina contiene "${options.query}".`);
    const ranges = rangesFromMarkers(markers, source.getPageCount());
    if (ranges.length < 2) throw new Error(`${file.name}: serve almeno un marker che crei più blocchi.`);

    for (const range of ranges) {
      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, range.indices);
      pages.forEach((page) => output.addPage(page));
      outputs.push({ name: `${sanitizeFileName(file.name)}-${range.label}.pdf`, bytes: await savePdfBytes(output) });
    }
  }

  downloadBlob(await zipOutputs(outputs, "pdfdelta-divisi-testo.zip"), "pdfdelta-divisi-testo.zip");
}

function canvasHasVisibleInk(canvas, threshold) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let ink = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    if (alpha > 24 && (red < 245 || green < 245 || blue < 245)) ink += 1;
  }
  return ink / pixels > threshold;
}

async function blankPageIndicesFromRenderDoc(renderDoc, threshold) {
  const blank = [];
  for (let pageNumber = 1; pageNumber <= renderDoc.numPages; pageNumber += 1) {
    const page = await renderDoc.getPage(pageNumber);
    const canvas = await renderPdfPageCanvas(page, 0.18);
    if (!canvasHasVisibleInk(canvas, threshold)) blank.push(pageNumber - 1);
  }
  return blank;
}

async function removeBlankPages(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const threshold = Number.parseFloat(options.threshold || "0.003");
  for (const file of getPdfFiles()) {
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const sourceForRender = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: pdfBytes.slice() }).promise;
    const sourceForCopy = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const blank = new Set(await blankPageIndicesFromRenderDoc(sourceForRender, threshold));
    const keep = sourceForCopy.getPageIndices().filter((index) => !blank.has(index));
    if (!keep.length) throw new Error(`${file.name}: tutte le pagine sembrano bianche.`);
    const output = await PDFDocument.create();
    const pages = await output.copyPages(sourceForCopy, keep);
    pages.forEach((page) => output.addPage(page));
    outputs.push({ name: `${sanitizeFileName(file.name)}-senza-bianche.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-senza-bianche.zip"), "pdfdelta-senza-bianche.zip");
}

function rangesBetweenBlankPages(blankIndices, pageCount) {
  const blank = new Set(blankIndices);
  const ranges = [];
  let current = [];

  for (let index = 0; index < pageCount; index += 1) {
    if (blank.has(index)) {
      if (current.length) ranges.push(current);
      current = [];
    } else {
      current.push(index);
    }
  }

  if (current.length) ranges.push(current);
  return ranges;
}

async function splitBlankPages(options) {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  const threshold = Number.parseFloat(options.threshold || "0.003");

  for (const file of getPdfFiles()) {
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const sourceForRender = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: pdfBytes.slice() }).promise;
    const sourceForCopy = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const blank = await blankPageIndicesFromRenderDoc(sourceForRender, threshold);
    const ranges = rangesBetweenBlankPages(blank, sourceForCopy.getPageCount());
    if (!blank.length) throw new Error(`${file.name}: nessuna pagina bianca rilevata.`);
    if (ranges.length < 2) throw new Error(`${file.name}: le pagine bianche non creano più blocchi.`);

    for (let index = 0; index < ranges.length; index += 1) {
      const output = await PDFDocument.create();
      const pages = await output.copyPages(sourceForCopy, ranges[index]);
      pages.forEach((page) => output.addPage(page));
      outputs.push({
        name: `${sanitizeFileName(file.name)}-sezione-${String(index + 1).padStart(2, "0")}.pdf`,
        bytes: await savePdfBytes(output),
      });
    }
  }

  downloadBlob(await zipOutputs(outputs, "pdfdelta-divisi-bianche.zip"), "pdfdelta-divisi-bianche.zip");
}

async function splitOrientation() {
  const outputs = [];

  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const buckets = { verticali: [], orizzontali: [] };
    source.getPages().forEach((page, index) => {
      const { width, height } = page.getSize();
      if (width > height) buckets.orizzontali.push(index);
      else buckets.verticali.push(index);
    });

    for (const [label, indices] of Object.entries(buckets)) {
      if (!indices.length) continue;
      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, indices);
      pages.forEach((page) => output.addPage(page));
      outputs.push({ name: `${sanitizeFileName(file.name)}-${label}.pdf`, bytes: await savePdfBytes(output) });
    }
  }

  if (!outputs.length) throw new Error("Nessuna pagina da separare.");
  downloadBlob(await zipOutputs(outputs, "pdfdelta-orientamento.zip"), "pdfdelta-orientamento.zip");
}

const PAGE_SIZE_PRESETS = [
  ["A3", 297, 420],
  ["A4", 210, 297],
  ["A5", 148, 210],
  ["Letter", 216, 279],
  ["Legal", 216, 356],
  ["Tabloid", 279, 432],
];

function pointsToMm(points) {
  return (points * 25.4) / 72;
}

function detectPageFormat(widthMm, heightMm) {
  const tolerance = 4;
  for (const [name, presetWidth, presetHeight] of PAGE_SIZE_PRESETS) {
    const portraitMatch = Math.abs(widthMm - presetWidth) <= tolerance && Math.abs(heightMm - presetHeight) <= tolerance;
    const landscapeMatch = Math.abs(widthMm - presetHeight) <= tolerance && Math.abs(heightMm - presetWidth) <= tolerance;
    if (portraitMatch || landscapeMatch) return name;
  }
  return `${Math.round(widthMm)}x${Math.round(heightMm)}mm`;
}

function getPageSizeInfo(page) {
  const { width, height } = page.getSize();
  const widthMm = pointsToMm(width);
  const heightMm = pointsToMm(height);
  return {
    width,
    height,
    widthMm,
    heightMm,
    format: detectPageFormat(widthMm, heightMm),
    orientation: width > height ? "orizzontale" : "verticale",
  };
}

function csvValue(value) {
  const string = String(value ?? "");
  return /[",\n]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
}

async function pageSizeReport() {
  const rows = [["file", "pagina", "formato", "orientamento", "larghezza_pt", "altezza_pt", "larghezza_mm", "altezza_mm"].map(csvValue).join(",")];

  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    source.getPages().forEach((page, index) => {
      const info = getPageSizeInfo(page);
      rows.push(
        [
          file.name,
          index + 1,
          info.format,
          info.orientation,
          info.width.toFixed(2),
          info.height.toFixed(2),
          info.widthMm.toFixed(1),
          info.heightMm.toFixed(1),
        ]
          .map(csvValue)
          .join(",")
      );
    });
  }

  downloadBlob(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }), "pdfdelta-formati-pagine.csv");
}

async function splitBySize() {
  const outputs = [];

  for (const file of getPdfFiles()) {
    const source = await loadPdf(file);
    const buckets = new Map();

    source.getPages().forEach((page, index) => {
      const info = getPageSizeInfo(page);
      const key = sanitizeFileName(`${info.format}-${info.orientation}`);
      if (!buckets.has(key)) buckets.set(key, { indices: [], label: key });
      buckets.get(key).indices.push(index);
    });

    for (const bucket of buckets.values()) {
      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, bucket.indices);
      pages.forEach((page) => output.addPage(page));
      outputs.push({ name: `${sanitizeFileName(file.name)}-${bucket.label}.pdf`, bytes: await savePdfBytes(output) });
    }
  }

  if (!outputs.length) throw new Error("Nessuna pagina da separare.");
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-formati-pagine.zip"), "pdfdelta-formati-pagine.zip");
}

function perceptualHash(canvas) {
  const small = document.createElement("canvas");
  small.width = 16;
  small.height = 16;
  const context = small.getContext("2d", { willReadFrequently: true });
  context.drawImage(canvas, 0, 0, 16, 16);
  const data = context.getImageData(0, 0, 16, 16).data;
  const luminance = [];
  for (let i = 0; i < data.length; i += 4) {
    luminance.push((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0);
  }
  const average = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
  return luminance.map((value) => (value < average ? "1" : "0")).join("");
}

async function removeDuplicates() {
  if (!window.pdfjsLib) throw new Error("PDF.js non caricato. Controlla la connessione.");
  const outputs = [];
  for (const file of getPdfFiles()) {
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const renderDoc = await window.pdfjsLib.getDocument({ isEvalSupported: false, data: pdfBytes.slice() }).promise;
    const source = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const seen = new Set();
    const keep = [];
    for (let pageNumber = 1; pageNumber <= renderDoc.numPages; pageNumber += 1) {
      const page = await renderDoc.getPage(pageNumber);
      const canvas = await renderPdfPageCanvas(page, 0.18);
      const hash = perceptualHash(canvas);
      if (!seen.has(hash)) {
        seen.add(hash);
        keep.push(pageNumber - 1);
      }
    }
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, keep);
    pages.forEach((page) => output.addPage(page));
    outputs.push({ name: `${sanitizeFileName(file.name)}-senza-duplicati.pdf`, bytes: await savePdfBytes(output) });
  }
  if (outputs.length === 1) downloadBlob(new Blob([outputs[0].bytes], { type: "application/pdf" }), outputs[0].name);
  else downloadBlob(await zipOutputs(outputs, "pdfdelta-senza-duplicati.zip"), "pdfdelta-senza-duplicati.zip");
}

const handlers = {
  merge: mergePdfs,
  "merge-mixed": mergeMixedFiles,
  interleave: interleavePdfs,
  split: splitPdfs,
  "split-ranges": splitByRanges,
  "split-odd-even": splitOddEven,
  "extract-pages": extractPages,
  "remove-pages": removePages,
  "reorder-pages": reorderPages,
  rotate: rotatePdfs,
  "reverse-pages": reversePages,
  "duplicate-pages": duplicatePages,
  optimize: optimizePdfs,
  "compress-scan": compressScan,
  "enhance-scan": enhanceScan,
  "images-to-pdf": imagesToPdf,
  "text-to-pdf": textToPdf,
  "blank-pdf": blankPdf,
  "extract-text": extractText,
  "pdf-to-markdown": pdfToMarkdown,
  "pdf-to-word": pdfToWord,
  "pdf-to-images": pdfToImages,
  "pdf-to-jpg": pdfToJpg,
  "pdf-to-webp": pdfToWebp,
  "pdf-to-social": pdfToSocialImages,
  "pdf-to-long-jpg": pdfToLongJpg,
  "contact-sheet": contactSheet,
  watermark,
  "image-stamp": imageStamp,
  "page-numbers": pageNumbers,
  "edit-pdf": openPdfEditorTool,
  "stamp-filename": stampFileName,
  "cover-page": coverPage,
  "header-footer": headerFooter,
  letterhead,
  bates: batesNumbering,
  "sign-text": signText,
  nup: nUp,
  booklet,
  "poster-tiles": posterTiles,
  "qr-on-pdf": qrOnPdf,
  "add-margins": addMargins,
  "print-safe-scale": printSafeScale,
  "crop-marks": cropMarks,
  "add-blank-pages": addBlankPages,
  "crop-margins": cropMargins,
  "auto-trim": autoTrim,
  "normalize-size": normalizeSize,
  "flatten-forms": flattenForms,
  metadata: metadataReport,
  "set-metadata": setMetadata,
  "clean-metadata": cleanMetadata,
  "remove-annotations": removeAnnotations,
  "clean-actions": cleanActions,
  "attachments-report": attachmentsReport,
  "remove-attachments": removeAttachments,
  "attach-files": attachFilesToPdf,
  "sanitize-raster": sanitizeRaster,
  "grayscale-raster": grayscaleRaster,
  "compare-text": compareText,
  "compare-visual": compareVisual,
  audit: auditAccessibility,
  "word-count": wordCountReport,
  "document-report": documentReport,
  "queue-report": queueReport,
  "extract-by-text": extractByText,
  "remove-by-text": removeByText,
  "split-by-text": splitByText,
  "remove-blank-pages": removeBlankPages,
  "split-blank-pages": splitBlankPages,
  "split-orientation": splitOrientation,
  "page-size-report": pageSizeReport,
  "split-by-size": splitBySize,
  "remove-duplicates": removeDuplicates,
};

async function runSelectedTool() {
  if (state.busy || workspaceBusy()) return;
  const tool = state.selectedTool;
  if (!tool || !isToolCompatible(tool)) return;
  if (!PDFDocument) throw new Error("pdf-lib non caricato. Controlla la connessione.");

  const handler = handlers[tool.id];
  if (!handler) throw new Error("Strumento non ancora implementato in modalita zero costi.");

  state.busy = true;
  window.dispatchEvent(new CustomEvent('pdfdelta-busy', { detail: true }));
  const lockedControls = [...document.querySelectorAll('#workspace button, #workspace input, #workspace select')].map(control => [control, control.disabled]);
  lockedControls.forEach(([control]) => { control.disabled = true; });
  runButton.disabled = true;
  runButton.textContent = "Elaborazione locale...";
  resultPanel.textContent = "I file restano nel browser. Nessun upload in corso.";

  try {
    const prepared = await workspaceBridge.beforeRun(tool);
    if (prepared) state.files = prepared;
    await handler(getOptions());
  } catch (error) {
    resultPanel.innerHTML = `<strong>Errore.</strong> ${escapeHtml(error.message || "Operazione non riuscita.")}`;
  } finally {
    await window.PdfEngine.releaseReaders(state.editor.pdf);
    state.busy = false;
    lockedControls.forEach(([control, disabled]) => { control.disabled = disabled; });
    renderFiles();
    window.dispatchEvent(new CustomEvent('pdfdelta-busy', { detail: false }));
  }
}

categoryBar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (button) setFilter(button.dataset.category);
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    setFilter(button.dataset.filter);
  });
});

grid.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    event.stopPropagation();
    toggleFavorite(favoriteButton.dataset.favorite);
    return;
  }

  const card = event.target.closest("[data-tool]");
  if (card) selectTool(card.dataset.tool);
});

grid.addEventListener("keydown", (event) => {
  if (event.target.closest("[data-favorite]")) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-tool]");
  if (card) {
    event.preventDefault();
    selectTool(card.dataset.tool);
  }
});

document.addEventListener("click", async (event) => {
  const shortcut = event.target.closest("[data-tool-shortcut]");
  if (!shortcut) return;
  const toolId = shortcut.dataset.toolShortcut;
  selectTool(toolId);
  if (toolId === "edit-pdf") {
    if (!getPdfFiles()[0]) {
      document.querySelector("#workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    try {
      await runSelectedTool();
    } catch (error) {
      setEditorStatus(error.message || "Editor non disponibile.");
    }
    return;
  }
  document.querySelector("#workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderTools();
  if (state.query.trim().length > 1) document.querySelector("#strumenti")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

fileInput.addEventListener("change", (event) => addFiles(event.target.files));

fileList.addEventListener("click", (event) => {
  if (state.busy || workspaceBusy()) return;
  const remove = event.target.closest("[data-remove-file]");
  if (!remove) return;
  state.files.splice(Number(remove.dataset.removeFile), 1);
  fileInput.value = "";
  if (state.editor.file && !state.files.includes(state.editor.file)) resetEditor();
  if (state.selectedTool && !isToolCompatible(state.selectedTool)) {
    const suggested = firstCompatibleSuggestion();
    state.selectedTool = suggested || null;
    selectedTool.textContent = suggested ? `${suggested.name} selezionato` : "Scegli un'azione";
    renderOptions();
  }
  resultPanel.textContent = "";
  renderTools();
  renderFiles();
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
  });
});

dropzone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));

$("#clearQueue").addEventListener("click", () => {
  if (state.busy || workspaceBusy()) return;
  state.files = [];
  fileInput.value = "";
  resultPanel.textContent = "";
  resetEditor();
  renderFiles();
});

runButton.addEventListener("click", runSelectedTool);

editorModes?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-editor-mode]");
  if (button) setEditorMode(button.dataset.editorMode);
});

const signaturePad = document.getElementById('signaturePad');
function paintSignaturePad() {
  const ctx = signaturePad.getContext('2d'); ctx.clearRect(0, 0, 600, 200);
  ctx.strokeStyle = '#123f8c'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const stroke of signatureDraft) { ctx.beginPath(); stroke.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); }
  document.getElementById('signaturePadUse').disabled = !signatureDraft.some(stroke => stroke.length > 1);
}
document.getElementById('signatureDraw').onclick = () => { document.getElementById('signaturePadPanel').hidden = false; paintSignaturePad(); };
document.getElementById('signaturePadClose').onclick = () => { document.getElementById('signaturePadPanel').hidden = true; };
document.getElementById('signaturePadClear').onclick = () => { signatureDraft = []; signatureStroke = null; paintSignaturePad(); };
const padPoint = event => { const r = signaturePad.getBoundingClientRect(); return { x: Math.max(0, Math.min(600, (event.clientX - r.left) * 600 / r.width)), y: Math.max(0, Math.min(200, (event.clientY - r.top) * 200 / r.height)) }; };
signaturePad.onpointerdown = event => { event.preventDefault(); signatureStroke = [padPoint(event)]; signatureDraft.push(signatureStroke); signaturePad.setPointerCapture(event.pointerId); };
signaturePad.onpointermove = event => { if (!signatureStroke) return; signatureStroke.push(padPoint(event)); paintSignaturePad(); };
signaturePad.onpointerup = signaturePad.onpointercancel = () => { signatureStroke = null; };
document.getElementById('signaturePadUse').onclick = () => {
  const strokes = signatureDraft.filter(stroke => stroke.length > 1);
  if (!strokes.length) return;
  const points = strokes.flat(), minX = Math.min(...points.map(p => p.x)), minY = Math.min(...points.map(p => p.y));
  const scale = Math.min(160 / Math.max(1, Math.max(...points.map(p => p.x)) - minX), 65 / Math.max(1, Math.max(...points.map(p => p.y)) - minY));
  reusableSignature = strokes.map(stroke => stroke.map(p => ({ x: (p.x - minX) * scale, y: (p.y - minY) * scale })));
  setEditorMode('signature-drawing');
  document.getElementById('signaturePadPanel').hidden = true;
  setEditorStatus('Firma pronta. Clicca sulla pagina per inserirla, anche in più punti o su altre pagine. La firma resta solo in questa sessione.');
};

editorInkCanvas?.addEventListener("pointerdown", (event) => {
  if (!state.editor.pdf) {
    setEditorStatus("Apri un PDF nell'editor.");
    return;
  }
  const point = editorPdfPoint(event);
  if (state.editor.mode === "draw") {
    state.editor.drawing = true;
    state.editor.currentStroke = {
      sequence: ++editorSequence,
      page: state.editor.pageNumber,
      thickness: 1.8,
      points: [point],
    };
    state.editor.strokes.push(state.editor.currentStroke);
    editorInkCanvas.setPointerCapture(event.pointerId);
    return;
  }

  const mark = {
    sequence: ++editorSequence,
    page: state.editor.pageNumber,
    type: state.editor.mode,
    text: editorTextValue(),
    x: point.x,
    y: point.y,
    size: state.editor.mode === "signature" ? 18 : 11,
    font: document.getElementById('signatureFont').value,
    ...(state.editor.mode === 'signature-drawing' ? { strokes: reusableSignature.map(stroke => stroke.map(p => ({ ...p }))) } : {}),
  };
  if (mark.type === 'signature-drawing') {
    const factor = Number(document.getElementById('signatureSize').value) / 160;
    const points = mark.strokes.flat();
    const width = Math.max(1, ...points.map(p => p.x)), height = Math.max(1, ...points.map(p => p.y));
    const margin = Math.min(4, state.editor.pageSize.width / 10, state.editor.pageSize.height / 10);
    const fit = Math.min(factor, (state.editor.pageSize.width - margin * 2) / width, (state.editor.pageSize.height - margin * 2) / height);
    mark.strokes = mark.strokes.map(stroke => stroke.map(p => ({ x:p.x * fit, y:p.y * fit })));
    mark.x = Math.max(margin, Math.min(point.x, state.editor.pageSize.width - width * fit - margin));
    mark.y = Math.min(state.editor.pageSize.height - margin, Math.max(point.y, height * fit + margin));
  }
  state.editor.marks.push(mark);
  drawEditorOverlay();
  setEditorStatus(`${state.editor.mode.startsWith("signature") ? "Firma" : "Testo"} aggiunto a pagina ${state.editor.pageNumber}.`);
});

editorInkCanvas?.addEventListener("pointermove", (event) => {
  if (!state.editor.drawing || !state.editor.currentStroke) return;
  state.editor.currentStroke.points.push(editorPdfPoint(event));
  drawEditorOverlay();
});

["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
  editorInkCanvas?.addEventListener(eventName, () => {
    state.editor.drawing = false;
    state.editor.currentStroke = null;
  });
});

editorPrev?.addEventListener("click", async () => {
  if (!state.editor.pdf || state.editor.pageNumber <= 1) return;
  state.editor.pageNumber -= 1;
  await renderEditorPage();
});

editorNext?.addEventListener("click", async () => {
  if (!state.editor.pdf || state.editor.pageNumber >= state.editor.pageCount) return;
  state.editor.pageNumber += 1;
  await renderEditorPage();
});

editorClear?.addEventListener("click", clearCurrentEditorPage);
document.getElementById('editorUndoInsertion').onclick = async () => {
  const latest = [...state.editor.marks, ...state.editor.strokes].sort((a,b) => b.sequence - a.sequence)[0];
  if (!latest) return;
  state.editor.marks = state.editor.marks.filter(mark => mark !== latest);
  state.editor.strokes = state.editor.strokes.filter(stroke => stroke !== latest);
  state.editor.pageNumber = latest.page;
  await renderEditorPage();
  setEditorStatus('Ultimo inserimento annullato. La firma rimane disponibile per essere inserita di nuovo.');
};

editorSave?.addEventListener("click", async () => {
  editorSave.disabled = true;
  try {
    await saveEditedPdf();
  } catch (error) {
    setEditorStatus(error.message || "Salvataggio non riuscito.");
  } finally {
    editorSave.disabled = false;
  }
});

window.addEventListener("resize", () => {
  if (state.editor.pdf) renderEditorPage().catch(() => {});
});

$("#themeToggle").addEventListener("click", () => {
  const root = document.documentElement;
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  localStorage.setItem("pdfdelta-theme", nextTheme);
  window.dispatchEvent(new Event('pdfdelta-preferences'));
});

window.addEventListener("scroll", () => {
  topbar.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
});

const savedTheme = localStorage.getItem("pdfdelta-theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js", { updateViaCache: 'none' }).catch(() => {});
}

renderCategories();
renderTools();
renderOptions();
resetEditor();
renderFiles();

export const workspaceBridge = {
  getPreferences() { return { theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', favorites: [...state.favorites] }; },
  applyPreferences(value) {
    state.favorites = new Set(value.favorites);
    document.documentElement.dataset.theme = value.theme;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(value.favorites));
    localStorage.setItem('pdfdelta-theme', value.theme);
    renderTools();
  },
  setWorkspaceBusy(check) { workspaceBusy = check; },
  beforeRun: async () => null,
  isBusy: () => state.busy,
  getAllFiles: () => [...state.files],
  replaceFiles(files) {
    state.files = [...files];
    renderTools();
    renderFiles();
  },
  addFiles,
  selectTool,
  run: runSelectedTool,
  getFiles: () => getPdfFiles(),
  useFile(file) {
    if (state.busy) throw new Error('Attendi che lo strumento termini prima di sostituire il documento.');
    state.files = [file];
    resetEditor();
    renderTools();
    renderFiles();
  },
  download: downloadBlob,
};
