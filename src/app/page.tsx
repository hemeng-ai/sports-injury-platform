import { redirect } from "next/navigation";

/**
 * 首页：重定向到 Dashboard
 */
export default function Home() {
  redirect("/dashboard");
}
