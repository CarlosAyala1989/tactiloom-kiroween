import 'server-only';
import { sha256Hex } from '@ritualos/workflow-engine/sandbox';
import { sniffMime } from '@ritualos/workflow-engine/sniff';
import { audit } from './audit';
import { env } from './env';
import { HttpError } from './http';
import { prisma } from './prisma';
import { assertUploadQuota } from './quotas';
import { getSandbox } from './sandbox';
import type { SessionContext } from './session';

/** Display-only name: no directories, no control characters, bounded length. Never used for paths. */
export function displayName(raw: string, mime: string): string {
  const base = raw.split(/[\\/]/).pop() ?? 'documento';
  let clean = base
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} ._()-]/gu, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  if (!clean || clean.startsWith('.')) clean = `documento${clean}`;
  const extension = mime === 'application/pdf' ? '.pdf' : '.txt';
  return clean.toLowerCase().endsWith(extension) ? clean : `${clean}${extension}`;
}

export function documentView(doc: { id: string; originalName: string; mime: string; bytes: number; sha256: string; isDemo: boolean; createdAt: Date }) {
  return { id: doc.id, originalName: doc.originalName, mime: doc.mime, bytes: doc.bytes, sha256: doc.sha256, isDemo: doc.isDemo, createdAt: doc.createdAt };
}

/** Untrusted upload → content-sniffed PDF/TXT stored as uploads/<id>.<ext> inside the workspace sandbox. */
export async function storeUpload(session: SessionContext, file: File, requestId: string) {
  if (file.size === 0) throw new HttpError(400, 'FILE_EMPTY', 'El archivo está vacío.');
  if (file.size > env().DEMO_MAX_UPLOAD_BYTES) {
    throw new HttpError(413, 'FILE_TOO_LARGE', `El archivo supera el máximo de ${Math.floor(env().DEMO_MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  }
  await assertUploadQuota(session.workspaceId);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'Solo se aceptan PDF (con capa de texto) o TXT en UTF-8.');
  const db = prisma();
  const doc = await db.uploadedDocument.create({
    data: {
      workspaceId: session.workspaceId,
      originalName: displayName(file.name || 'documento', mime),
      mime,
      bytes: bytes.byteLength,
      sha256: sha256Hex(bytes),
      sandboxPath: 'pending',
    },
  });
  const relative = `uploads/${doc.id}.${mime === 'application/pdf' ? 'pdf' : 'txt'}`;
  try {
    await (await getSandbox()).writeFileIdempotent(session.workspaceId, relative, bytes, env().DEMO_MAX_UPLOAD_BYTES);
  } catch (error) {
    await db.uploadedDocument.delete({ where: { id: doc.id } });
    throw error;
  }
  const stored = await db.uploadedDocument.update({ where: { id: doc.id }, data: { sandboxPath: relative } });
  await audit('DOCUMENT_UPLOADED', { workspaceId: session.workspaceId, actorId: session.userId, entityId: doc.id, requestId, metadata: { mime, bytes: bytes.byteLength } });
  return documentView(stored);
}
