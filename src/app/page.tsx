import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * 首页：根据认证状态决定跳转目标
 * - 已登录 → /dashboard
 * - 未登录 → /login
 */
export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
