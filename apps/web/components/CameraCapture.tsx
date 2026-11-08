'use client';

import { useEffect, useRef, useState } from 'react';
import { es } from '@/lib/i18n/es';

/**
 * Explicit camera flow: nothing is accessed until the user presses "Activar cámara". Frames stay
 * in the browser until "Capturar" sends a single JPEG snapshot for analysis.
 */
export function CameraCapture({ onCapture, busy }: { onCapture: (blob: Blob) => void; busy: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite usar la cámara (se requiere HTTPS o localhost). Sube una foto en la pestaña Imagen.');
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(media);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Puedes concederlo en el navegador o subir una foto del tablero.'
          : name === 'NotFoundError'
            ? 'No se encontró ninguna cámara. Sube una foto del tablero o usa la galería.'
            : 'No se pudo abrir la cámara. Sube una foto del tablero.',
      );
    }
  };

  const stop = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(blob), 'image/jpeg', 0.92);
  };

  return (
    <div className="space-y-3">
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Coloca la cámara lo más perpendicular posible al tablero, con todo el tablero en el encuadre.</li>
        <li>Luz difusa, sin reflejos sobre los marcadores; las 4 esquinas (ID 0–3) deben verse completas.</li>
        <li>Mover tarjetas nunca ejecuta nada: después de capturar, compilas, revisas y apruebas.</li>
      </ul>
      <div className="relative overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
        <video ref={videoRef} playsInline muted className={`w-full ${stream ? '' : 'hidden'}`} aria-label="Vista previa de la cámara" />
        {stream && <div aria-hidden="true" className="pointer-events-none absolute inset-[7%] rounded-lg border-2 border-dashed border-amber/70" />}
        {!stream && <p className="p-8 text-center text-sm text-muted">La cámara está apagada.</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-err">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!stream ? (
          <button type="button" className="btn btn-primary" onClick={start}>
            {es.actions.enableCamera}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={capture} disabled={busy}>
              {busy ? 'Analizando…' : es.actions.capture}
            </button>
            <button type="button" className="btn" onClick={stop}>
              {es.actions.stopCamera}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
