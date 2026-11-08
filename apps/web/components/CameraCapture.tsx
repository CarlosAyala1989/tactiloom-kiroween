'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';

/** Why the camera could not start (the text is looked up at render time, in the UI language). */
type CameraError = 'unsupported' | 'denied' | 'notFound' | 'failed';

/**
 * Explicit camera flow: nothing is accessed until the user presses "Activar cámara". Frames stay
 * in the browser until "Capturar" sends a single JPEG snapshot for analysis.
 */
export function CameraCapture({ onCapture, busy }: { onCapture: (blob: Blob) => void; busy: boolean }) {
  const { t } = useI18n();
  const words = t.studio.camera;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('unsupported');
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
      setError(name === 'NotAllowedError' ? 'denied' : name === 'NotFoundError' ? 'notFound' : 'failed');
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
        <li>{words.tips.framing}</li>
        <li>{words.tips.light}</li>
        <li>{words.tips.safety}</li>
      </ul>
      <div className="relative overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
        <video ref={videoRef} playsInline muted className={`w-full ${stream ? '' : 'hidden'}`} aria-label={words.previewLabel} />
        {stream && <div aria-hidden="true" className="pointer-events-none absolute inset-[7%] rounded-lg border-2 border-dashed border-amber/70" />}
        {!stream && <p className="p-8 text-center text-sm text-muted">{words.off}</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-err">
          {words.errors[error]}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!stream ? (
          <button type="button" className="btn btn-primary" onClick={start}>
            {t.actions.enableCamera}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={capture} disabled={busy}>
              {busy ? t.actions.analyzing : t.actions.capture}
            </button>
            <button type="button" className="btn" onClick={stop}>
              {t.actions.stopCamera}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
