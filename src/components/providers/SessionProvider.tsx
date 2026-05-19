"use client";

/**
 * SessionProvider — NextAuth Session 提供者
 * 包裹在根布局中，使客户端组件可以通过 useSession() 获取登录状态
 */
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
