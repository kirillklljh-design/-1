import { supabaseConfig, PHOTO_BUCKET } from "../../../src/supabase/config";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(key))
    return new Response("Not found", { status: 404 });
  const config = supabaseConfig();
  if (!config) return new Response("Not found", { status: 404 });
  return Response.redirect(
    `${config.url}/storage/v1/object/public/${PHOTO_BUCKET}/${key}`,
    307,
  );
}
