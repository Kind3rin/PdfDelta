# PdfDelta

Toolkit PDF statico, gratuito e pensato per hosting free senza costi nascosti.

## Stack

- HTML, CSS e JavaScript vanilla.
- Nessun backend per le funzioni PDF core, nessun database, nessun piano cloud paid.
- Pubblicabile gratis su GitHub Pages o Cloudflare Pages Free.
- Monetizzazione futura: ADS/sponsor non invasivi, nessun paywall.
- Elaborazione locale: i file non vengono caricati su server.
- Librerie browser vendorizzate in `vendor/`: `pdf-lib`, `JSZip`, `PDF.js`, `qrcode-generator`.

## Avvio locale

Apri `index.html` nel browser.

Per testare il service worker:

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
- `pdfjs-dist@3.11.174`
- `qrcode-generator@1.4.4`

Servirle localmente riduce rischi di downtime, tracking esterno e dipendenze runtime non controllate.

## Verifica automatica locale

Con server locale attivo su `4173`:

```powershell
node audit-zero-cost.js
node verify-local.js
```

Gli audit controllano assenza di CDN/API paid, dimensione deploy, librerie locali, preferiti localStorage, zero richieste esterne, merge PDF, merge PDF+immagini, editor compila/firma, intercalazione PDF, split per range, split pari/dispari, split per testo, split su pagine bianche, carta intestata, copertina, logo immagine, QR su PDF, PDF in TXT/Markdown/Word testo/JPG/WebP/social, JPG lungo, scheda anteprime, crop, margine stampabile, segni di taglio, normalizzazione formato, separazione orientamento, report documento, report coda, report/separazione formati pagina, header/footer, Bates, timbro nome file, auto-trim, confronto visuale, conteggio parole, lettura/scrittura/pulizia metadati, annotazioni, azioni PDF, allegati PDF, aggiunta/rimozione allegati, estrazione/rimozione per testo, duplicati, booklet, poster multipagina, compressione scansioni, miglioramento scansioni, scala di grigi, pagine vuote, PDF vuoto e overflow desktop.

## Feature attive

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
