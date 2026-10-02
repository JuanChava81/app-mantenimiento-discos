import { PROMPT_HERRERIA } from "@/herreria/prompt";

// Transcribe un audio (Whisper de Groq) y/o redacta descripción +
// recomendación de un punto de herrería. La llama la app Herrería.
// Necesita la variable GROQ_API_KEY en el proyecto de Vercel de la app.
//
// Entrada (multipart): audio (opcional), anterior (texto ya dicho del punto,
// opcional), texto (si no hay audio: el texto a redactar).
// Salida: { transcripcion, descripcion, recomendacion }.

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHISPER = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";
const CHAT = process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";

export const maxDuration = 60;

async function transcribir(audio: File): Promise<string> {
  const form = new FormData();
  form.append("file", audio, audio.name || "audio.webm");
  form.append("model", WHISPER);
  form.append("language", "es");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.text ?? "").trim();
}

async function redactar(texto: string) {
  const crudo = { descripcion: texto, recomendacion: "" };
  if (!texto) return crudo;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROMPT_HERRERIA },
          { role: "user", content: texto },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return crudo;
    const data = await res.json();
    const r = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    return {
      descripcion: typeof r.descripcion === "string" && r.descripcion.trim() ? r.descripcion.trim() : texto,
      recomendacion: typeof r.recomendacion === "string" ? r.recomendacion.trim() : "",
    };
  } catch {
    return crudo;
  }
}

export async function POST(request: Request) {
  if (!GROQ_API_KEY) {
    return Response.json({ error: "Falta GROQ_API_KEY en Vercel (proyecto de la app)" }, { status: 500 });
  }
  const form = await request.formData();
  const audio = form.get("audio");
  const anterior = String(form.get("anterior") ?? "").trim();
  const texto = form.get("texto");

  let transcripcion: string;
  if (audio instanceof File && audio.size > 0) {
    try {
      const nuevo = await transcribir(audio);
      transcripcion = [anterior, nuevo].filter(Boolean).join(" ");
    } catch (err) {
      return Response.json({ error: `No se pudo transcribir: ${(err as Error).message}` }, { status: 502 });
    }
  } else {
    transcripcion = String(texto ?? anterior).trim();
  }

  const { descripcion, recomendacion } = await redactar(transcripcion);
  return Response.json({ transcripcion, descripcion, recomendacion });
}
