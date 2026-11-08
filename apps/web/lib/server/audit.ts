import 'server-only';
import { json, prisma } from './prisma';

/** Audit trail without secrets or document contents. */
export async function audit(
  action: string,
  data: { workspaceId?: string | null; actorId?: string | null; entityId?: string | null; requestId?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  await prisma().auditEvent.create({
    data: {
      action,
      workspaceId: data.workspaceId ?? null,
      actorId: data.actorId ?? null,
      entityId: data.entityId ?? null,
      requestId: data.requestId ?? null,
      ...(data.metadata ? { metadataWithoutSecrets: json(data.metadata) } : {}),
    },
  });
}
