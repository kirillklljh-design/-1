import { authorizeWrite } from "../../../src/server";
import { serverSupabase } from "../../../src/supabase/server";
import { PHOTO_BUCKET } from "../../../src/supabase/config";
import { MAX_PHOTO_SIZE } from "../../../src/photo";
// The file is uploaded directly to Supabase, bypassing Vercel's 4.5 MB request limit.
export async function POST(request: Request) {
  const denied = await authorizeWrite(request);
  if (denied) return denied;
  try {
    const text = await request.text();
    if (text.length > 1024)
      return Response.json(
        { error: "Слишком большой запрос." },
        { status: 413 },
      );
    const { type, size } = JSON.parse(text);
    const extension = (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      } as Record<string, string>
    )[type];
    if (
      !extension ||
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > MAX_PHOTO_SIZE
    )
      return Response.json(
        { error: "Выберите JPG, PNG или WebP до 5 МБ." },
        { status: 400 },
      );
    const key = `${crypto.randomUUID()}.${extension}`;
    const db = await serverSupabase();
    const { data, error } = await db.storage
      .from(PHOTO_BUCKET)
      .createSignedUploadUrl(key);
    if (error || !data) throw error;
    return Response.json(
      { key, token: data.token },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Не удалось подготовить загрузку фото. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
