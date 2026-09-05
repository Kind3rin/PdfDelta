# Regole di lavoro del progetto

Comunicare in italiano, in modo conciso. Implementare e verificare autonomamente
le modifiche autorizzate. Commit atomici con messaggi conventional.

## Obiettivo persistente

Migliorare il motore PDF e costruire un workspace visuale semplice, affidabile e
curato, adatto a utenti non tecnici su PC e mobile. Seguire il piano completo in
PIANO.md. Il progetto deve essere credibile nel portfolio: non dichiarare qualità
enterprise o superiorità competitiva senza evidenze.

## Regole di avanzamento e completamento

- Conservare l'obiettivo completo tra sessioni: non ridurlo al singolo ciclo già concluso.
- Verificare lo stato reale di codice, test e deploy prima di basarsi su riepiloghi.
- Un ciclo deve produrre modifiche utili o evidenze nuove; non basta ripetere uno stato.
- Per dichiarare completo l'obiettivo, confrontare ogni requisito di PIANO.md con
  prove adeguate. Requisiti aperti o non verificati restano esplicitamente aperti.
- Non confondere test sintetici, viewport mobile e CI con prove su telefoni reali
  o validazione da utenti non tecnici. Non dichiarare test mai eseguiti.
- Se un processo è ancora attivo, seguirlo; non riavviarlo solo perché un'attesa è scaduta.
- Segnalare un blocco solo quando impedisce realmente altro lavoro utile.

## Chiusura di un ciclo consolidato

1. Verificare le funzionalità modificate e le regressioni collegate, inclusi output PDF.
2. Controllare UI/UX desktop e mobile quando il cambiamento influisce sui flussi.
3. Aggiornare PIANO.md, documentazione, Graphify e Archify secondo la portata del cambiamento.
4. Eseguire commit, push e deploy autorizzati; controllare CI e sito effettivamente pubblicato.
5. Riportare risultato, link verificabile e limiti residui. Una CI verde non prova da sola l'usabilità.

## Vincoli

File PDF elaborati sul dispositivo; nessun invio dei documenti a servizi esterni.
Hosting statico e nessuna spesa senza autorizzazione. Il deploy su Vercel collegato
a GitHub è autorizzato dall'utente e non cambia il trattamento locale dei PDF.
Supabase Free è autorizzato per account facoltativi, tema e preferiti. PDF e firme
restano sul dispositivo; nessun archivio documenti cloud.
Non versionare credenziali o configurazioni locali di autenticazione.
