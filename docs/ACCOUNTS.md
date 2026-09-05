# Account facoltativi

## Stato verificato

Progetto Supabase `pdfdelta` (`vpkctxqeopuxqedhyzia`), organizzazione Kind3rin's Org,
regione eu-central-1. Costo di creazione confermato: 0 EUR/mese sul piano Free.
La tabella account_preferences è attiva: tema e identificatori degli strumenti.
Nessun PDF, firma, nome file o contenuto di documento viene sincronizzato.

Il provider Google è configurato e `account-config.mjs` abilita il client. In precedenza:
il provider non è configurato e verificato. Non mostrare registrazioni funzionanti
prima di un accesso reale completo. Gli strumenti PDF restano disponibili offline.

## Configurazione Google (completata il 5 settembre 2026)

1. In Google Cloud, creare/configurare un client OAuth di tipo Web application.
   Origine autorizzata: https://pdfdelta.vercel.app.
2. Callback autorizzata: https://vpkctxqeopuxqedhyzia.supabase.co/auth/v1/callback.
   Usare solo gli scope openid, email e profile. Configurare pubblico e branding.
3. Nel pannello Supabase Authentication / Providers / Google, inserire Client ID
   e Client Secret. Il segreto resta nel provider: mai nel repository o nella chat.
4. In Authentication / URL Configuration, impostare Site URL e redirect ammesso
   a https://pdfdelta.vercel.app/. Aggiungere l'URL Pages solo se si vuole l'accesso
   anche da quell'hosting; non usare wildcard per tutte le preview Vercel.
5. Provare in una preview autorizzata con enabled=true: accesso, reload,
   sincronizzazione da un secondo browser, cambio account, uscita, rete assente.
   Aspettativa: tema e preferiti seguono l'account; PDF e firme non vengono inviati.
6. Solo dopo la verifica, abilitare il flag e pubblicare. Durante i test Google
   permette l'accesso ai soli utenti di test: configurare la disponibilità pubblica
   prima di presentarlo come registrazione aperta.

Alternativa email: richiede SMTP configurato. Il server email predefinito Supabase
è limitato al team e non è adatto alle registrazioni pubbliche. Non disabilitare
la conferma dell'indirizzo per aggirare questo limite.

## Prove

- 6 test di sincronizzazione: filtro campi, caricamento remoto, letture obsolete,
  scritture seriali, modifiche durante il caricamento e errore di rete.
- Sul database reale, transazione con due utenti sintetici e rollback finale:
  lettura limitata al proprietario, update altrui invisibile, insert altrui negato,
  update proprio riuscito. Nessun utente di test conservato.
- Advisor sicurezza Supabase: nessun rilievo dopo la migrazione.
- Browser: dialog account a 390px, blocco OAuth con PDF aperto, nessuna richiesta
  esterna nel flusso ospite, suite workspace/output invariata.
- Accesso Google reale e sincronizzazione tra due sessioni autenticate: ancora
  da verificare. I test del controller e di RLS non sostituiscono questa prova.

## Confini e limiti

Guest preferences ripristinate all'uscita; firme riutilizzabili rimangono nella RAM
della sessione PDF. La sincronizzazione usa l'ultima scrittura ricevuta dal server;
non offre merge simultaneo tra dispositivi. Un errore è visibile e permette retry.
Sessioni di accesso persistenti nel browser tramite SDK Supabase con PKCE.
CSP consente solo l'endpoint del progetto oltre alle risorse locali. Il service
worker non intercetta né conserva richieste esterne o risposte account.

SDK locale riproducibile con npm ci e npm run vendor:account. Chiave publishable
pubblica; nessuna service_role nel client. Schema versionato nelle migrazioni.

Fonti: https://supabase.com/docs/guides/auth/social-login/auth-google,
https://supabase.com/docs/guides/auth/auth-smtp,
https://supabase.com/docs/guides/database/postgres/row-level-security.

## Verifica OAuth reale

- Provider Google abilitato su Supabase; segreto inserito solo nel pannello provider.
- Origine Vercel e callback Supabase verificate nel client Google.
- Site URL e redirect Vercel configurati; callback locale temporanea per collaudo.
- Branding con home e privacy; pubblico Google portato da Test a In produzione.
- Accesso reale del proprietario riuscito; reload mantiene Account; tema dark e preferito split osservati nel database dopo interazioni UI.
- Il nome mostrato da Google durante l'accesso è il dominio del progetto Supabase; nessuna verifica del marchio o dominio personalizzato dichiarata.
