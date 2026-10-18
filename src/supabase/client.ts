"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
export function browserSupabase() {
  const config = supabaseConfig();
  if (!config) throw new Error("Хранилище ещё не подключено.");
  return createBrowserClient(config.url, config.key);
}
