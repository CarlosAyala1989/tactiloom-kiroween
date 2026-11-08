import { createHash, randomUUID } from 'node:crypto';
import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { SAFE_ID_PATTERN } from '@ritualos/contracts';
import { EngineError } from './errors';

/** Each path segment: starts alphanumeric, then [A-Za-z0-9._-]; never "." or "..". */
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function unsafe(reason: string): EngineError {
  return new EngineError('UNSAFE_FILE_PATH', `Ruta rechazada por el sandbox: ${reason}.`);
}

export interface WrittenFile {
  readonly relativePath: string;
  readonly created: boolean;
  readonly sha256: string;
  readonly size: number;
}

/**
 * Filesystem sandbox rooted at WORKSPACE_ROOT. Every access is confined to
 * `<root>/<workspaceId>/...`: relative paths are parsed segment by segment, every existing
 * component is lstat-checked (symlinks are rejected), files are opened with O_NOFOLLOW and
 * writes are create-only (temp file + link) so retries never clobber or duplicate data.
 */
export class FileSandbox {
  private constructor(readonly root: string) {}

  static async open(root: string): Promise<FileSandbox> {
    const absolute = path.resolve(root);
    await fs.mkdir(absolute, { recursive: true, mode: 0o750 });
    return new FileSandbox(await fs.realpath(absolute));
  }

  static parseRelative(relative: string): string[] {
    if (typeof relative !== 'string' || relative.length === 0 || relative.length > 512) throw unsafe('longitud inválida');
    if (relative.includes('\0') || relative.includes('\\') || path.isAbsolute(relative) || relative.startsWith('/')) {
      throw unsafe('ruta absoluta o con caracteres no permitidos');
    }
    const segments = relative.split('/');
    for (const segment of segments) {
      if (!SEGMENT.test(segment) || segment === '.' || segment === '..') throw unsafe(`segmento «${segment.slice(0, 40)}» no permitido`);
    }
    return segments;
  }

  private assertWorkspaceId(workspaceId: string): void {
    if (!SAFE_ID_PATTERN.test(workspaceId) || !SEGMENT.test(workspaceId)) throw unsafe('workspaceId inválido');
  }

  /** Resolves and validates a path inside the workspace; rejects symlinks on any existing component. */
  async resolve(workspaceId: string, relative: string): Promise<string> {
    this.assertWorkspaceId(workspaceId);
    const segments = FileSandbox.parseRelative(relative);
    const workspaceDir = path.join(this.root, workspaceId);
    const target = path.join(workspaceDir, ...segments);
    const fromRoot = path.relative(workspaceDir, target);
    if (fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) throw unsafe('sale del workspace');
    let current = this.root;
    for (const part of [workspaceId, ...segments]) {
      current = path.join(current, part);
      try {
        const stat = await fs.lstat(current);
        if (stat.isSymbolicLink()) throw unsafe('enlace simbólico');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
        throw error;
      }
    }
    return target;
  }

  async readFile(workspaceId: string, relative: string, maxBytes: number): Promise<Buffer> {
    const target = await this.resolve(workspaceId, relative);
    let handle: fs.FileHandle;
    try {
      handle = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') throw new EngineError('FILE_NOT_FOUND', 'El archivo no existe en el workspace.');
      if (code === 'ELOOP') throw unsafe('enlace simbólico');
      throw error;
    }
    try {
      const stat = await handle.stat();
      if (!stat.isFile()) throw unsafe('no es un archivo regular');
      if (stat.size > maxBytes) throw new EngineError('FILE_TOO_LARGE', `El archivo supera el máximo de ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
      const buffer = Buffer.alloc(stat.size);
      let offset = 0;
      while (offset < stat.size) {
        const { bytesRead } = await handle.read(buffer, offset, stat.size - offset, offset);
        if (bytesRead === 0) break;
        offset += bytesRead;
      }
      return buffer.subarray(0, offset);
    } finally {
      await handle.close();
    }
  }

  private async ensureDirectories(workspaceId: string, segments: readonly string[]): Promise<void> {
    let current = path.join(this.root, workspaceId);
    for (const part of ['', ...segments]) {
      if (part) current = path.join(current, part);
      try {
        const stat = await fs.lstat(current);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw unsafe('directorio intermedio no válido');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        await fs.mkdir(current, { mode: 0o750 });
      }
    }
  }

  /**
   * Create-only write. If the file already exists with identical content the call succeeds with
   * `created: false` (idempotent retries); different content raises FILE_CHANGED.
   */
  async writeFileIdempotent(workspaceId: string, relative: string, data: Uint8Array, maxBytes: number): Promise<WrittenFile> {
    if (data.byteLength > maxBytes) throw new EngineError('OUTPUT_TOO_LARGE', 'La salida supera el tamaño máximo permitido.');
    const segments = FileSandbox.parseRelative(relative);
    const target = await this.resolve(workspaceId, relative);
    await this.ensureDirectories(workspaceId, segments.slice(0, -1));
    await this.resolve(workspaceId, relative); // re-check after creating directories
    const digest = sha256Hex(data);
    const temp = `${target}.tmp-${randomUUID()}`;
    const handle = await fs.open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o640);
    try {
      await handle.writeFile(data);
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await fs.link(temp, target);
      return { relativePath: segments.join('/'), created: true, sha256: digest, size: data.byteLength };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await this.readFile(workspaceId, relative, maxBytes);
      if (sha256Hex(existing) === digest) {
        return { relativePath: segments.join('/'), created: false, sha256: digest, size: data.byteLength };
      }
      throw new EngineError('FILE_CHANGED', 'Ya existe un archivo distinto en esa ruta del workspace.');
    } finally {
      await fs.rm(temp, { force: true });
    }
  }

  async exists(workspaceId: string, relative: string): Promise<boolean> {
    try {
      const target = await this.resolve(workspaceId, relative);
      const stat = await fs.lstat(target);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  async removeWorkspace(workspaceId: string): Promise<void> {
    this.assertWorkspaceId(workspaceId);
    await fs.rm(path.join(this.root, workspaceId), { recursive: true, force: true });
  }

  async listWorkspaces(): Promise<string[]> {
    const entries = await fs.readdir(this.root, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory() && SEGMENT.test(entry.name)).map((entry) => entry.name);
  }
}
