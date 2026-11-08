import { catalogRows, exampleRows, type ManualContext } from './shared';

export function manualIt(context: ManualContext): string {
  const { entries, template, titles, branch } = context;
  const { grid, card } = template;
  return `# Tactiloom — Manuale di stampa e montaggio del kit (board-v1 / cards-v1)

> File generato da \`pnpm board:generate\`. Non modificarlo a mano.

## 1. Cosa stampare

| File | Uso |
|---|---|
| \`board-v1-a3.pdf\` | Tabellone completo su **A3 orizzontale** (consigliato). |
| \`board-v1-a4-tiles.pdf\` | Lo stesso tabellone su **4 fogli A4 orizzontali** a grandezza naturale. |
| \`board-v1-small-a4.pdf\` | Tabellone **ridotto** (scala 0,707) su un solo foglio A4, per prove rapide. |
| \`cards-v1-a4.pdf\` | ${entries.length} carte a grandezza naturale (${card.width} × ${card.height} mm) per il tabellone A3 o il mosaico. |
| \`cards-v1-small-a4.pdf\` | Le stesse carte in versione ridotta, per il tabellone A4 ridotto. |

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

- Griglia di **8 colonne × 4 righe**; caselle di ${grid.cellWidth} × ${grid.cellHeight} mm. Le coordinate stampate
  in ogni casella sono \`riga,colonna\` (a partire da 0).
- Una carta per casella, centrata. I **4 marcatori d’angolo (ID 0, 1, 2, 3)** devono essere interamente visibili nella foto.
- La **freccia stampata** sulla carta è la sua direzione di avanzamento **F**. Quando la carta è dritta (titolo in alto),
  F punta a **est**. Ruota la carta di multipli di 90° per cambiare F.
- Ogni carta riceve il flusso dal lato posteriore (**IN**, opposto a F) e lo passa alla casella adiacente in direzione F (**OUT**).
- **${titles.CONDITION}:** l’uscita **${branch.TRUE}** prosegue in direzione F; l’uscita **${branch.FALSE}** gira di 90° a destra di F (la freccia «${branch.FALSE}» stampata).
  Le due uscite devono portare a carte diverse.
- **${titles.END}** non ha uscite. Ogni percorso deve terminare su una carta ${titles.END}.
- Le caselle vuote **non** collegano le carte: i collegamenti esistono solo tra caselle adiacenti.

### Esempio a due rami (fixture ufficiale)

| Carta | Casella (riga,col) | Orientamento |
|---|---|---|
${exampleRows(context, { branches: `${branch.TRUE} → est, ${branch.FALSE} → sud`, rotated: 'ruotata di 90° in senso orario' })}

## 4. Fotografia

- Tieni la fotocamera il più possibile perpendicolare al tabellone, con tutto il tabellone nell’inquadratura e una luce diffusa, senza ombre nette.
- Risoluzione minima consigliata: 1280 × 720. Evita i riflessi sui marcatori.
- Spostare una carta **non** esegue **mai** nulla: bisogna analizzare, compilare, rivedere e approvare di nuovo.

## 5. Catalogo stampato (cards-v1)

| Marcatore | Tipo | Titolo stampato | Istanza | Set |
|---|---|---|---|---|
${catalogRows(context)}

Gli ID 0–3 sono riservati agli angoli; gli ID 36–89 sono riservati a carte future e vengono rifiutati come
\`UNKNOWN_CARD\`. Dizionario: \`${template.dictionary}\`.
`;
}
