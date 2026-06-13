# Cloudflare Pages Free deploy checklist

Obiettivo: costo assoluto `0`.

## Impostazioni progetto

- Platform: Cloudflare Pages.
- Plan: Free.
- Repository: GitHub collegato.
- Build command: vuoto.
- Build output directory: `/`.
- Root directory: repository root.
- Environment variables: nessuna.
- Functions: non usare.
- Custom domain: non necessario.

## Non attivare

- Workers Paid.
- Pages Functions per strumenti PDF.
- R2, D1, KV, Queues.
- Images, Stream, Argo, Load Balancing.
- Zaraz paid.
- Web Analytics paid.
- Dominio custom a pagamento.

## Controllo prima del deploy

Esegui:

```powershell
node --check app.js
node --check sw.js
node --check verify-local.js
node --check audit-zero-cost.js
python -m http.server 4173
```

Poi apri:

```text
http://127.0.0.1:4173/
```

In un secondo terminale:

```powershell
node audit-zero-cost.js
node verify-local.js
```

## Controllo dopo il deploy

- L'app deve aprirsi su `https://NOME-PROGETTO.pages.dev/`.
- Gli strumenti devono generare download locali.
- Network tab: nessun upload PDF.
- Nessun servizio Cloudflare diverso da Pages static assets.

## Perche non Vercel Hobby

Il piano Hobby non e adatto a un prodotto con ADS futuri perche l'advertising e uso commerciale.
