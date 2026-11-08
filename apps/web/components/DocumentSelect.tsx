'use client';

import { useEffect, useId, useState } from 'react';
import { api, ApiError, type DocumentView } from '@/lib/client/api';
import { formatBytes } from './ui';

/** Picks a document of the current workspace (or uploads one: PDF with text layer or TXT, ≤ 10 MB). */
export function DocumentSelect({ value, onChange, label = 'Documento de entrada (tarjeta ARCHIVO)' }: { value: string | null; onChange: (id: string | null) => void; label?: string }) {
  const id = useId();
  const [documents, setDocuments] = useState<DocumentView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api
      .documents()
      .then((result) => setDocuments(result.documents))
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'No se pudieron cargar los documentos.'));
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const { document } = await api.upload(file);
      setDocuments((current) => [...current, document]);
      onChange(document.id);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <select id={id} className="field" value={value ?? ''} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">— Sin documento (se pedirá antes de ejecutar) —</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.isDemo ? '[demo] ' : ''}
            {doc.originalName} · {doc.mime === 'application/pdf' ? 'PDF' : 'TXT'} · {formatBytes(doc.bytes)}
          </option>
        ))}
      </select>
      <label className="block text-xs text-muted">
        o sube tu propio documento ficticio:{' '}
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
      {uploading && <p className="text-xs text-muted">Subiendo…</p>}
      {error && (
        <p role="alert" className="text-xs text-err">
          {error}
        </p>
      )}
    </div>
  );
}
