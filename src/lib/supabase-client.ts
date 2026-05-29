"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase 浏览器客户端 — 用于 Client Component
 * 单例模式，避免重复创建
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return client;
}
