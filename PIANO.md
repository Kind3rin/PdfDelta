# PdfDelta — percorso verso qualità enterprise

Aggiornato: 2026-09-05. Stato: primo workspace visuale e motore aggiornato; non enterprise-ready.

## Direzione

Obiettivo: progetto portfolio credibile e alternativa competitiva per i PDF
quotidiani. Manteniamo costo zero, hosting statico e documenti sul dispositivo,
come previsto dalle policy del repository.

Il vantaggio da costruire: apri documenti, organizza le pagine, applica operazioni
successive, verifica il risultato, esporta. Nessun caricamento ripetuto a ogni
strumento. Il numero di card non misura la qualità.

## Confronto verificato

Fonti ufficiali consultate il 2026-09-05:
- https://www.ilovepdf.com/features
- https://www.ilovepdf.com/business

| Area | PdfDelta attuale | Traguardo |
| --- | --- | --- |
| Organizzazione, immagini, timbri | Numerosi strumenti locali | Anteprima condivisa e verifica output |
| Semplicità | Carica, scegli, scarica; 74 strumenti attivi | Concatenazione operazioni, undo/redo, opzioni progressive |
| Compressione | Ottimizzazione leggera o raster scansioni | Confronto dimensioni/qualità e preservazione testo |
| Office e OCR | DOCX di solo testo; OCR assente | Valutare OCR locale; risolvere fedeltà Office |
| Password e censura | Assenti | Motore e licenze compatibili, verifica indipendente output |
| Business | Nessuna gestione organizzazioni | Eventuale offerta distinta con ruoli, audit e supporto |

iLovePDF offre già Office, OCR, protezione, censura, batch, applicazioni desktop
e mobile e funzioni team. Non dichiariamo superiorità senza misurarla.
La firma disegnata attuale non equivale a un servizio di firma digitale.

## Fase 1 — affidabilità e sicurezza

- [x] Ispezione repository e baseline dei flussi in Chrome.
- [x] Mitigazione CVE-2024-4367 nei 19 caricamenti PDF.js: `isEvalSupported: false`.
- [x] Cache limitata agli asset dichiarati; pulizia limitata al namespace PdfDelta.
- [x] Shell coerente per versione; nessuna cache di errori, redirect o documenti.
- [x] Test su isolamento cache, offline, errori, quota e configurazione PDF.js.
- [x] Aggiornare PDF.js e worker insieme, verificando advisory e compatibilità: 6.3.289 con risorse locali e checksum.
- [ ] Separare catalogo, motore PDF, stato e UI dall'attuale `app.js` monolitico.
  Catalogo, motore e modello workspace estratti; handler storici ed editor ancora in app.js.
- [x] Riaprire gli output PDF/ZIP/DOCX nei test e verificarne contenuto e struttura.
  Tutti i 74 strumenti attivi hanno un caso sintetico. Validazione PDF/ZIP/DOCX/immagini e controlli semantici mirati; varianti, corpus complesso e tutti i report restano da ampliare.
- [ ] CI riproducibile, timeout dei test e verifiche Firefox/WebKit/mobile.
  Workflow Windows/Node 22 aggiunto; Chrome locale e viewport mobile verificati. Altri browser restano da provare.
- [ ] Limiti risorse, rilascio canvas/documenti, file malformati/cifrati e concorrenza.
- [ ] Verificare header in hosting: `_headers` non configura GitHub Pages.

Uscita: regressioni verdi, dipendenze aggiornate e nessun problema critico noto
aperto nelle aree verificate. I test riaprono i risultati dei 74 strumenti attivi;
non certificano ogni opzione, documento complesso o proprietà semantica dei report.

## Fase 2 — semplicità e identità visiva

- [x] Workspace centrato sul documento: miniature, selezione e riordino pagine.
- [x] Azioni principali evidenti; impostazioni avanzate solo quando necessarie.
- [ ] Anteprima risultato, confronto prima/dopo, undo/redo e azioni concatenate.
  Disponibili anteprima pagine, confronto rotazione, cronologia, editor integrato e risultati applicati automaticamente.
  Confronto completo e annullamento delle trasformazioni degli strumenti restano da ampliare.
- [ ] Avanzamento reale, annullamento e messaggi di recupero utilizzabili.
  Disponibili in import/export workspace; da estendere agli strumenti storici.
- [ ] Tastiera, focus, contrasto, touch e layout mobile verificati.
- [ ] Preview desktop/mobile a fine feature e regressione dei flussi collegati.

Uscita: merge, split, riordino, compressione e firma completabili senza aiuto.
Benchmark proposto: almeno 5 utenti, stessi file sintetici su entrambi i prodotti,
ordine alternato, tempo mediano, errori e completamento. Obiettivi da misurare:
almeno 90% completamento e 20% tempo in meno sui flussi scelti.

## Fase 3 — funzioni differenzianti

- [ ] Pipeline e preset locali riutilizzabili, esportabili senza documenti.
- [ ] Batch con esito per file e recupero dagli errori.
- [ ] Prova OCR locale: accuratezza italiano/inglese, memoria, dimensione e offline.
- [ ] Censura reale verificata su testo, immagini e contenuti nascosti.
- [ ] Password e compressione: valutazione motore e licenza prima dell'integrazione.
- [ ] Corpus sintetico di PDF complessi e benchmark qualità/tempo/memoria.

Funzioni nel catalogo solo dopo prove reali. OCR locale richiede una prova tecnica
e l'allineamento della policy attuale: non è assunto impossibile solo perché
il budget cloud è zero. Office fedele resta un problema tecnico da risolvere.

## Fase 4 — portfolio e distribuzione

- [ ] Demo con file sintetici, case study architetturale e benchmark riproducibili.
- [ ] Versioni, changelog, rollback, inventario e licenze dipendenze.
- [ ] Dati trattati, limiti, browser supportati e aggiornamenti offline documentati.
- [ ] Valutare separatamente SSO, ruoli, audit centralizzato, SLA e assistenza:
  richiedono una decisione prodotto e operativa.

## Evidenze iniziali

- Baseline `node verify-local.js`: superata in Chrome; nessuna richiesta esterna
  e nessun overflow desktop rilevato.
- Suite `node verify-local.js` ripetuta dopo le modifiche: superata.
- `node --test verify-security.test.js`: 7 test superati.
- `node audit-zero-cost.js`: superato.
- Mitigazione ufficiale:
  https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq
- La mitigazione non sostituisce l'aggiornamento dipendenze né un audit completo.
- Il primo ciclo è pubblicato su GitHub Pages: workspace, export e offline verificati anche sul sito pubblico.
- Dispositivi reali e superiorità rispetto al concorrente non verificati.

## Ciclo pubblicato — 2026-09-05

- Motore PDF.js 6.3.289, workspace visuale e documentazione Graphify/Archify.
- 12 test unitari/sicurezza superati; suite strumenti e verifica workspace superate.
- CI: https://github.com/Kind3rin/PdfDelta/actions/runs/33953802439
- Deploy: https://github.com/Kind3rin/PdfDelta/actions/runs/33953801244
- Verifica pubblica su https://kind3rin.github.io/PdfDelta/: 3 pagine esportate,
  ordine e rotazione verificati, testo conservato, import fallito/annullato non
  altera la sessione, avvio e rendering offline riusciti, zero errori JavaScript
  e zero richieste a origini esterne.
- Le restanti caselle del piano rimangono aperte; nessuna dichiarazione enterprise-ready.

## Chiusura dei cicli

### Cronologia e risorse

- Import iniziale come base; tutti i 50 passi rimangono annullabili dopo l'espulsione
  degli stati più vecchi. Test con 60 modifiche e nuova modifica dopo undo.
- Rilascio dei lettori non più raggiungibili dalla cronologia, verificato anche nel browser.
- Undo di un'operazione conserva l'intero PDF: prova byte per byte con modulo e allegato.
- 15 test unitari/sicurezza, suite workspace e regressione dei 74 strumenti passano localmente.

### Integrità dei risultati

- 74/74 strumenti attivi con almeno un caso sintetico: output riaperti e verificati,
  incluse struttura DOCX, immagini, archivi ZIP e controlli semantici mirati.
- Attese dei test legate al risultato e al completamento delle operazioni.
- Download senza modifiche alle pagine: byte originali conservati. Test con metadati,
  campo compilabile e allegato dopo un'operazione nel workspace.
- Firma testuale distinta dalla firma digitale anche nei valori predefiniti.
- Dettagli e limiti: docs/OUTPUT-VERIFICATION.md. Varianti, altri browser e prova
  di ogni strumento su telefono restano aperti.

### Redesign del workspace

- Tipografia Manrope locale, nuova gerarchia documento/azioni, icone con etichette,
  miniature più grandi e nitide, un solo scorrimento su mobile.
- Desktop 1440/1920 px e tablet 768 px: colonne e dimensioni delle anteprime verificate.
- Mobile 390 px: apertura, modifica, aggiunta file, editor e download verificati.
- Tema scuro ed editor provati anche tramite interazione diretta nel browser.
- Corretta la cache offline per URL con frammento (`index.html#visualWorkspace`);
  installazione con risorse aggiornate, per evitare CSS vecchio accanto a script nuovi.
- 13 test unitari/sicurezza e suite strumenti superati localmente; verifica pubblica e CI richieste per chiudere il ciclo.

### Correzione UX — flusso unico

- Rimossi dalla vista il secondo caricamento, il cockpit duplicato e i passaggi manuali tra strumenti e pagine.
- Azioni contestuali accanto al documento, catalogo in dialogo e download finale esplicito.
- Desktop e viewport mobile verificati visivamente; suite strumenti e workspace superate localmente.
- Test del passaggio riordino/rotazione → numerazione → risultato applicato, oltre a export e offline.
- Pubblicato su GitHub Pages: verifica pubblica workspace, editor mobile, export e offline superata.
- Aggiungere un file conserva le modifiche alle pagine esistenti, verificato nell'output PDF.
- Attesa di avvio Chrome estesa a 30 secondi per i runner CI; suite locale completa superata.
- CI obbligatoria prima di dichiarare chiuso il ciclo: https://github.com/Kind3rin/PdfDelta/actions/workflows/verify.yml

Ogni ciclo consolidato chiude con test, aggiornamento docs/Graphify/Archify e
deploy GitHub Pages, come autorizzato. Verificare build e sito dopo ogni push.
