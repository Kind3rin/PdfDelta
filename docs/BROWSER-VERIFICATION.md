# Verifica browser — 5 settembre 2026

Suite locale Windows: 18/18 passati, senza retry o skip. Report completo generato
in dist/browser-report e allegato dalla CI per ogni motore.

| Motore | Desktop | Viewport mobile/touch | Apertura esempio desktop/mobile | Export desktop/mobile |
| --- | --- | --- | --- | --- |
| Chromium | Passato | Passato | 377 / 318 ms | 183 / 288 ms |
| Firefox | Passato | Passato | 380 / 604 ms | 81 / 74 ms |
| WebKit | Passato | Passato | 494 / 427 ms | 161 / 149 ms |

I tempi sono una singola osservazione sulla fixture di tre pagine e su questo PC,
non un benchmark generale né un confronto competitivo. Firefox locale ha richiesto
avvio fuori dalla sandbox. WebKit Playwright non prova Safari su dispositivi Apple.

Per ogni motore e viewport: home/esempio, selezione e rotazione, annulla/ripeti,
download reale e riapertura dello stesso file; import fallito con errore visibile,
focus e recupero; PDF cifrato apribile senza password, modifica e export con testo
leggibile; rifiuto di un PDF con password senza perdere il documento già aperto.

Il test con restrizioni verifica anche l'assenza di richieste esterne durante il
flusso. Le fixture sono generate, non sono il PDF personale segnalato dall'utente.
Test unitari distinti verificano campo modulo, titolo e riferimento dell'allegato
dopo la sola decrittazione. Ricostruire/riordinare pagine ha limiti separati sui dati
a livello documento, già descritti nella mappa del codice.

Regressioni aggiuntive in Chrome: 74 strumenti e suite workspace/editor/offline,
con firme esportate, cronologia delle aggiunte, rimozione annullabile e confronto
originale. Queste regressioni estese non sono tutte replicate sui tre motori.

Restano da verificare Safari reale, telefoni fisici, utenti non tecnici e un corpus
più ampio di documenti reali. La CI esegue nuovamente la matrice su Linux a ogni push;
GitHub Pages attende quei risultati. Vercel avvia il deploy direttamente dal push.
