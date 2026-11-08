import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Builds (once) a short Y4M clip from the synthetic perspective board image so Chrome's fake
 * camera can stream it. Requires ffmpeg; fixed argv, no shell.
 */
export function fakeCameraVideo(): string {
  const outDir = join(here, '.artifacts');
  const target = join(outDir, 'fake-board-camera.y4m');
  if (!existsSync(target)) {
    mkdirSync(outDir, { recursive: true });
    const source = join(here, '..', '..', 'assets', 'examples', 'boards', 'valid-board-perspective.png');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-loop', '1', '-i', source, '-t', '2', '-r', '5', '-vf', 'scale=1280:960,format=yuv420p', target], { stdio: 'pipe' });
  }
  return target;
}
