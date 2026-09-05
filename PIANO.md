# PdfDelta — percorso verso qualità enterprise

Aggiornato: 2026-09-05. Stato: hardening iniziale, non enterprise-ready.

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
- [ ] Aggiornare PDF.js e worker insieme, verificando advisory e compatibilità.
- [ ] Separare catalogo, motore PDF, stato e UI dall'attuale `app.js` monolitico.
- [ ] Riaprire gli output PDF/ZIP/DOCX nei test e verificarne contenuto e struttura.
- [ ] CI riproducibile, timeout dei test e verifiche Firefox/WebKit/mobile.
- [ ] Limiti risorse, rilascio canvas/documenti, file malformati/cifrati e concorrenza.
- [ ] Verificare header in hosting: `_headers` non configura GitHub Pages.

Uscita: regressioni verdi, dipendenze aggiornate e nessun problema critico noto
aperto nelle aree verificate. I test esistenti controllano soprattutto stato UI
e nomi dei risultati; non certificano fedeltà e integrità di ogni output.

## Fase 2 — semplicità e identità visiva

- [ ] Workspace centrato sul documento: miniature, selezione e riordino pagine.
- [ ] Azioni principali evidenti; impostazioni avanzate solo quando necessarie.
- [ ] Anteprima risultato, confronto prima/dopo, undo/redo e azioni concatenate.
- [ ] Avanzamento reale, annullamento e messaggi di recupero utilizzabili.
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
- Produzione, dispositivi reali e superiorità rispetto al concorrente non verificati.
