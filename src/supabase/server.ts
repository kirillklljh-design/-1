import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { supabaseConfig } from "./config";
export const serverSupabase = cache(async () => {
  const config = supabaseConfig();
  if (!config) throw new Error("Хранилище ещё не подключено.");
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Server Components cannot write cookies. proxy.ts refreshes sessions. */
        }
      },
    },
  });
});
