/**
 * Session 工具 — 从 Supabase 会话中提取用户信息
 */
import { createClient } from "@/lib/supabase-server";

/**
 * 从请求 cookie 中获取当前用户信息（用于 API Route）
 */
export async function getUserFromRequest(): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return {
      id: user.id,
      email: user.email || "",
      role: (user.app_metadata as Record<string, unknown>)?.role as string || "VISITOR",
    };
  } catch {
    return null;
  }
}
