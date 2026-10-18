import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { ownerConfig } from "./owner-config";
import { getDb } from "../db";
import { machines, state } from "../db/schema";
import { asc, eq } from "drizzle-orm";
import { seedMachines } from "./rental";

export async function isOwner() {
  const user = await getChatGPTUser();
  return (
    !!user &&
    (user.email.toLowerCase() === ownerConfig.email.toLowerCase() ||
      (import.meta.env.DEV && user.userId === "local_seedy"))
  );
}
export async function authorizeWrite(request: Request) {
  if (!(await isOwner()))
    return Response.json(
      { error: "Нет доступа к управлению техникой." },
      { status: 403 },
    );
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Недопустимый источник запроса." },
      { status: 403 },
    );
  return null;
}
export async function listMachines() {
  const db = getDb();
  // Seed once as one atomic batch, including a marker: deleting all machines never restores the demo fleet.
  if (
    !(await db.select().from(state).where(eq(state.key, "seeded")).limit(1))
      .length
  ) {
    const statements = seedMachines.map((m) =>
      env
        .DB!.prepare(
          "INSERT OR IGNORE INTO machines (id,name,description,rate,min_hours,image_key,visible,sort_order) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM app_state WHERE key='seeded')",
        )
        .bind(
          m.id,
          m.name,
          m.description,
          m.rate,
          m.minHours,
          m.imageKey,
          1,
          m.sortOrder,
        ),
    );
    await env.DB!.batch([
      ...statements,
      env.DB!.prepare(
        "INSERT OR IGNORE INTO app_state (key) VALUES ('seeded')",
      ),
    ]);
  }
  return db
    .select()
    .from(machines)
    .orderBy(asc(machines.sortOrder), asc(machines.id));
}
