import { NextResponse } from "next/server";
import { sameOrigin } from "../../../../src/request-security";
import { serverSupabase } from "../../../../src/supabase/server";
import { supabaseConfig } from "../../../../src/supabase/config";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Недопустимый источник запроса." },
      { status: 403 },
    );
  if (supabaseConfig()) {
    const db = await serverSupabase();
    await db.auth.signOut();
  }
  const response = NextResponse.redirect(
    new URL("/owner/login", request.url),
    303,
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
