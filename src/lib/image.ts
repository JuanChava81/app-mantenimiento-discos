/**
 * Redimensiona y recomprime una foto de cámara (a menudo 8-12MP, varios MB)
 * antes de subirla. En conexiones móviles esto es lo que más achica el
 * tiempo de subida; si algo falla, se devuelve el archivo original tal cual.
 */
export async function compressPhoto(
  file: Blob,
  maxDimension = 1600,
  quality = 0.8
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
