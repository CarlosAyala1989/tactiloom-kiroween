/** Structured JSON logs (stdout). Never log document contents, e-mails or tokens. */
export function log(level: 'info' | 'warn' | 'error', event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, service: 'runner', event, ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
}
