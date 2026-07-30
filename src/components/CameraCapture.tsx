"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "./icons";

export function CameraCapture({
  onDone,
  onCancel,
}: {
  onDone: (photos: string[]) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("No se pudo acceder a la cámara. Revisá los permisos."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function shoot() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setShots((s) => [...s, dataUrl]);
  }

  function undo() {
    setShots((s) => s.slice(0, -1));
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6" style={{ background: "#0b0b0c", color: "#fff" }}>
        <p style={{ fontSize: 14, textAlign: "center" }}>{error}</p>
        <button className="btn btn-primary" onClick={onCancel}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0b0b0c" }}>
      <div className="flex items-center justify-between p-3" style={{ color: "#fff" }}>
        <button onClick={onCancel} style={{ fontSize: 14 }} aria-label="Cancelar">
          <ArrowLeftIcon size={18} />
        </button>
        <span style={{ fontSize: 13 }}>{shots.length} fotos tomadas</span>
        <button
          className="btn btn-primary"
          style={{ minHeight: 36, padding: "0 12px", fontSize: 13 }}
          onClick={() => onDone(shots)}
          disabled={shots.length === 0}
        >
          Listo · usar {shots.length}
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {shots.length > 0 && (
        <div className="flex gap-2 overflow-x-auto p-2" style={{ background: "#141415" }}>
          {shots.map((s, i) => (
            <img key={i} src={s} alt={`Toma ${i + 1}`} style={{ width: 52, height: 52, objectFit: "cover", flexShrink: 0 }} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between p-4" style={{ color: "#fff" }}>
        <button onClick={undo} disabled={shots.length === 0} style={{ fontSize: 13, opacity: shots.length === 0 ? 0.4 : 1 }}>
          Deshacer
        </button>
        <button
          onClick={shoot}
          aria-label="Sacar foto"
          style={{
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: "var(--color-accent-600)",
            border: "4px solid #fff",
          }}
        />
        <span style={{ fontSize: 20, minWidth: 24, textAlign: "right" }}>{shots.length}</span>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
