/**
 * NextAuth Route Handler — /api/auth/[...nextauth]
 *
 * 将 auth 配置的 handlers 包装为 Next.js App Router 的 GET/POST handler
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
