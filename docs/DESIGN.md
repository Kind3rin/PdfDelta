# Direzione visiva — PdfDelta

Il documento è il centro dell'applicazione. Il design deve rendere evidenti apertura,
modifica e download anche a chi non conosce la terminologia PDF.

## Token

- Carta: #ffffff, superficie pulita per comandi e documenti.
- Tavolo: #edf0f5, fondo delle anteprime distinto dalla carta.
- Inchiostro: #202936, testo principale.
- Secondario: #657084, istruzioni e metadati.
- Azione: #3659d9, download, selezione e focus.
- Conferma: #247458, stato locale senza una nuova card.
- Manrope variabile locale, pesi 400/500/600/700. Titoli 24–42 px, UI 14 px.

## Struttura

Desktop: titolo del documento e download nella stessa riga; strumenti in una
colonna stretta a sinistra, pagine grandi su un piano grigio a destra. Allineamento
a sinistra per i comandi, miniature centrate nelle rispettive celle.

```text
Marchio                                      File sul dispositivo
Documento                                    Aggiungi | Scarica
Strumenti       Pagine             Annulla | Seleziona | Confronta
Compila         [pagina] [pagina] [pagina]
Comprimi
Converti
Altri strumenti
```

Mobile: intestazione compatta, azioni in due colonne, due miniature per riga.
Un solo scorrimento della pagina, nessun riquadro documento con scrollbar annidata.
L'editor mantiene i comandi sopra il foglio.

## Revisione contro il brief

Eliminati pulsanti indistinti a tutta larghezza desktop, cornici annidate e nomi
file ripetuti sotto ogni pagina. Le icone aiutano il riconoscimento ma mantengono
etichette testuali. Il blu identifica un'azione o una selezione, non decora titoli.
La home presenta 12 strumenti frequenti, ricerca e filtri per categoria. Ogni
scheda indica un risultato concreto e apre il caricamento per quella operazione.
Il documento già aperto può essere ripreso dal catalogo senza perdere la sessione.

## Home e movimento

Titolo ampio, Manrope locale, fondo chiaro e icone colorate per categoria rendono
riconoscibili le operazioni prima di caricare un file. Quattro colonne desktop,
tre tablet e due mobile; nessuna funzione futura presentata come disponibile.
L'illustrazione dei fogli reagisce al puntatore con prospettiva CSS. Non richiede
WebGL né nuove librerie: il movimento è decorativo, disabilitato con la preferenza
di movimento ridotto e assente sui dispositivi touch. Hover e focus mantengono
etichette leggibili. Il documento di esempio permette di provare il flusso.

La revisione visiva ha ridotto l'altezza del blocco introduttivo per anticipare gli
strumenti. Le schermate desktop e mobile sono prove di rendering, non una
validazione da parte di utenti non tecnici.

## Verifica

Controllare apertura a root e index.html, stato vuoto, documento caricato, selezione,
catalogo, editor, tema scuro e larghezze 390/768/1440/1920 px. Verificare geometricamente
colonne desktop e dimensioni delle miniature: l'assenza di overflow da sola non basta.

Questi controlli geometrici sono nella suite `verify-workspace.cjs`. Snapshot locali
in `dist/verification/` (ignorate da Git). Tema scuro ed editor verificati anche nel
browser interattivo. Le miniature usano rendering a 440 px per rimanere nitide.
