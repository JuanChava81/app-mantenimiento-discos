"use client";

import { useEffect, useRef, useState } from "react";

// Grabadora de audio de Herrería. Misma lógica que AudioRecorder de
// mantenimiento (mismo manejo de formatos de iPhone/Android), pero sin subir
// nada por su cuenta: le devuelve el audio a quien la usa, que lo guarda en
// el bucket "herreria" y lo manda a transcribir.

function formato(secs: number) {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;
}

// Safari/iOS no soporta audio/webm (MediaRecorder ahí graba en audio/mp4).
function elegirTipo(): string | undefined {
  const candidatos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  for (const t of candidatos) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return undefined;
}

function ahora() {
  return Date.now();
}

export function Grabadora({
  ocupado,
  onAudio,
}: {
  ocupado: boolean;
  onAudio: (audio: Blob, durationSecs: number) => void;
}) {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const grabadorRef = useRef<MediaRecorder | null>(null);
  const partesRef = useRef<Blob[]>([]);
  const inicioRef = useRef(0);
  const relojRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (relojRef.current) clearInterval(relojRef.current);
  }, []);

  async function empezar() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = elegirTipo();
      const grabador = tipo ? new MediaRecorder(stream, { mimeType: tipo }) : new MediaRecorder(stream);
      partesRef.current = [];
      grabador.ondataavailable = (e) => partesRef.current.push(e.data);
      grabador.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(partesRef.current, { type: grabador.mimeType || "audio/webm" });
        onAudio(blob, (ahora() - inicioRef.current) / 1000);
      };
      grabador.start();
      grabadorRef.current = grabador;
      inicioRef.current = ahora();
      setSegundos(0);
      setGrabando(true);
      relojRef.current = setInterval(() => setSegundos((ahora() - inicioRef.current) / 1000), 250);
    } catch {
      setError("No se pudo acceder al micrófono. Revisá los permisos.");
    }
  }

  function parar() {
    grabadorRef.current?.stop();
    setGrabando(false);
    if (relojRef.current) clearInterval(relojRef.current);
  }

  return (
    <div className="flex flex-col gap-2">
      {grabando ? (
        <div className="flex items-center justify-between p-3" style={{ background: "var(--color-danger)", color: "#fff" }}>
          <span style={{ fontSize: 13 }}>● Grabando… {formato(segundos)}</span>
          <button className="btn btn-ghost" style={{ minHeight: 32, padding: "0 10px", color: "#fff", borderColor: "#fff" }} onClick={parar}>
            Listo
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-block" onClick={empezar} disabled={ocupado}>
          {ocupado ? "Procesando audio…" : "🎙️ Grabar audio (qué es y cómo está)"}
        </button>
      )}
      {error && <p style={{ fontSize: 12, color: "var(--color-danger)" }}>{error}</p>}
    </div>
  );
}
