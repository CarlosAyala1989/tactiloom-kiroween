/**
 * `pnpm board:generate` — writes the printable kit to assets/board-kit and the card icons to
 * assets/card-icons. Output is deterministic (fixed PDF metadata), so re-running only changes
 * files when the design or catalog changed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKit, iconFiles, type KitFile } from '../src/index';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function writeAll(baseDir: string, files: readonly KitFile[]): void {
  for (const file of files) {
    const target = join(baseDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.contents);
  }
}

const kitDir = join(root, 'assets', 'board-kit');
const kit = await buildKit();
writeAll(kitDir, kit);
writeAll(join(root, 'assets', 'card-icons'), iconFiles());
console.log(`board-kit: ${kit.length} archivos en assets/board-kit, ${iconFiles().length} iconos en assets/card-icons`);
