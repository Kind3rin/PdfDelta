# PdfDelta — mappa del codice

## Architettura attuale

[Apri il diagramma Archify](diagrams/pdfdelta.html).
Sorgente versionata: `diagrams/pdfdelta.architecture.json`.
Direzione visiva e criteri responsive: [DESIGN.md](DESIGN.md).

| Modulo | Responsabilità |
| --- | --- |
| `bootstrap.mjs` | Carica motore, applicazione e workspace nell'ordine richiesto |
| `pdf-engine.mjs` | PDF.js 6.3.289, worker, risorse locali, input PDF e rilascio lettori |
| `workspace-model.mjs` | Cronologia immutabile di descrittori pagina, rotazione e riordino |
| `workspace.mjs` | Sessione, miniature, selezione, import atomico ed esportazione |
| `workspace-flow.mjs` | Flusso unico, catalogo su richiesta, editor integrato e sincronizzazione strumenti/documento |
| `tool-catalog.mjs` | Catalogo dichiarativo degli strumenti |
| `app.js` | Coda, opzioni, editor e handler delle operazioni esistenti |
| `sw.js` | Shell offline versionata e cache limitata agli asset dichiarati |
| `scripts/vendor-pdfjs.mjs` | Copia riproducibile del pacchetto con verifica integrità |

I descrittori conservano sorgente, indice e rotazione: annullare non richiede
ricomprimere il PDF. Se cambia l'organizzazione, l'export copia le pagine con pdf-lib;
un singolo documento senza modifiche alle pagine viene scaricato senza riscrittura,
conservando moduli, metadati e allegati. PDF.js serve per anteprime e lettura.

Il coordinatore prepara un File dalle pagine modificate prima di eseguire uno strumento.
L'evento `pdfdelta-output` applica automaticamente il risultato PDF al workspace;
il download finale è esplicito. Il catalogo vive in un dialogo, l'editor accanto alle azioni.
File cifrati vengono rifiutati dal motore di modifica, senza ignorare la cifratura.

I task PDF.js del workspace hanno vita di sessione e vengono distrutti quando la
sessione è svuotata; quelli degli strumenti sono rilasciati dopo l'operazione,
eccetto il lettore dell'editor attivo. I documenti non vengono salvati in cache.

La cronologia espone l'insieme delle sorgenti ancora raggiungibili; il workspace
rilascia quelle escluse dopo una nuova modifica o il superamento dei 50 passi.
Il primo import è lo stato base. Il download conserva il file completo anche dopo
undo quando i descrittori pagina coincidono con la sorgente originale.

## Graphify

Estrazione AST locale con Graphify 0.9.18, senza API o estrazione semantica dei
documenti. Vendor, output dei test e HTML dei diagrammi esclusi tramite
`.graphifyignore`. Il grafo è rigenerabile e rimane ignorato da Git.

```powershell
uv tool run --from graphifyy==0.9.18 graphify extract . --code-only --force
uv tool run --from graphifyy==0.9.18 graphify cluster-only . --no-label
```

Output: `graphify-out/graph.json`, `graph.html`, `GRAPH_REPORT.md`.
Snapshot versionata: [report Graphify](GRAPH_REPORT.md), estratto dal codice del ciclo.
La mappa rileva `downloadBlob`, `getPdfFiles`, `savePdfBytes` e `loadPdf` tra i
principali punti condivisi degli strumenti. Non prova da sola flussi dinamici o
assenza di difetti: le relazioni inferite restano distinte da quelle estratte.

## Archify

Con Archify installato, usare il suo `bin/archify.mjs`:

```powershell
node <archify>/bin/archify.mjs validate architecture docs/diagrams/pdfdelta.architecture.json --quality standard
node <archify>/bin/archify.mjs render architecture docs/diagrams/pdfdelta.architecture.json docs/diagrams/pdfdelta.html
node <archify>/bin/archify.mjs check docs/diagrams/pdfdelta.html
```

Il diagramma descrive i componenti attuali. Non include servizi cloud ipotetici.
Profilo standard: validazione con zero errori e zero avvisi.

## Verifiche e limiti

[Copertura degli output](OUTPUT-VERIFICATION.md): 74 strumenti attivi, un caso
sintetico per ciascuno. La CI fallisce se uno strumento attivo manca dalla verifica.
Il validatore dei risultati è separato dagli handler in `tests/output-validator.mjs`.

- Modello: ordine, selezioni non contigue, undo/redo, cancellazione e rotazioni.
- Workspace Chrome: PDF esportato riaperto e controllato per pagine, ordine,
  rotazione e testo; import fallito/annullato conserva il documento precedente.
- Offline: nuova apertura dell'app e rendering del documento di esempio con rete disattivata.
- Gli stessi controlli workspace/export/offline passano anche su GitHub Pages.
- Preview 1440×1050 e 390×844, nessun overflow orizzontale; non sono prove su telefono reale.
- Redesign: aggiunte 768×1024 e 1920×1080, controlli sulle colonne desktop,
  altezza delle miniature e assenza di scorrimento annidato. Verifica manuale nel browser dell'editor e del tema scuro.
- Avvio offline da `index.html#visualWorkspace`, font locale incluso; i frammenti URL
  non escludono più gli asset della shell dalla cache. Query e documenti restano esclusi.
- Suite strumenti esistenti separata dalla verifica degli output del workspace.
- Corpus esteso, altri browser, accessibilità completa e performance su file
  complessi restano nel piano; non dichiarare certificazione enterprise.

GitHub Pages distribuisce asset statici dal branch main. `_headers` si applica
su Cloudflare, non su Pages: `index.html` include quindi una CSP meta per script,
worker e risorse locali. WASM è consentito per i decoder, JavaScript eval no.
La CSP meta non sostituisce header come frame-ancestors o X-Content-Type-Options.
# Sincronizzazione della cronologia

Il workspace emette `pdfdelta-history` dopo Annulla/Ripeti, anche da tastiera.
`workspace-flow.mjs` aggiorna gli input degli strumenti e l'elenco file con le
sorgenti ripristinate, preservando gli input non PDF. Non riapre i PDF:
ordine e rotazioni restano quelli della cronologia. Il ripristino è bloccato
mentre uno strumento sta elaborando. La suite browser verifica entrambe le
direzioni della cronologia e il download del documento originale completo.

Gli strumenti con più input (esclusa l'unione) ricevono i PDF modificati
separatamente tramite `materializeFiles()`. Ogni sorgente mantiene nome,
ordine relativo e rotazioni delle pagine; una sorgente intatta restituisce il
File originale. Immagini e TXT restano disponibili agli strumenti misti.
Il confronto visuale viene verificato su due documenti, uno ruotato e uno intatto.

`pdfdelta-busy` comunica inizio/fine elaborazione: il workspace aggiorna i
comandi delle pagine, mentre il coordinatore rende temporaneamente inerti
strumenti, editor e gestione file, impostando `aria-busy`. I gestori di
aggiunta, cancellazione e cambio strumento proteggono anche lo stato applicativo.
La regressione browser sospende la preparazione per tentare azioni concorrenti
e verifica lo sblocco sia dopo un report riuscito sia dopo un errore controllato.

`pdfdelta-workspace-busy` estende la stessa protezione alle operazioni del
workspace, inclusi importazione ed esportazione. Il bridge consulta `isBusy`
del workspace prima di accettare nuove esecuzioni o modifiche agli input.
Il pulsante di annullamento resta disponibile durante le operazioni del
workspace. La suite mobile verifica gli input invariati e l'output dopo
tentativi concorrenti in entrambe le fasi.

L'esportazione controlla l'annullamento sia all'ingresso di `compose()` sia
immediatamente prima del download, coprendo anche il ritorno del File originale.
La suite browser usa inoltre 120 pagine sintetiche per verificare anteprime,
interruzione della ricostruzione e nuovo export; una fixture da 1001 pagine
verifica il rifiuto oltre il limite senza sostituire la sessione.

`viewportAtScale()` centralizza il limite raster (16 milioni di pixel, 8192
per lato) anche per gli strumenti che usano `renderPdfPageCanvas()`. Il limite
include l'arrotondamento alle dimensioni intere del canvas e mantiene le
proporzioni; riduce la risoluzione richiesta solo quando necessario. Le
dimensioni fisiche delle pagine esportate non cambiano. La compressione libera
il canvas dopo aver incorporato ogni immagine. Una scansione sintetica ad alta
risoluzione verifica cap e contenuto dell'output, senza sostituire test su telefoni reali.
