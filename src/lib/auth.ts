// NextAuth v5 配置（Credentials Provider + JWT）
// 此文件将在 Task 1.2 中完整实现

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        // 空字段 → code: "empty_fields"
        if (!credentials?.username || !credentials?.password) {
          const err = new CredentialsSignin("请输入用户名和密码");
          err.code = "empty_fields";
          throw err;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        // 用户不存在或密码错误 → code: "invalid_credentials"
        if (!user) {
          const err = new CredentialsSignin("用户名或密码不正确");
          err.code = "invalid_credentials";
          throw err;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          const err = new CredentialsSignin("用户名或密码不正确");
          err.code = "invalid_credentials";
          throw err;
        }

        return {
          id: user.id,
          name: user.username,
          role: user.role,
          passwordChangedAt: user.passwordChangedAt?.toISOString() || null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
        token.passwordChangedAt = (user as Record<string, unknown>).passwordChangedAt as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: string }).role = token.role as string;
        (session.user as { id: string }).id = token.id as string;
        (session.user as Record<string, unknown>).passwordChangedAt = token.passwordChangedAt;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET,
});
