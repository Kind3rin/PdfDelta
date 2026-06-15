# PdfDelta - strategia backend zero costi

Aggiornato: 2026-06-15.

## Scelta attuale

PdfDelta deve restare statico per le funzioni core PDF.

- Hosting corrente sicuro: GitHub Pages.
- Hosting statico alternativo: Cloudflare Pages Free.
- Backend core PDF: non necessario e non consigliato.
- File utente: mai caricati su server.

## Backend consentito solo se resta a costo 0

Cloudflare Workers Free puo essere usato solo per funzioni non critiche:

- feature flags pubbliche;
- configurazione ADS non invasiva;
- endpoint status/versione;
- redirect o short link senza file utente;
- telemetry anonima e disattivabile, solo se non richiede storage paid.

Regola: se il backend supera il limite free, deve fermarsi o degradare. Non deve mai diventare una fattura.

## Backend vietato per ora

- conversione Office server-side;
- OCR cloud o AI;
- storage file;
- database;
- code/queue;
- immagini/video CDN paid;
- repair PDF con binari server;
- funzioni che richiedono carta di credito o piano paid.

## Perche non spostare i PDF su backend

Le conversioni PDF pesanti richiedono CPU, RAM, storage temporaneo e spesso binari nativi. Su piani free questo diventa fragile, lento o a rischio upgrade. La posizione competitiva di PdfDelta resta:

- privacy by default;
- costo operativo zero;
- nessun account;
- nessun limite artificiale premium;
- funzioni locali oneste.

## Candidati futuri sicuri

1. Worker per `version.json` e messaggi di manutenzione.
2. Worker per configurazione ADS, senza tracking invasivo.
3. Worker per redirect documentazione.
4. Pages statico con asset ottimizzati e service worker.

Tutto il resto deve restare client-side o bloccato.
