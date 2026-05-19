// NextAuth 类型扩展 — 在 Session User 中添加 role 字段
import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
  }

  interface Session {
    user?: {
      id?: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
