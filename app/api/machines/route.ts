import {
  authorizeWrite,
  isOwner,
  listMachines,
  photoExists,
  toRow,
} from "../../../src/server";
import { serverSupabase } from "../../../src/supabase/server";
import { validateMachine } from "../../../src/rental";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const all = new URL(request.url).searchParams.get("all") === "1";
    if (all && !(await isOwner()))
      return Response.json({ error: "Нет доступа." }, { status: 403 });
    return Response.json(await listMachines(all), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Не удалось загрузить технику. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  return mutate(request, "create");
}
export async function PUT(request: Request) {
  return mutate(request, "update");
}
export async function DELETE(request: Request) {
  return mutate(request, "delete");
}
async function mutate(request: Request, action: string) {
  const denied = await authorizeWrite(request);
  if (denied) return denied;
  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 20000)
      return Response.json(
        { error: "Слишком большой запрос." },
        { status: 413 },
      );
    raw = JSON.parse(text);
  } catch {
    return Response.json({ error: "Некорректный JSON." }, { status: 400 });
  }
  if (!raw || typeof raw !== "object")
    return Response.json({ error: "Некорректная карточка." }, { status: 400 });
  if (
    action !== "create" &&
    (typeof raw.id !== "string" || !/^[\w-]{1,80}$/.test(raw.id))
  )
    return Response.json(
      { error: "Некорректный идентификатор." },
      { status: 400 },
    );
  let data;
  if (action !== "delete")
    try {
      data = validateMachine(raw);
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  try {
    const db = await serverSupabase();
    if (data?.imageKey && !(await photoExists(data.imageKey)))
      return Response.json(
        { error: "Фото не найдено. Загрузите его повторно." },
        { status: 400 },
      );
    if (action === "create") {
      const { error } = await db
        .from("machines")
        .insert({ ...toRow(data!), id: crypto.randomUUID() });
      if (error) throw error;
    } else {
      const query =
        action === "delete"
          ? db.from("machines").delete()
          : db.from("machines").update(toRow(data!));
      const { data: changed, error } = await query
        .eq("id", raw.id as string)
        .select("id");
      if (error) throw error;
      if (!changed?.length)
        return Response.json(
          { error: "Карточка уже удалена. Обновите список." },
          { status: 404 },
        );
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Не удалось сохранить изменения. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
