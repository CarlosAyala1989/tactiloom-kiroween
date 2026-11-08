import { LOCALE_NATIVE_NAMES, LOCALES, type Locale } from '@tactiloom/contracts';
import { KIT_INDEX_FILE, KIT_MANIFEST_FILE, kitIndexLocales } from './manifest';

/** One section per language describing the layout of the localized kits and their manifests. */
const SECTIONS: Readonly<Record<Locale, string>> = {
  es: `## Español

Cada carpeta contiene un kit completo en su idioma, con los mismos nombres de archivo: tablero (\`board-v1-*.pdf\`,
\`board-v1-a3.svg\`), tarjetas (\`cards-v1-*.pdf\`, \`cards-v1-sheet-*.svg\`, \`cards/card-NN.svg\`), manual
(\`ASSEMBLY.md\`), contratos (\`board-v1.json\`, \`cards-v1.json\`, \`cards-v1-*layout.json\`) y su \`${KIT_MANIFEST_FILE}\`.
Solo cambian los textos impresos: la geometría y los marcadores ArUco son idénticos en los cuatro idiomas.

- \`${KIT_MANIFEST_FILE}\` (uno por carpeta): archivos de ese kit con \`path\` relativo a la carpeta, descripción en su
  idioma, \`bytes\` y \`sha256\`.
- \`${KIT_INDEX_FILE}\` (raíz): índice de todos los kits. \`locales[]\` indica la carpeta (\`directory\`), el manifiesto
  y el nombre del ZIP de cada idioma; \`files[]\` registra cada archivo con su \`locale\`, su \`name\` (ruta dentro del
  kit y del ZIP), su \`path\` (ruta desde \`assets/board-kit\`), \`description\`, \`bytes\` y \`sha256\`. La web solo sirve
  archivos de este índice.
- \`tactiloom-board-kit-<idioma>.zip\`: la web lo genera al descargarlo
  (\`/api/board/kit/download?locale=<idioma>&file=…\`) con los archivos de ese idioma dentro de la carpeta
  \`tactiloom-board-kit-<idioma>/\`.
- El kit español de la raíz es la referencia de los fixtures de visión y sus bytes no cambian; por eso sus PDF no
  declaran \`/Lang\`. Los PDF en/it/fr sí declaran su idioma.
`,
  en: `## English

Each folder holds a complete kit in its language, with the same file names: board (\`board-v1-*.pdf\`,
\`board-v1-a3.svg\`), cards (\`cards-v1-*.pdf\`, \`cards-v1-sheet-*.svg\`, \`cards/card-NN.svg\`), manual
(\`ASSEMBLY.md\`), contracts (\`board-v1.json\`, \`cards-v1.json\`, \`cards-v1-*layout.json\`) and its \`${KIT_MANIFEST_FILE}\`.
Only the printed texts change: geometry and ArUco markers are identical in all four languages.

- \`${KIT_MANIFEST_FILE}\` (one per folder): the files of that kit, with \`path\` relative to the folder, a description
  in its language, \`bytes\` and \`sha256\`.
- \`${KIT_INDEX_FILE}\` (root): index of every kit. \`locales[]\` gives the folder (\`directory\`), the manifest and the
  ZIP name of each language; \`files[]\` records every file with its \`locale\`, its \`name\` (path inside the kit and
  the ZIP), its \`path\` (from \`assets/board-kit\`), \`description\`, \`bytes\` and \`sha256\`. The web app only serves
  files listed in this index.
- \`tactiloom-board-kit-<language>.zip\`: built by the web app on download
  (\`/api/board/kit/download?locale=<language>&file=…\`) with the files of that language inside the folder
  \`tactiloom-board-kit-<language>/\`.
- The Spanish kit at the root is the reference for the vision fixtures and its bytes never change, which is why its
  PDFs do not declare \`/Lang\`. The en/it/fr PDFs do declare their language.
`,
  it: `## Italiano

Ogni cartella contiene un kit completo nella sua lingua, con gli stessi nomi di file: tabellone (\`board-v1-*.pdf\`,
\`board-v1-a3.svg\`), carte (\`cards-v1-*.pdf\`, \`cards-v1-sheet-*.svg\`, \`cards/card-NN.svg\`), manuale
(\`ASSEMBLY.md\`), contratti (\`board-v1.json\`, \`cards-v1.json\`, \`cards-v1-*layout.json\`) e il suo \`${KIT_MANIFEST_FILE}\`.
Cambiano solo i testi stampati: la geometria e i marcatori ArUco sono identici nelle quattro lingue.

- \`${KIT_MANIFEST_FILE}\` (uno per cartella): i file di quel kit, con \`path\` relativo alla cartella, descrizione nella
  sua lingua, \`bytes\` e \`sha256\`.
- \`${KIT_INDEX_FILE}\` (radice): indice di tutti i kit. \`locales[]\` indica la cartella (\`directory\`), il manifesto e il
  nome dello ZIP di ogni lingua; \`files[]\` registra ogni file con il suo \`locale\`, il suo \`name\` (percorso nel kit e
  nello ZIP), il suo \`path\` (da \`assets/board-kit\`), \`description\`, \`bytes\` e \`sha256\`. L’app web serve solo i
  file elencati in questo indice.
- \`tactiloom-board-kit-<lingua>.zip\`: lo genera l’app web al momento del download
  (\`/api/board/kit/download?locale=<lingua>&file=…\`) con i file di quella lingua nella cartella
  \`tactiloom-board-kit-<lingua>/\`.
- Il kit spagnolo nella radice è il riferimento delle fixture di visione e i suoi byte non cambiano: per questo i suoi
  PDF non dichiarano \`/Lang\`. I PDF en/it/fr dichiarano la propria lingua.
`,
  fr: `## Français

Chaque dossier contient un kit complet dans sa langue, avec les mêmes noms de fichiers : plateau (\`board-v1-*.pdf\`,
\`board-v1-a3.svg\`), cartes (\`cards-v1-*.pdf\`, \`cards-v1-sheet-*.svg\`, \`cards/card-NN.svg\`), manuel
(\`ASSEMBLY.md\`), contrats (\`board-v1.json\`, \`cards-v1.json\`, \`cards-v1-*layout.json\`) et son \`${KIT_MANIFEST_FILE}\`.
Seuls les textes imprimés changent : la géométrie et les marqueurs ArUco sont identiques dans les quatre langues.

- \`${KIT_MANIFEST_FILE}\` (un par dossier) : les fichiers de ce kit, avec \`path\` relatif au dossier, une description
  dans sa langue, \`bytes\` et \`sha256\`.
- \`${KIT_INDEX_FILE}\` (racine) : index de tous les kits. \`locales[]\` donne le dossier (\`directory\`), le manifeste et
  le nom du ZIP de chaque langue ; \`files[]\` enregistre chaque fichier avec sa \`locale\`, son \`name\` (chemin dans le
  kit et dans le ZIP), son \`path\` (depuis \`assets/board-kit\`), \`description\`, \`bytes\` et \`sha256\`. L’application
  web ne sert que les fichiers de cet index.
- \`tactiloom-board-kit-<langue>.zip\` : généré par l’application web au téléchargement
  (\`/api/board/kit/download?locale=<langue>&file=…\`) avec les fichiers de cette langue dans le dossier
  \`tactiloom-board-kit-<langue>/\`.
- Le kit espagnol à la racine sert de référence aux fixtures de vision et ses octets ne changent pas : c’est pourquoi
  ses PDF ne déclarent pas \`/Lang\`. Les PDF en/it/fr déclarent leur langue.
`,
};

/** README.md at the root of assets/board-kit (all languages). */
export function kitReadme(): string {
  const rows = kitIndexLocales()
    .map(({ locale, directory, manifest, zipName }) => {
      const folder = directory === '.' ? './' : `${directory}/`;
      return `| ${LOCALE_NATIVE_NAMES[locale]} (\`${locale}\`) | \`${folder}\` | \`${manifest}\` | \`${zipName}\` |`;
    })
    .join('\n');
  return `# Tactiloom — kit imprimible · printable kit · kit stampabile · kit imprimable

> Archivo generado por \`pnpm board:generate\`; no editar a mano. · Generated by \`pnpm board:generate\`; do not edit by hand.

| Idioma · Language · Lingua · Langue | Carpeta · Folder · Cartella · Dossier | Manifiesto · Manifest | ZIP |
|---|---|---|---|
${rows}

${LOCALES.map((locale) => SECTIONS[locale]).join('\n')}`;
}
