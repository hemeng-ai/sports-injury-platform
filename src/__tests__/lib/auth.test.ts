/**
 * Auth 配置测试 — src/lib/auth.ts
 *
 * 规格：
 * - 导出 auth, handlers, signIn, signOut
 * - 使用 Credentials Provider
 * - session 策略为 JWT
 * - JWT callback 将 role 嵌入 token
 * - session callback 将 role 从 token 传递到 session
 * - signIn 页面指向 /login
 */

// 记录 NextAuth 调用参数
let capturedConfig: Record<string, unknown> | null = null;

const mockHandlers = { GET: jest.fn(), POST: jest.fn() };
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockAuthFn = jest.fn();

// Mock next-auth: 捕获传给 NextAuth() 的 config，返回 mock 对象
jest.mock("next-auth", () => ({
  __esModule: true,
  default: (config: Record<string, unknown>) => {
    capturedConfig = config;
    return {
      handlers: mockHandlers,
      signIn: mockSignIn,
      signOut: mockSignOut,
      auth: mockAuthFn,
    };
  },
}));

jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: (config: Record<string, unknown>) => ({
    id: "credentials",
    type: "credentials",
    name: config.name || "credentials",
    credentials: config.credentials,
    authorize: config.authorize,
  }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

describe("NextAuth 配置 — src/lib/auth.ts", () => {
  beforeAll(async () => {
    // 触发模块加载
    await import("@/lib/auth");
  });

  it("调用 NextAuth 构造认证配置", () => {
    expect(capturedConfig).not.toBeNull();
  });

  it("导出 handlers", async () => {
    const authMod = await import("@/lib/auth");
    expect(authMod.handlers).toBeDefined();
  });

  it("导出 signIn", async () => {
    const authMod = await import("@/lib/auth");
    expect(authMod.signIn).toBeDefined();
    expect(typeof authMod.signIn).toBe("function");
  });

  it("导出 signOut", async () => {
    const authMod = await import("@/lib/auth");
    expect(authMod.signOut).toBeDefined();
    expect(typeof authMod.signOut).toBe("function");
  });

  it("导出 auth", async () => {
    const authMod = await import("@/lib/auth");
    expect(authMod.auth).toBeDefined();
    expect(typeof authMod.auth).toBe("function");
  });

  it("配置中包含 session.strategy = 'jwt'", () => {
    expect(capturedConfig!.session).toBeDefined();
    expect((capturedConfig!.session as Record<string, unknown>).strategy).toBe("jwt");
  });

  it("配置中包含 Credentials provider", () => {
    expect(capturedConfig!.providers).toBeDefined();
    expect((capturedConfig!.providers as Array<{ id: string }>).length).toBeGreaterThan(0);
    expect((capturedConfig!.providers as Array<{ id: string }>)[0].id).toBe("credentials");
  });

  it("配置中包含 JWT callback", () => {
    expect(capturedConfig!.callbacks).toBeDefined();
    const cb = capturedConfig!.callbacks as Record<string, (...args: unknown[]) => unknown>;
    expect(typeof cb.jwt).toBe("function");
  });

  it("JWT callback 将 user.role 写入 token", async () => {
    const cb = capturedConfig!.callbacks as Record<string, (...args: unknown[]) => unknown>;
    const token = { name: "test" };
    const user = { id: "u1", role: "ADMIN" };
    const result = (await cb.jwt({ token, user })) as Record<string, unknown>;
    expect(result.role).toBe("ADMIN");
    expect(result.id).toBe("u1");
  });

  it("session callback 将 token.role 写入 session.user", async () => {
    const cb = capturedConfig!.callbacks as Record<string, (...args: unknown[]) => unknown>;
    const session = { user: { name: "test" }, expires: "" };
    const token = { role: "VISITOR", id: "u2" };
    const result = (await cb.session({ session, token })) as {
      user: Record<string, unknown>;
    };
    expect(result.user.role).toBe("VISITOR");
    expect(result.user.id).toBe("u2");
  });

  it("signIn 页面指向 /login", () => {
    expect(capturedConfig!.pages).toBeDefined();
    expect((capturedConfig!.pages as Record<string, string>).signIn).toBe("/login");
  });
});
