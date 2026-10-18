import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { machines } from "../../../db/schema";
import { authorizeWrite, isOwner, listMachines } from "../../../src/server";
import { validateMachine } from "../../../src/rental";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const all = new URL(request.url).searchParams.get("all") === "1";
    if (all && !(await isOwner()))
      return Response.json({ error: "Нет доступа." }, { status: 403 });
    const rows = await listMachines();
    return Response.json(all ? rows : rows.filter((m) => m.visible), {
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
  if (Number(request.headers.get("content-length") || 0) > 20000)
    return Response.json({ error: "Слишком большой запрос." }, { status: 413 });
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
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
  if (action !== "delete") {
    try {
      data = validateMachine(raw);
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  try {
    const rows = await listMachines();
    const existing = rows.find((m) => m.id === raw.id);
    if (action !== "create" && !existing)
      return Response.json(
        { error: "Карточка уже удалена. Обновите список." },
        { status: 404 },
      );
    if (data?.imageKey && !(await env.BUCKET!.head(data.imageKey)))
      return Response.json(
        { error: "Фото не найдено. Загрузите его повторно." },
        { status: 400 },
      );
    if (action === "delete")
      await getDb()
        .delete(machines)
        .where(eq(machines.id, raw.id as string));
    else if (action === "update")
      await getDb()
        .update(machines)
        .set(data!)
        .where(eq(machines.id, raw.id as string));
    else
      await getDb()
        .insert(machines)
        .values({
          ...data!,
          id: crypto.randomUUID(),
          sortOrder:
            rows.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1,
        });
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Не удалось сохранить изменения. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
