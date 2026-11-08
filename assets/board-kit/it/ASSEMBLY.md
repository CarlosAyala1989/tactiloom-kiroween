# Tactiloom — Manuale di stampa e montaggio del kit (board-v1 / cards-v1)

> File generato da `pnpm board:generate`. Non modificarlo a mano.

## 1. Cosa stampare

| File | Uso |
|---|---|
| `board-v1-a3.pdf` | Tabellone completo su **A3 orizzontale** (consigliato). |
| `board-v1-a4-tiles.pdf` | Lo stesso tabellone su **4 fogli A4 orizzontali** a grandezza naturale. |
| `board-v1-small-a4.pdf` | Tabellone **ridotto** (scala 0,707) su un solo foglio A4, per prove rapide. |
| `cards-v1-a4.pdf` | 26 carte a grandezza naturale (41 × 51 mm) per il tabellone A3 o il mosaico. |
| `cards-v1-small-a4.pdf` | Le stesse carte in versione ridotta, per il tabellone A4 ridotto. |

**Stampa sempre al 100%** («dimensioni effettive», mai «adatta alla pagina»). Controlla la barra di verifica del
tabellone: deve misurare 100 mm (70,7 mm nella versione ridotta). La carta bianca opaca riduce i riflessi.

## 2. Montaggio

1. **A3:** non serve alcun montaggio. Incolla il tabellone su un cartone o fissalo al tavolo con del nastro adesivo sui bordi.
2. **Mosaico A4:** ritaglia ogni foglio lungo i segni di taglio (agli angoli) e unisci i 4 fogli **bordo a bordo**
   nell’ordine 1-2 (in alto) e 3-4 (in basso), con del nastro adesivo sul retro. Un disallineamento di 1–2 mm è
   tollerabile perché la calibrazione usa i 4 marcatori d’angolo, ma tieni il foglio ben piatto.
3. **Carte:** ritaglia lungo il bordo grigio arrotondato. Non tagliare né piegare il marcatore o il suo margine bianco.
   Facoltativo: incolla ogni carta su un cartoncino perché non si incurvi.

## 3. Regole di posizionamento (Tactiloom Board Grammar v1)

- Griglia di **8 colonne × 4 righe**; caselle di 47 × 57 mm. Le coordinate stampate
  in ogni casella sono `riga,colonna` (a partire da 0).
- Una carta per casella, centrata. I **4 marcatori d’angolo (ID 0, 1, 2, 3)** devono essere interamente visibili nella foto.
- La **freccia stampata** sulla carta è la sua direzione di avanzamento **F**. Quando la carta è dritta (titolo in alto),
  F punta a **est**. Ruota la carta di multipli di 90° per cambiare F.
- Ogni carta riceve il flusso dal lato posteriore (**IN**, opposto a F) e lo passa alla casella adiacente in direzione F (**OUT**).
- **CONDIZIONE:** l’uscita **SÌ** prosegue in direzione F; l’uscita **NO** gira di 90° a destra di F (la freccia «NO» stampata).
  Le due uscite devono portare a carte diverse.
- **FINE** non ha uscite. Ogni percorso deve terminare su una carta FINE.
- Le caselle vuote **non** collegano le carte: i collegamenti esistono solo tra caselle adiacenti.

### Esempio a due rami (fixture ufficiale)

| Carta | Casella (riga,col) | Orientamento |
|---|---|---|
| INIZIO #10 | 0,0 | E |
| FILE #11 | 0,1 | E |
| ESTRAI TESTO #12 | 0,2 | E |
| CONVALIDA CAMPI #13 | 0,3 | E |
| CONDIZIONE #14 | 0,4 | E (SÌ → est, NO → sud) |
| CREA REPORT #15 | 0,5 | E |
| SALVA REPORT #16 | 0,6 | E |
| FINE #17 | 0,7 | E |
| CHIEDI REVISIONE #18 | 1,4 | S (ruotata di 90° in senso orario) |
| FINE #19 | 2,4 | S (ruotata di 90° in senso orario) |

## 4. Fotografia

- Tieni la fotocamera il più possibile perpendicolare al tabellone, con tutto il tabellone nell’inquadratura e una luce diffusa, senza ombre nette.
- Risoluzione minima consigliata: 1280 × 720. Evita i riflessi sui marcatori.
- Spostare una carta **non** esegue **mai** nulla: bisogna analizzare, compilare, rivedere e approvare di nuovo.

## 5. Catalogo stampato (cards-v1)

| Marcatore | Tipo | Titolo stampato | Istanza | Set |
|---|---|---|---|---|
| #10 | START | INIZIO | `start-10` | A |
| #11 | INPUT_FILE | FILE | `input-11` | A |
| #12 | EXTRACT_TEXT | ESTRAI TESTO | `extract-12` | A |
| #13 | VALIDATE_FIELDS | CONVALIDA CAMPI | `validate-13` | A |
| #14 | CONDITION | CONDIZIONE | `condition-14` | A |
| #15 | CREATE_REPORT | CREA REPORT | `report-15` | A |
| #16 | SAVE_REPORT | SALVA REPORT | `save-16` | A |
| #17 | END | FINE | `end-17` | A |
| #18 | REQUEST_REVIEW | CHIEDI REVISIONE | `review-18` | A |
| #19 | END | FINE | `end-19` | A |
| #20 | START | INIZIO | `start-20` | B |
| #21 | INPUT_FILE | FILE | `input-21` | B |
| #22 | EXTRACT_TEXT | ESTRAI TESTO | `extract-22` | B |
| #23 | VALIDATE_FIELDS | CONVALIDA CAMPI | `validate-23` | B |
| #24 | CONDITION | CONDIZIONE | `condition-24` | B |
| #25 | CREATE_REPORT | CREA REPORT | `report-25` | B |
| #26 | SAVE_REPORT | SALVA REPORT | `save-26` | B |
| #27 | END | FINE | `end-27` | B |
| #28 | REQUEST_REVIEW | CHIEDI REVISIONE | `review-28` | B |
| #29 | END | FINE | `end-29` | B |
| #30 | END | FINE | `end-30` | extra |
| #31 | END | FINE | `end-31` | extra |
| #32 | REQUEST_REVIEW | CHIEDI REVISIONE | `review-32` | extra |
| #33 | CONDITION | CONDIZIONE | `condition-33` | extra |
| #34 | CREATE_REPORT | CREA REPORT | `report-34` | extra |
| #35 | SAVE_REPORT | SALVA REPORT | `save-35` | extra |

Gli ID 0–3 sono riservati agli angoli; gli ID 36–89 sono riservati a carte future e vengono rifiutati come
`UNKNOWN_CARD`. Dizionario: `DICT_4X4_100`.
