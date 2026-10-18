import { env } from "cloudflare:workers";
import { authorizeWrite } from "../../../src/server";
export async function POST(request: Request) {
  const denied = await authorizeWrite(request);
  if (denied) return denied;
  if (
    Number(request.headers.get("content-length") || 0) >
    5 * 1024 * 1024 + 8192
  )
    return Response.json(
      { error: "Фото должно быть не больше 5 МБ." },
      { status: 413 },
    );
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    )
      return Response.json(
        { error: "Выберите фото до 5 МБ." },
        { status: 400 },
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    let ext = "";
    if (
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff &&
      file.type === "image/jpeg"
    )
      ext = "jpg";
    if (
      bytes[0] === 137 &&
      bytes[1] === 80 &&
      bytes[2] === 78 &&
      bytes[3] === 71 &&
      bytes[4] === 13 &&
      bytes[5] === 10 &&
      bytes[6] === 26 &&
      bytes[7] === 10 &&
      file.type === "image/png"
    )
      ext = "png";
    if (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" &&
      file.type === "image/webp"
    )
      ext = "webp";
    if (!ext)
      return Response.json(
        { error: "Поддерживаются фотографии JPG, PNG и WebP." },
        { status: 400 },
      );
    const key = `${crypto.randomUUID()}.${ext}`;
    await env.BUCKET!.put(key, bytes, {
      httpMetadata: { contentType: file.type },
    });
    return Response.json({ key });
  } catch {
    return Response.json(
      { error: "Не удалось загрузить фото. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
