# Tactiloom — Manuel d’impression et d’assemblage du kit (board-v1 / cards-v1)

> Fichier généré par `pnpm board:generate`. Ne pas le modifier à la main.

## 1. Quoi imprimer

| Fichier | Usage |
|---|---|
| `board-v1-a3.pdf` | Plateau complet en **A3 paysage** (recommandé). |
| `board-v1-a4-tiles.pdf` | Le même plateau sur **4 feuilles A4 paysage** à l’échelle réelle. |
| `board-v1-small-a4.pdf` | Plateau **réduit** (échelle 0,707) sur une seule feuille A4, pour des essais rapides. |
| `cards-v1-a4.pdf` | 26 cartes à l’échelle réelle (41 × 51 mm) pour le plateau A3 ou la mosaïque. |
| `cards-v1-small-a4.pdf` | Les mêmes cartes en version réduite, pour le plateau A4 réduit. |

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

- Grille de **8 colonnes × 4 lignes** ; cases de 47 × 57 mm. Les coordonnées imprimées
  dans chaque case sont `ligne,colonne` (à partir de 0).
- Une carte par case, centrée. Les **4 marqueurs de coin (ID 0, 1, 2, 3)** doivent être entièrement visibles sur la photo.
- La **flèche imprimée** sur la carte est sa direction d’avancement **F**. Quand la carte est droite (titre en haut),
  F pointe vers l’**est**. Faites pivoter la carte par pas de 90° pour changer F.
- Chaque carte reçoit le flux par son bord arrière (**IN**, opposé à F) et le transmet à la case voisine dans la direction F (**OUT**).
- **CONDITION :** la sortie **OUI** suit F ; la sortie **NON** tourne de 90° vers la droite de F (la flèche « NON » imprimée).
  Les deux sorties doivent mener à des cartes différentes.
- **FIN** n’a pas de sortie. Tout chemin doit se terminer sur une carte FIN.
- Les cases vides ne relient **pas** les cartes : les connexions n’existent qu’entre cases adjacentes.

### Exemple à deux branches (fixture officielle)

| Carte | Case (ligne,col) | Orientation |
|---|---|---|
| DÉBUT #10 | 0,0 | E |
| FICHIER #11 | 0,1 | E |
| EXTRAIRE TEXTE #12 | 0,2 | E |
| VALIDER CHAMPS #13 | 0,3 | E |
| CONDITION #14 | 0,4 | E (OUI → est, NON → sud) |
| CRÉER RAPPORT #15 | 0,5 | E |
| ENREGISTRER RAPPORT #16 | 0,6 | E |
| FIN #17 | 0,7 | E |
| DEMANDER RÉVISION #18 | 1,4 | S (pivotée de 90° dans le sens horaire) |
| FIN #19 | 2,4 | S (pivotée de 90° dans le sens horaire) |

## 4. Prise de vue

- Tenez l’appareil aussi perpendiculaire que possible au plateau, avec tout le plateau dans le cadre et une lumière diffuse, sans ombres dures.
- Résolution minimale recommandée : 1280 × 720. Évitez les reflets sur les marqueurs.
- Déplacer une carte n’exécute **jamais** rien : il faut de nouveau analyser, compiler, vérifier et approuver.

## 5. Catalogue imprimé (cards-v1)

| Marqueur | Type | Titre imprimé | Instance | Jeu |
|---|---|---|---|---|
| #10 | START | DÉBUT | `start-10` | A |
| #11 | INPUT_FILE | FICHIER | `input-11` | A |
| #12 | EXTRACT_TEXT | EXTRAIRE TEXTE | `extract-12` | A |
| #13 | VALIDATE_FIELDS | VALIDER CHAMPS | `validate-13` | A |
| #14 | CONDITION | CONDITION | `condition-14` | A |
| #15 | CREATE_REPORT | CRÉER RAPPORT | `report-15` | A |
| #16 | SAVE_REPORT | ENREGISTRER RAPPORT | `save-16` | A |
| #17 | END | FIN | `end-17` | A |
| #18 | REQUEST_REVIEW | DEMANDER RÉVISION | `review-18` | A |
| #19 | END | FIN | `end-19` | A |
| #20 | START | DÉBUT | `start-20` | B |
| #21 | INPUT_FILE | FICHIER | `input-21` | B |
| #22 | EXTRACT_TEXT | EXTRAIRE TEXTE | `extract-22` | B |
| #23 | VALIDATE_FIELDS | VALIDER CHAMPS | `validate-23` | B |
| #24 | CONDITION | CONDITION | `condition-24` | B |
| #25 | CREATE_REPORT | CRÉER RAPPORT | `report-25` | B |
| #26 | SAVE_REPORT | ENREGISTRER RAPPORT | `save-26` | B |
| #27 | END | FIN | `end-27` | B |
| #28 | REQUEST_REVIEW | DEMANDER RÉVISION | `review-28` | B |
| #29 | END | FIN | `end-29` | B |
| #30 | END | FIN | `end-30` | extra |
| #31 | END | FIN | `end-31` | extra |
| #32 | REQUEST_REVIEW | DEMANDER RÉVISION | `review-32` | extra |
| #33 | CONDITION | CONDITION | `condition-33` | extra |
| #34 | CREATE_REPORT | CRÉER RAPPORT | `report-34` | extra |
| #35 | SAVE_REPORT | ENREGISTRER RAPPORT | `save-35` | extra |

Les ID 0 à 3 sont réservés aux coins ; les ID 36 à 89 sont réservés à de futures cartes et sont rejetés avec le code
`UNKNOWN_CARD`. Dictionnaire : `DICT_4X4_100`.
