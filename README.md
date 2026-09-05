# PdfDelta

Toolkit PDF statico, gratuito e pensato per hosting free senza costi nascosti.

Percorso di evoluzione e criteri di qualità: [PIANO.md](PIANO.md).

Motore aggiornato: PDF.js 6.3.289 e worker corrispondente, con risorse e licenza
locali, checksum verificati e valutazione dinamica disabilitata. La cache offline
conserva solo gli asset dichiarati e non elimina le cache di altre applicazioni.
Queste verifiche non costituiscono una certificazione enterprise.

## Stack

- HTML, CSS e JavaScript vanilla.
- Nessun backend per le funzioni PDF core, nessun database, nessun piano cloud paid.
- Pubblicabile gratis su GitHub Pages o Cloudflare Pages Free.
- Monetizzazione futura: ADS/sponsor non invasivi, nessun paywall.
- Elaborazione locale: i file non vengono caricati su server.
- Librerie browser vendorizzate in `vendor/`: `pdf-lib`, `JSZip`, `PDF.js`, `qrcode-generator`.

## Avvio locale

Servi la cartella via HTTP (i moduli JavaScript non funzionano aprendo `index.html`
direttamente da file):

```powershell
python -m http.server 4173
```

Poi apri `http://localhost:4173`.

## Regole zero costi

- Hosting: GitHub Pages o Cloudflare Pages Free.
- URL: usare sottodomini gratuiti (`*.github.io` o `*.pages.dev`).
- Non inserire carta di credito se non strettamente necessario.
- Non attivare prodotti a pagamento o metered: Workers Paid, R2, D1, KV, Stream, Images, Argo, Load Balancing, Zaraz paid.
- Non usare funzioni server per i PDF: tutte le feature core devono girare nel browser.
- Backend opzionale solo per funzioni non critiche e solo se resta nel piano free con hard limit.
- Non comprare dominio custom finche l'obiettivo e costo assoluto `0`.
- Non usare API AI, OCR cloud, conversioni Office server-side o storage cloud.
- Non dipendere da CDN esterni a runtime: le librerie core sono servite come file statici locali.
- Prima di abilitare ADS, verificare che il provider non richieda costi o servizi terzi a pagamento.

## Deploy gratis

Il deploy corrente usa GitHub Pages:

`https://kind3rin.github.io/PdfDelta/`

Cloudflare Pages Free resta l'alternativa consigliata se vuoi cambiare hosting:

1. Apri Cloudflare Dashboard -> Workers & Pages -> Create application -> Pages.
2. Collega il repository.
3. Build command: lascia vuoto.
4. Build output directory: `/`.
5. Deploy.

URL previsto: `https://NOME-PROGETTO.pages.dev/`.

Dettagli backend zero-cost: `FREE_BACKEND_STRATEGY.md`.

## Dipendenze locali

I file in `vendor/` sono copie statiche delle librerie open source usate dall'app:

- `pdf-lib@1.17.1`
- `JSZip@3.10.1`
- `pdfjs-dist@6.3.289`
- `qrcode-generator@1.4.4`

Servirle localmente riduce rischi di downtime, tracking esterno e dipendenze runtime non controllate.

Per ricostruire la copia PDF.js: `node scripts/vendor-pdfjs.mjs`. Lo script scarica
la versione fissata dal registro npm, verifica SHA-512 e registra i checksum dei
203 asset in `vendor/pdfjs-manifest.json`. Nessun download esterno a runtime.

## Workspace visuale

1. Premi **Aggiungi PDF**, trascina documenti o prova il documento dimostrativo.
2. Seleziona le miniature: ruota, sposta prima/dopo o trascina per riordinare.
3. **Annulla/Ripeti** conserva fino a 50 modifiche; **Prima / dopo** confronta la pagina selezionata.
4. **Esporta PDF** crea il documento; **Continua negli strumenti** lo rende disponibile al catalogo.
5. **Apri ultimo risultato** riporta un PDF prodotto nel workspace, senza upload ripetuto.

Limiti: 100 MB per file, 200 MB per sessione, 1000 pagine; miniature mostrate a
gruppi di 60. Sessione solo in memoria: esportare prima di chiudere la pagina.
Il workspace ricrea le pagine e non garantisce conservazione di moduli interattivi,
firme digitali, segnalibri o allegati. La firma disegnata non è firma digitale.

## Verifica automatica locale

Con Node.js 22 e Chrome nel percorso previsto da `verify-local.js`.
Il test avvia autonomamente un server locale su una porta libera:

```powershell
node audit-zero-cost.js
node --test verify-security.test.js
node --test verify-model.test.mjs
node verify-local.js
node verify-workspace.cjs
```

Gli audit controllano assenza di CDN/API paid, dimensione deploy, librerie locali, preferiti localStorage, zero richieste esterne, merge PDF, merge PDF+immagini, editor compila/firma, intercalazione PDF, split per range, split pari/dispari, split per testo, split su pagine bianche, carta intestata, copertina, logo immagine, QR su PDF, PDF in TXT/Markdown/Word testo/JPG/WebP/social, JPG lungo, scheda anteprime, crop, margine stampabile, segni di taglio, normalizzazione formato, separazione orientamento, report documento, report coda, report/separazione formati pagina, header/footer, Bates, timbro nome file, auto-trim, confronto visuale, conteggio parole, lettura/scrittura/pulizia metadati, annotazioni, azioni PDF, allegati PDF, aggiunta/rimozione allegati, estrazione/rimozione per testo, duplicati, booklet, poster multipagina, compressione scansioni, miglioramento scansioni, scala di grigi, pagine vuote, PDF vuoto e overflow desktop.

## Feature attive

- Workspace visuale con anteprime, riordino, selezione, rotazione, rimozione, undo/redo e ponte verso gli strumenti.
- Unisci PDF e intercala due PDF fronte/retro.
- Unisci PDF e immagini nello stesso documento mantenendo l'ordine della coda.
- Editor visuale per compilare, firmare e disegnare su PDF nel browser.
- Cockpit applicativo ridisegnato da zero: carica file, scegli azione, scarica.
- Suggerimenti automatici in base ai file caricati e auto-selezione dell'azione piu probabile.
- Coda intelligente con riepilogo file e azioni compatibili.
- Catalogo pulito: le funzioni bloccate non confondono il flusso principale e restano in Roadmap/ricerca.
- Editor contestuale: niente canvas vuoto, si apre solo quando esiste un PDF.
- Preferiti locali per tenere in alto gli strumenti usati spesso, senza account.
- Dividi PDF in ZIP, dividi per range e separa pari/dispari.
- Dividi PDF per marker testuale o usando pagine bianche come separatori.
- Estrai, rimuovi, riordina, duplica, inverti e ruota pagine.
- Crea PDF vuoto e aggiungi pagine vuote.
- Ottimizzazione leggera.
- JPG/PNG in PDF.
- TXT in PDF.
- PDF in TXT.
- PDF in Markdown.
- Word testo DOCX da testo selezionabile, senza OCR, server o ricostruzione layout complesso.
- PDF in PNG.
- PDF in JPG.
- PDF in WebP.
- PDF in immagini social già centrate per post, story e anteprime link.
- PDF in immagine JPG lunga.
- Scheda anteprime PDF con miniature pagina.
- Filigrana, copertina, numeri pagina, timbro nome file, firma testuale, margini A4, margine stampabile, crop margini.
- Carta intestata da PDF template.
- Logo/immagine JPG o PNG su PDF.
- Segni di taglio per stampa.
- Header/footer e numerazione Bates.
- Normalizzazione formato A4/Letter.
- Separazione pagine verticali/orizzontali.
- Report documento CSV con pagine, dimensioni, orientamento e metadati.
- Report coda CSV per i file caricati nella pipeline.
- Report CSV e separazione pagine per formato/orientamento.
- Confronto testuale e visuale tra due PDF.
- Conteggio parole e caratteri in CSV.
- Auto-trim margini bianchi.
- Booklet stampa.
- Poster multipagina per stampa su più fogli.
- Compressione scansioni raster in JPEG locale.
- Miglioramento scansioni con contrasto o bianco/nero.
- Scala di grigi raster.
- QR su PDF.
- N-up per stampa.
- Appiattimento moduli.
- Lettura, scrittura e pulizia metadati, inclusa rimozione stream XMP dove possibile.
- Rimozione annotazioni/link.
- Pulizia azioni automatiche e JavaScript PDF.
- Report e rimozione allegati incorporati.
- Aggiunta allegati incorporati a un PDF principale.
- Sanitizzazione raster local-first.
- Estrazione e rimozione pagine in base al testo.
- Audit accessibilita base, rimozione pagine bianche e rimozione duplicati.
- Pagina privacy statica con promessa no-upload.

## Limiti intenzionali

Queste feature restano bloccate finche il vincolo e zero costi assoluti:

- OCR avanzato.
- Chat, riassunto e traduzione AI.
- Conversioni Office affidabili.
- Protezione password robusta.
- Sblocco PDF.
- Redazione/censura sicura.
- Riparazione PDF danneggiati.

Dettagli: vedi `MARKET_ANALYSIS.md` e `ZERO_COST_POLICY.md`.

## Deploy

Checklist operativa: `CLOUDFLARE_FREE_DEPLOY.md`.

Ogni ciclo consolidato chiude con test, documentazione e deploy su GitHub Pages.
Architettura: [mappa del codice](docs/CODEBASE-MAP.md) e [diagramma navigabile](docs/diagrams/pdfdelta.html).
