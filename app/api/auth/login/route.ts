import { serverSupabase } from "../../../../src/supabase/server";
import { supabaseConfig } from "../../../../src/supabase/config";
import { sameOrigin } from "../../../../src/request-security";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Недопустимый источник запроса." },
      { status: 403 },
    );
  if (!supabaseConfig())
    return Response.json(
      { error: "Кабинет ещё не подключён." },
      { status: 503 },
    );
  try {
    const text = await request.text();
    if (text.length > 2048)
      return Response.json(
        { error: "Слишком большой запрос." },
        { status: 413 },
      );
    const { email, password } = JSON.parse(text);
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      return Response.json(
        { error: "Проверьте email и пароль." },
        { status: 400 },
      );
    const db = await serverSupabase();
    const { error } = await db.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error)
      return Response.json(
        {
          error:
            error.status === 429
              ? "Слишком много попыток. Попробуйте позже."
              : "Неверный email или пароль, либо доступ к кабинету не предоставлен.",
        },
        { status: error.status === 429 ? 429 : 401 },
      );
    const permission = await db.rpc("is_site_owner");
    if (permission.error || permission.data !== true) {
      await db.auth.signOut();
      return Response.json(
        {
          error:
            "Неверный email или пароль, либо доступ к кабинету не предоставлен.",
        },
        { status: 403 },
      );
    }
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Не удалось войти. Проверьте данные и попробуйте ещё раз." },
      { status: 400 },
    );
  }
}
