/**
 * `pnpm board:generate` — writes the printable kits to assets/board-kit (Spanish at the root, en/it/fr
 * in their folders, kit-index.json and README.md) and the card icons to assets/card-icons. Output is
 * deterministic (fixed PDF metadata), so re-running only changes files when the design, the texts or
 * the catalog changed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES } from '@tactiloom/contracts';
import { buildKitTree, iconFiles, type KitFile } from '../src/index';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function writeAll(baseDir: string, files: readonly KitFile[]): void {
  for (const file of files) {
    const target = join(baseDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.contents);
  }
}

const kitDir = join(root, 'assets', 'board-kit');
const tree = await buildKitTree();
writeAll(kitDir, tree);
writeAll(join(root, 'assets', 'card-icons'), iconFiles());
console.log(
  `board-kit: ${tree.length} archivos en assets/board-kit (${LOCALES.join(', ')}), ${iconFiles().length} iconos en assets/card-icons`,
);
