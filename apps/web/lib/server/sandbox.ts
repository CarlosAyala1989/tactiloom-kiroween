import 'server-only';
import { FileSandbox } from '@ritualos/workflow-engine/sandbox';
import { env } from './env';

let sandbox: Promise<FileSandbox> | undefined;

/** The web process only writes uploads and reads generated artifacts; it never parses PDFs. */
export function getSandbox(): Promise<FileSandbox> {
  sandbox ??= FileSandbox.open(env().workspaceRoot);
  return sandbox;
}
