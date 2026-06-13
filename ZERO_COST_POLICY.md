# PdfDelta - Zero cost policy

## Regola principale

Il progetto deve poter vivere a costo assoluto `0`.

## Hosting approvato

- Cloudflare Pages Free.
- Sottodominio gratuito `*.pages.dev`.
- Sito statico puro.

## Vietato

- Workers Paid.
- Pages Functions se diventano necessarie per funzioni core.
- R2, D1, KV, Stream, Images, Argo, Load Balancing, Queues.
- API AI o OCR cloud.
- API di conversione Office.
- Database.
- Storage file.
- Dominio custom finche l'obiettivo e zero euro.

## Consentito

- HTML/CSS/JS statico.
- Librerie open source caricate dal browser.
- Librerie frontend vendorizzate come asset statici locali.
- Elaborazione file locale nel browser.
- ADS futuri se non richiedono spesa e non bloccano funzioni.

## Policy prodotto

Se una feature richiede server, GPU, modelli AI, storage o librerie native, va marcata come `Bloccato` o `Roadmap`, non simulata.

Feature privacy-heavy consentite devono girare nel browser. Esempio: la sanitizzazione raster usa rendering locale PDF.js e ricostruzione locale pdf-lib, senza upload o compute server.

## Deploy Cloudflare Pages

- Build command: vuoto.
- Output directory: `/`.
- Functions: non usare.
- Environment variables: nessuna.
- Custom domain: non necessario.
