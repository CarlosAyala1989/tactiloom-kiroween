'use client';

import { useEffect, useId, useState } from 'react';
import { api, type DocumentView } from '@/lib/client/api';
import { useI18n } from '@/lib/i18n/provider';

/** The cause is kept (not its text) so the message follows the UI language. */
type Failure = { readonly cause: unknown; readonly fallback: 'loadFailed' | 'uploadFailed' };

/** Picks a document of the current workspace (or uploads one: PDF with text layer or TXT, ≤ 10 MB). */
export function DocumentSelect({ value, onChange, label }: { value: string | null; onChange: (id: string | null) => void; label?: string }) {
  const id = useId();
  const { t, bytes, errorText } = useI18n();
  const words = t.workflow.documents;
  const [documents, setDocuments] = useState<DocumentView[]>([]);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api
      .documents()
      .then((result) => setDocuments(result.documents))
      .catch((cause: unknown) => setFailure({ cause, fallback: 'loadFailed' }));
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    setFailure(null);
    try {
      const { document } = await api.upload(file);
      setDocuments((current) => [...current, document]);
      onChange(document.id);
    } catch (cause) {
      setFailure({ cause, fallback: 'uploadFailed' });
    } finally {
      setUploading(false);
    }
  };

  const error = failure ? errorText(failure.cause, words[failure.fallback]) : null;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label ?? words.label(t.catalog.short.INPUT_FILE)}
      </label>
      <select id={id} className="field" value={value ?? ''} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">{words.none}</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.isDemo ? `[${t.demo}] ` : ''}
            {doc.originalName} · {doc.mime === 'application/pdf' ? 'PDF' : 'TXT'} · {bytes(doc.bytes)}
          </option>
        ))}
      </select>
      <label className="block text-xs text-muted">
        {words.uploadOwn}{' '}
        <input
          type="file"
          accept="application/pdf,text/plain,.pdf,.txt"
          disabled={uploading}
          className="mt-1 block text-xs"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = '';
          }}
        />
      </label>
      {uploading && <p className="text-xs text-muted">{words.uploading}</p>}
      {error && (
        <p role="alert" className="text-xs text-err">
          {error}
        </p>
      )}
    </div>
  );
}
