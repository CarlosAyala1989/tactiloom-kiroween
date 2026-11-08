import 'server-only';
import { lockWorkspace } from '@ritualos/db';
import { sha256Hex } from '@ritualos/workflow-engine/sandbox';
import { sniffMime } from '@ritualos/workflow-engine/sniff';
import { audit } from './audit';
import { env } from './env';
import { HttpError } from './http';
import { prisma } from './prisma';
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
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'Solo se aceptan PDF (con capa de texto) o TXT en UTF-8.');
  const db = prisma();
  // Count and insert under a workspace row lock so concurrent uploads cannot exceed the quotas.
  const doc = await db.$transaction(async (tx) => {
    if (!(await lockWorkspace(tx, session.workspaceId))) throw new HttpError(401, 'NO_SESSION', 'El workspace ya no existe.');
    const usage = await tx.uploadedDocument.aggregate({ where: { workspaceId: session.workspaceId, isDemo: false }, _count: { _all: true }, _sum: { bytes: true } });
    if (usage._count._all >= env().DEMO_MAX_UPLOADS) {
      throw new HttpError(429, 'QUOTA_EXCEEDED', `Límite de ${env().DEMO_MAX_UPLOADS} documentos subidos por workspace.`);
    }
    if ((usage._sum.bytes ?? 0) + bytes.byteLength > env().DEMO_MAX_UPLOAD_TOTAL_BYTES) {
      throw new HttpError(429, 'QUOTA_EXCEEDED', `Límite de ${Math.floor(env().DEMO_MAX_UPLOAD_TOTAL_BYTES / 1024 / 1024)} MB subidos por workspace.`);
    }
    return tx.uploadedDocument.create({
      data: {
        workspaceId: session.workspaceId,
        originalName: displayName(file.name || 'documento', mime),
        mime,
        bytes: bytes.byteLength,
        sha256: sha256Hex(bytes),
        sandboxPath: 'pending',
      },
    });
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
