import "server-only";
import { cache } from "react";
import { serverSupabase } from "./supabase/server";
import { PHOTO_BUCKET, supabaseConfig } from "./supabase/config";
import { seedMachines, type Machine } from "./rental";
import { sameOrigin } from "./request-security";
import { isReferencePhoto } from "./photo";

export const isOwner = cache(async () => {
  if (!supabaseConfig()) return false;
  try {
    const db = await serverSupabase();
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user) return false;
    const permission = await db.rpc("is_site_owner");
    return !permission.error && permission.data === true;
  } catch {
    return false;
  }
});
export async function authorizeWrite(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Недопустимый источник запроса." },
      { status: 403 },
    );
  if (!(await isOwner()))
    return Response.json(
      { error: "Нет доступа к управлению техникой." },
      { status: 403 },
    );
  return null;
}
type MachineRow = {
  id: string;
  name: string;
  description: string;
  rate: number;
  min_hours: number;
  image_key: string | null;
  visible: boolean;
  sort_order: number;
};
export function fromRow(row: MachineRow): Machine {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rate: Number(row.rate),
    minHours: row.min_hours,
    imageKey: row.image_key,
    visible: row.visible,
    sortOrder: row.sort_order,
  };
}
export function toRow(m: Omit<Machine, "id" | "sortOrder">) {
  return {
    name: m.name,
    description: m.description,
    rate: m.rate,
    min_hours: m.minHours,
    image_key: m.imageKey,
    visible: m.visible,
  };
}
export async function listMachines(all = false): Promise<Machine[]> {
  if (!supabaseConfig()) return all ? [] : seedMachines;
  const db = await serverSupabase();
  let query = db.from("machines").select("*").order("sort_order").order("id");
  if (!all) query = query.eq("visible", true);
  const { data, error } = await query;
  if (error) throw new Error("Не удалось загрузить технику.");
  return (data as MachineRow[]).map(fromRow);
}
export async function photoExists(key: string) {
  if (isReferencePhoto(key)) return true;
  const db = await serverSupabase();
  const { data, error } = await db.storage
    .from(PHOTO_BUCKET)
    .list("", { search: key, limit: 1 });
  return !error && data.some((file) => file.name === key);
}
