import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

/**
 * 首页：根据认证状态决定跳转目标
 * - 已登录 → /dashboard
 * - 未登录 → /login
 */
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
