import { catalogRows, exampleRows, type ManualContext } from './shared';

export function manualFr(context: ManualContext): string {
  const { entries, template, titles, branch } = context;
  const { grid, card } = template;
  return `# Tactiloom — Manuel d’impression et d’assemblage du kit (board-v1 / cards-v1)

> Fichier généré par \`pnpm board:generate\`. Ne pas le modifier à la main.

## 1. Quoi imprimer

| Fichier | Usage |
|---|---|
| \`board-v1-a3.pdf\` | Plateau complet en **A3 paysage** (recommandé). |
| \`board-v1-a4-tiles.pdf\` | Le même plateau sur **4 feuilles A4 paysage** à l’échelle réelle. |
| \`board-v1-small-a4.pdf\` | Plateau **réduit** (échelle 0,707) sur une seule feuille A4, pour des essais rapides. |
| \`cards-v1-a4.pdf\` | ${entries.length} cartes à l’échelle réelle (${card.width} × ${card.height} mm) pour le plateau A3 ou la mosaïque. |
| \`cards-v1-small-a4.pdf\` | Les mêmes cartes en version réduite, pour le plateau A4 réduit. |

**Imprimez toujours à 100 %** (« taille réelle », jamais « ajuster à la page »). Vérifiez la barre de contrôle du
plateau : elle doit mesurer 100 mm (70,7 mm pour la version réduite). Un papier blanc mat limite les reflets.

## 2. Assemblage

1. **A3 :** rien à assembler. Collez le plateau sur un carton ou fixez ses bords à la table avec du ruban adhésif.
2. **Mosaïque A4 :** découpez chaque feuille le long de ses traits de coupe (aux coins) et assemblez les 4 feuilles
   **bord à bord** dans l’ordre 1-2 (en haut) et 3-4 (en bas), avec du ruban adhésif au dos. Un décalage de 1 à 2 mm
   reste acceptable, car l’étalonnage utilise les 4 marqueurs de coin, mais gardez la feuille bien à plat.
3. **Cartes :** découpez le long du bord gris arrondi. Ne coupez pas et ne pliez pas le marqueur ni sa marge blanche.
   Facultatif : collez chaque carte sur du bristol pour qu’elle ne gondole pas.

## 3. Règles de placement (Tactiloom Board Grammar v1)

- Grille de **8 colonnes × 4 lignes** ; cases de ${grid.cellWidth} × ${grid.cellHeight} mm. Les coordonnées imprimées
  dans chaque case sont \`ligne,colonne\` (à partir de 0).
- Une carte par case, centrée. Les **4 marqueurs de coin (ID 0, 1, 2, 3)** doivent être entièrement visibles sur la photo.
- La **flèche imprimée** sur la carte est sa direction d’avancement **F**. Quand la carte est droite (titre en haut),
  F pointe vers l’**est**. Faites pivoter la carte par pas de 90° pour changer F.
- Chaque carte reçoit le flux par son bord arrière (**IN**, opposé à F) et le transmet à la case voisine dans la direction F (**OUT**).
- **${titles.CONDITION} :** la sortie **${branch.TRUE}** suit F ; la sortie **${branch.FALSE}** tourne de 90° vers la droite de F (la flèche « ${branch.FALSE} » imprimée).
  Les deux sorties doivent mener à des cartes différentes.
- **${titles.END}** n’a pas de sortie. Tout chemin doit se terminer sur une carte ${titles.END}.
- Les cases vides ne relient **pas** les cartes : les connexions n’existent qu’entre cases adjacentes.

### Exemple à deux branches (fixture officielle)

| Carte | Case (ligne,col) | Orientation |
|---|---|---|
${exampleRows(context, { branches: `${branch.TRUE} → est, ${branch.FALSE} → sud`, rotated: 'pivotée de 90° dans le sens horaire' })}

## 4. Prise de vue

- Tenez l’appareil aussi perpendiculaire que possible au plateau, avec tout le plateau dans le cadre et une lumière diffuse, sans ombres dures.
- Résolution minimale recommandée : 1280 × 720. Évitez les reflets sur les marqueurs.
- Déplacer une carte n’exécute **jamais** rien : il faut de nouveau analyser, compiler, vérifier et approuver.

## 5. Catalogue imprimé (cards-v1)

| Marqueur | Type | Titre imprimé | Instance | Jeu |
|---|---|---|---|---|
${catalogRows(context)}

Les ID 0 à 3 sont réservés aux coins ; les ID 36 à 89 sont réservés à de futures cartes et sont rejetés avec le code
\`UNKNOWN_CARD\`. Dictionnaire : \`${template.dictionary}\`.
`;
}
