# PdfDelta — mappa del codice

## Architettura attuale

[Apri il diagramma Archify](diagrams/pdfdelta.html).
Sorgente versionata: `diagrams/pdfdelta.architecture.json`.

| Modulo | Responsabilità |
| --- | --- |
| `bootstrap.mjs` | Carica motore, applicazione e workspace nell'ordine richiesto |
| `pdf-engine.mjs` | PDF.js 6.3.289, worker, risorse locali, input PDF e rilascio lettori |
| `workspace-model.mjs` | Cronologia immutabile di descrittori pagina, rotazione e riordino |
| `workspace.mjs` | Sessione, miniature, selezione, import atomico, esportazione e ponte strumenti |
| `tool-catalog.mjs` | Catalogo dichiarativo degli strumenti |
| `app.js` | Coda, opzioni, editor e handler delle operazioni esistenti |
| `sw.js` | Shell offline versionata e cache limitata agli asset dichiarati |
| `scripts/vendor-pdfjs.mjs` | Copia riproducibile del pacchetto con verifica integrità |

I descrittori conservano sorgente, indice e rotazione: annullare non richiede
ricomprimere il PDF. Durante l'export pdf-lib copia le pagine nell'ordine attuale;
PDF.js serve per le anteprime e la lettura. Non è un backend.

Il ponte verso il catalogo sostituisce la coda con un File generato localmente.
L'evento `pdfdelta-output` rende l'ultimo risultato PDF riapribile nel workspace.
File cifrati vengono rifiutati dal motore di modifica, senza ignorare la cifratura.

I task PDF.js del workspace hanno vita di sessione e vengono distrutti quando la
sessione è svuotata; quelli degli strumenti sono rilasciati dopo l'operazione,
eccetto il lettore dell'editor attivo. I documenti non vengono salvati in cache.

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

- Modello: ordine, selezioni non contigue, undo/redo, cancellazione e rotazioni.
- Workspace Chrome: PDF esportato riaperto e controllato per pagine, ordine,
  rotazione e testo; import fallito/annullato conserva il documento precedente.
- Offline: nuova apertura dell'app e rendering del documento di esempio con rete disattivata.
- Preview 1440×1050 e 390×844, nessun overflow orizzontale; non sono prove su telefono reale.
- Suite strumenti esistenti separata dalla verifica degli output del workspace.
- Corpus esteso, altri browser, accessibilità completa e performance su file
  complessi restano nel piano; non dichiarare certificazione enterprise.

GitHub Pages distribuisce asset statici dal branch main. `_headers` si applica
su Cloudflare, non su Pages: `index.html` include quindi una CSP meta per script,
worker e risorse locali. WASM è consentito per i decoder, JavaScript eval no.
La CSP meta non sostituisce header come frame-ancestors o X-Content-Type-Options.
