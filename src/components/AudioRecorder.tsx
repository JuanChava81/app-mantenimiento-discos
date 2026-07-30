"use client";

import { useEffect, useRef, useState } from "react";
import { uploadToStorage } from "@/lib/storage";
import { supabaseConfigured } from "@/lib/supabase";
import { AudioNote } from "@/lib/types";
import { TrashIcon } from "./icons";

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Safari/iOS no soporta audio/webm (MediaRecorder ahí graba en audio/mp4).
// Forzar "audio/webm" en el Blob rompe la reproducción en esos dispositivos:
// hay que usar el mimeType real que usó el grabador.
function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) {
      return type;
    }
  }
  return undefined;
}

export function AudioRecorder({
  audios,
  equipmentId,
  onAdd,
  onRemove,
}: {
  audios: AudioNote[];
  equipmentId: string;
  onAdd: (audio: AudioNote) => void;
  onRemove: (id: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const usedMimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: usedMimeType });
        const durationSecs = (Date.now() - startRef.current) / 1000;

        let url = URL.createObjectURL(blob);
        if (supabaseConfigured) {
          const ext = usedMimeType.includes("mp4") ? "m4a" : usedMimeType.includes("aac") ? "aac" : "webm";
          const uploaded = await uploadToStorage("audios", equipmentId, blob, ext);
          if (uploaded) url = uploaded;
        }

        onAdd({
          id: `audio-${Date.now()}`,
          url,
          durationSecs,
          recordedAt: new Date().toISOString(),
        });
      };
      recorder.start();
      recorderRef.current = recorder;
      startRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startRef.current) / 1000);
      }, 250);
    } catch {
      setError("No se pudo acceder al micrófono. Revisá los permisos.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return (
    <div className="flex flex-col gap-2">
      <label style={{ fontSize: 12 }}>Nota de voz</label>

      {recording ? (
        <div
          className="flex items-center justify-between p-3"
          style={{ background: "var(--color-accent-900)", color: "#fff" }}
        >
          <span className="flex items-center gap-2" style={{ fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
            Grabando… {formatDuration(elapsed)}
          </span>
          <button className="btn btn-ghost" style={{ minHeight: 32, padding: "0 10px", color: "#fff", borderColor: "#fff" }} onClick={stop}>
            Detener
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-block" onClick={start}>
          Grabar nota de voz
        </button>
      )}

      {error && <p style={{ fontSize: 12, color: "var(--color-accent-700)" }}>{error}</p>}

      {audios.map((a, i) => (
        <div key={a.id} className="flex items-center gap-2 hairline-b" style={{ padding: "6px 0" }}>
          <span style={{ fontSize: 12, minWidth: 90 }}>
            Nota {i + 1} · {formatDuration(a.durationSecs)}
          </span>
          <audio controls src={a.url} style={{ flex: 1, height: 32 }} />
          <button aria-label="Eliminar nota" onClick={() => onRemove(a.id)}>
            <TrashIcon size={16} className="opacity-60" />
          </button>
        </div>
      ))}
    </div>
  );
}
