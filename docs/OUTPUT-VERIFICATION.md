# Verifica degli output

74/74 strumenti attivi: almeno un caso sintetico riuscito per strumento.
Generato da verify-local.js e scripts/report-output-verification.mjs.

I PDF sono riaperti con pdf-lib e PDF.js, verificati nel numero di pagine e renderizzati.
Controlli mirati verificano ordine/estrazione pagine, testo della firma e dei moduli,
metadati, annotazioni, allegati e suddivisioni ZIP. L'export finale senza modifiche
alle pagine è verificato anche byte per byte dalla suite workspace.

Questa è copertura del caso di successo, non di ogni opzione o documento possibile.
CSV, TXT e HTML hanno controlli di base; non tutte le proprietà semantiche sono
verificate. La suite degli strumenti gira in Chrome desktop. Il workspace dispone
anche di prove responsive ed editor mobile, ma queste non sostituiscono la prova
manuale di ciascuno strumento su telefono e altri browser.

| Strumento | Formato | Evidenza |
| --- | --- | --- |
| Unisci PDF | PDF | 2 pagine riaperte e renderizzate |
| Unisci PDF+immagini | PDF | 3 pagine riaperte e renderizzate |
| Intercala PDF | PDF | 2 pagine riaperte e renderizzate |
| Dividi PDF | ZIP | 3 file interni riaperti; CRC valido |
| Dividi per range | ZIP | 2 file interni riaperti; CRC valido |
| Separa pari/dispari | ZIP | 2 file interni riaperti; CRC valido |
| Estrai pagine | PDF | 2 pagine riaperte e renderizzate |
| Rimuovi pagine | PDF | 2 pagine riaperte e renderizzate |
| Riordina pagine | PDF | 3 pagine riaperte e renderizzate |
| Ruota PDF | PDF | 3 pagine riaperte e renderizzate |
| Inverti pagine | PDF | 3 pagine riaperte e renderizzate |
| Duplica pagine | PDF | 2 pagine riaperte e renderizzate |
| Ottimizza leggero | PDF | 1 pagine riaperte e renderizzate |
| Comprimi scansione | PDF | 1 pagine riaperte e renderizzate |
| Migliora scansione | PDF | 1 pagine riaperte e renderizzate |
| JPG/PNG in PDF | PDF | 1 pagine riaperte e renderizzate |
| TXT in PDF | PDF | 1 pagine riaperte e renderizzate |
| Crea PDF vuoto | PDF | 1 pagine riaperte e renderizzate |
| PDF in testo | TXT | Contenuto testuale non vuoto |
| PDF in Markdown | MD | Contenuto testuale non vuoto |
| Word testo | DOCX | Struttura ZIP/XML e testo verificati |
| PDF in PNG | ZIP | 1 file interni riaperti; CRC valido |
| PDF in JPG | ZIP | 1 file interni riaperti; CRC valido |
| PDF in WebP | ZIP | 1 file interni riaperti; CRC valido |
| PDF in social | ZIP | 1 file interni riaperti; CRC valido |
| PDF in JPG lungo | JPG | Immagine decodificata: 300 × 636 |
| Scheda anteprime | PDF | 1 pagine riaperte e renderizzate |
| Filigrana | PDF | 1 pagine riaperte e renderizzate |
| Logo/immagine | PDF | 1 pagine riaperte e renderizzate |
| Numeri pagina | PDF | 3 pagine riaperte e renderizzate |
| Compila e firma | PDF | 1 pagine riaperte e renderizzate |
| Timbra nome file | PDF | 1 pagine riaperte e renderizzate |
| Copertina PDF | PDF | 2 pagine riaperte e renderizzate |
| Header/Footer | PDF | 1 pagine riaperte e renderizzate |
| Carta intestata | PDF | 1 pagine riaperte e renderizzate |
| Bates numbering | PDF | 1 pagine riaperte e renderizzate |
| Firma testuale | PDF | 1 pagine riaperte e renderizzate |
| N-up stampa | PDF | 2 pagine riaperte e renderizzate |
| Booklet stampa | PDF | 2 pagine riaperte e renderizzate |
| Poster multipagina | PDF | 4 pagine riaperte e renderizzate |
| QR su PDF | PDF | 1 pagine riaperte e renderizzate |
| Aggiungi margini | PDF | 1 pagine riaperte e renderizzate |
| Margine stampabile | PDF | 1 pagine riaperte e renderizzate |
| Segni di taglio | PDF | 1 pagine riaperte e renderizzate |
| Aggiungi pagine vuote | PDF | 2 pagine riaperte e renderizzate |
| Ritaglia margini | PDF | 1 pagine riaperte e renderizzate |
| Auto ritaglia bianco | PDF | 1 pagine riaperte e renderizzate |
| Normalizza formato | PDF | 1 pagine riaperte e renderizzate |
| Appiattisci moduli | PDF | 1 pagine riaperte e renderizzate |
| Leggi metadati | TXT | Contenuto testuale non vuoto |
| Scrivi metadati | PDF | 1 pagine riaperte e renderizzate |
| Pulisci metadati | PDF | 1 pagine riaperte e renderizzate |
| Rimuovi annotazioni | PDF | 1 pagine riaperte e renderizzate |
| Pulisci azioni | PDF | 1 pagine riaperte e renderizzate |
| Report allegati | TXT | Contenuto testuale non vuoto |
| Rimuovi allegati | PDF | 1 pagine riaperte e renderizzate |
| Allega file a PDF | PDF | 1 pagine riaperte e renderizzate |
| Sanitizza raster | PDF | 1 pagine riaperte e renderizzate |
| Scala di grigi | PDF | 1 pagine riaperte e renderizzate |
| Confronta testo | HTML | Contenuto testuale non vuoto |
| Confronta visuale | HTML | Contenuto testuale non vuoto |
| Audit accessibilità | TXT | Contenuto testuale non vuoto |
| Conta parole | CSV | Contenuto testuale non vuoto |
| Report documento | CSV | Contenuto testuale non vuoto |
| Report coda | CSV | Contenuto testuale non vuoto |
| Estrai per testo | PDF | 1 pagine riaperte e renderizzate |
| Rimuovi per testo | PDF | 1 pagine riaperte e renderizzate |
| Dividi per testo | ZIP | 2 file interni riaperti; CRC valido |
| Rimuovi pagine bianche | PDF | 3 pagine riaperte e renderizzate |
| Dividi su pagine bianche | ZIP | 3 file interni riaperti; CRC valido |
| Separa orientamento | ZIP | 2 file interni riaperti; CRC valido |
| Report formati pagina | CSV | Contenuto testuale non vuoto |
| Separa per formato | ZIP | 2 file interni riaperti; CRC valido |
| Rimuovi duplicati | PDF | 1 pagine riaperte e renderizzate |
