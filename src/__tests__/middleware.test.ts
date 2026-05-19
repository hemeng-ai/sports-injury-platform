/**
 * @jest-environment node
 *
 * 路由守卫中间件测试 — src/middleware.ts
 *
 * Task 1.3 规格：
 * - 公开路由白名单：/login, /api/auth/*
 * - 静态资源放行：/_next/*, /favicon.ico, /public/*
 * - 未登录访问保护路由 → 重定向到 /login?callbackUrl=xxx
 * - 已登录访问 /login → 重定向到 /dashboard
 * - 角色路由守卫：/users 仅 SUPERADMIN, /settings 仅 ADMIN+
 * - API 路由保护：非公开 API 未登录返回 401 JSON
 * - API 路由权限不足返回 403 JSON
 */

// ---- mock jose/jwtVerify ----
const mockJwtVerify = jest.fn();

jest.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

// ---- spy NextResponse 方法 ----
const spyNext = jest.fn();
const spyRedirect = jest.fn();
const spyJson = jest.fn();

// 在 mock factory 内部使用 requireActual 避免 hoisting 问题
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      next: (...args: unknown[]) => {
        spyNext(...args);
        return actual.NextResponse.next(...args);
      },
      redirect: (...args: unknown[]) => {
        spyRedirect(...args);
        return actual.NextResponse.redirect(...args);
      },
      json: (...args: unknown[]) => {
        spyJson(...args);
        return actual.NextResponse.json(...args);
      },
    },
  };
});

let middleware: (req: unknown) => Promise<unknown>;

beforeAll(async () => {
  const mod = await import("@/middleware");
  middleware = mod.middleware;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ---- 辅助函数：创建模拟 NextRequest ----
interface MockRequestOptions {
  pathname: string;
  cookies?: Record<string, string>;
  url?: string;
}

function createMockRequest(options: MockRequestOptions) {
  const baseUrl = options.url || "https://example.com";
  const url = new URL(options.pathname, baseUrl);

  const cookies = new Map<string, { name: string; value: string }>();
  if (options.cookies) {
    for (const [key, value] of Object.entries(options.cookies)) {
      cookies.set(key, { name: key, value });
    }
  }

  return {
    nextUrl: url,
    url: url.toString(),
    cookies: {
      get: (name: string) => cookies.get(name),
    },
  };
}

// ===================================================================
// 公开路径放行
// ===================================================================
describe("路由守卫 — 公开路径放行", () => {
  it("/login 直接放行", async () => {
    const req = createMockRequest({ pathname: "/login" });
    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });

  it("/api/auth/login 直接放行", async () => {
    const req = createMockRequest({ pathname: "/api/auth/login" });
    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });

  it("/api/auth/register 直接放行", async () => {
    const req = createMockRequest({ pathname: "/api/auth/register" });
    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });

  it("/api/auth/callback/credentials 直接放行（通配匹配）", async () => {
    const req = createMockRequest({
      pathname: "/api/auth/callback/credentials",
    });
    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });

  it("/api/auth/session 直接放行（通配匹配）", async () => {
    const req = createMockRequest({ pathname: "/api/auth/session" });
    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });
});

// ===================================================================
// 静态资源放行
// ===================================================================
describe("路由守卫 — 静态资源放行", () => {
  it("/_next/static/... 放行", async () => {
    const req = createMockRequest({
      pathname: "/_next/static/chunks/main.js",
    });
    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });

  it("/_next/image 放行", async () => {
    const req = createMockRequest({ pathname: "/_next/image" });
    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });

  it("/favicon.ico 放行", async () => {
    const req = createMockRequest({ pathname: "/favicon.ico" });
    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });
});

// ===================================================================
// 未登录 → 重定向到 /login
// ===================================================================
describe("路由守卫 — 未登录重定向", () => {
  it("未登录访问 /dashboard → 重定向到 /login?callbackUrl=/dashboard", async () => {
    const req = createMockRequest({ pathname: "/dashboard" });
    await middleware(req);

    expect(spyRedirect).toHaveBeenCalled();
    const redirectArg = spyRedirect.mock.calls[0][0] as URL;
    const redirectUrl = redirectArg.toString();
    expect(redirectUrl).toContain("/login");
    expect(redirectUrl).toContain("callbackUrl=");
  });

  it("未登录访问 /files → 重定向到 /login", async () => {
    const req = createMockRequest({ pathname: "/files" });
    await middleware(req);
    expect(spyRedirect).toHaveBeenCalled();
    const redirectUrl = (spyRedirect.mock.calls[0][0] as URL).toString();
    expect(redirectUrl).toContain("/login");
  });

  it("未登录访问 /analysis → 重定向到 /login", async () => {
    const req = createMockRequest({ pathname: "/analysis" });
    await middleware(req);
    expect(spyRedirect).toHaveBeenCalled();
  });
});

// ===================================================================
// 已登录访问 /login → 重定向到 /dashboard
// ===================================================================
describe("路由守卫 — 已登录访问 /login 重定向", () => {
  it("已登录（带有效 token）访问 /login → 重定向到 /dashboard", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { role: "VISITOR", sub: "user-1" },
    });

    const req = createMockRequest({
      pathname: "/login",
      cookies: { "authjs.session-token": "valid-visitor-token" },
    });

    await middleware(req);
    expect(spyRedirect).toHaveBeenCalled();
    const redirectUrl = (spyRedirect.mock.calls[0][0] as URL).toString();
    expect(redirectUrl).toContain("/dashboard");
  });

  it("已登录 ADMIN 访问 /login → 重定向到 /dashboard", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { role: "ADMIN", sub: "user-2" },
    });

    const req = createMockRequest({
      pathname: "/login",
      cookies: { "authjs.session-token": "valid-admin-token" },
    });

    await middleware(req);
    expect(spyRedirect).toHaveBeenCalled();
    expect((spyRedirect.mock.calls[0][0] as URL).toString()).toContain(
      "/dashboard",
    );
  });
});

// ===================================================================
// 已登录 → 放行
// ===================================================================
describe("路由守卫 — 已登录放行", () => {
  it("已登录 VISITOR 访问 /dashboard → 放行", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { role: "VISITOR", sub: "user-1" },
    });

    const req = createMockRequest({
      pathname: "/dashboard",
      cookies: { "authjs.session-token": "valid-token" },
    });

    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });

  it("已登录 VISITOR 访问 /files → 放行", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { role: "VISITOR", sub: "user-1" },
    });

    const req = createMockRequest({
      pathname: "/files",
      cookies: { "authjs.session-token": "valid-token" },
    });

    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });
});

// ===================================================================
// 角色路由守卫
// ===================================================================
describe("路由守卫 — 角色路由守卫", () => {
  describe("/users — 仅 SUPERADMIN 可访问", () => {
    it("VISITOR 访问 /users → 重定向（权限不足）", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "VISITOR", sub: "user-1" },
      });

      const req = createMockRequest({
        pathname: "/users",
        cookies: { "authjs.session-token": "valid-visitor-token" },
      });

      await middleware(req);
      expect(spyRedirect).toHaveBeenCalled();
    });

    it("ADMIN 访问 /users → 重定向（权限不足）", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "ADMIN", sub: "user-2" },
      });

      const req = createMockRequest({
        pathname: "/users",
        cookies: { "authjs.session-token": "valid-admin-token" },
      });

      await middleware(req);
      expect(spyRedirect).toHaveBeenCalled();
    });

    it("SUPERADMIN 访问 /users → 放行", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "SUPERADMIN", sub: "user-3" },
      });

      const req = createMockRequest({
        pathname: "/users",
        cookies: { "authjs.session-token": "valid-superadmin-token" },
      });

      await middleware(req);
      expect(spyNext).toHaveBeenCalled();
    });
  });

  describe("/settings — 仅 ADMIN+ 可访问", () => {
    it("VISITOR 访问 /settings → 重定向（权限不足）", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "VISITOR", sub: "user-1" },
      });

      const req = createMockRequest({
        pathname: "/settings",
        cookies: { "authjs.session-token": "valid-visitor-token" },
      });

      await middleware(req);
      expect(spyRedirect).toHaveBeenCalled();
    });

    it("ADMIN 访问 /settings → 放行", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "ADMIN", sub: "user-2" },
      });

      const req = createMockRequest({
        pathname: "/settings",
        cookies: { "authjs.session-token": "valid-admin-token" },
      });

      await middleware(req);
      expect(spyNext).toHaveBeenCalled();
    });

    it("SUPERADMIN 访问 /settings → 放行", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "SUPERADMIN", sub: "user-3" },
      });

      const req = createMockRequest({
        pathname: "/settings",
        cookies: { "authjs.session-token": "valid-superadmin-token" },
      });

      await middleware(req);
      expect(spyNext).toHaveBeenCalled();
    });
  });
});

// ===================================================================
// API 路由保护
// ===================================================================
describe("路由守卫 — API 路由保护", () => {
  it("未登录访问 /api/protected/data → 返回 401 JSON", async () => {
    const req = createMockRequest({ pathname: "/api/protected/data" });

    await middleware(req);
    expect(spyJson).toHaveBeenCalled();
    const callArgs = spyJson.mock.calls[0];
    const init = callArgs[1] as { status?: number } | undefined;
    expect(init?.status).toBe(401);
    expect(spyRedirect).not.toHaveBeenCalled();
  });

  it("已登录 VISITOR 访问 /api/protected/data → 放行（无角色限制的通用 API）", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { role: "VISITOR", sub: "user-1" },
    });

    const req = createMockRequest({
      pathname: "/api/protected/data",
      cookies: { "authjs.session-token": "valid-visitor-token" },
    });

    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });

  it("VISITOR 访问 /api/admin/users → 返回 403 JSON（角色不足）", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { role: "VISITOR", sub: "user-1" },
    });

    const req = createMockRequest({
      pathname: "/api/admin/users",
      cookies: { "authjs.session-token": "valid-visitor-token" },
    });

    await middleware(req);
    expect(spyJson).toHaveBeenCalled();
    const callArgs = spyJson.mock.calls[0];
    const init = callArgs[1] as { status?: number } | undefined;
    expect(init?.status).toBe(403);
  });

  it("ADMIN 访问 /api/admin/users → 放行", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { role: "ADMIN", sub: "user-2" },
    });

    const req = createMockRequest({
      pathname: "/api/admin/users",
      cookies: { "authjs.session-token": "valid-admin-token" },
    });

    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });
});

// ===================================================================
// 边界条件
// ===================================================================
describe("路由守卫 — 边界条件", () => {
  it("cookie 中 token 存在但 JWT 验证失败 → 重定向到 /login", async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error("invalid signature"));

    const req = createMockRequest({
      pathname: "/dashboard",
      cookies: { "authjs.session-token": "malformed-token" },
    });

    await middleware(req);
    expect(spyRedirect).toHaveBeenCalled();
  });

  it("同时存在 authjs.session-token 和 __Secure-authjs.session-token，优先使用前者", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { role: "ADMIN", sub: "user-2" },
    });

    const req = createMockRequest({
      pathname: "/dashboard",
      cookies: {
        "authjs.session-token": "primary-valid-token",
        "__Secure-authjs.session-token": "secure-token",
      },
    });

    await middleware(req);
    expect(mockJwtVerify).toHaveBeenCalledWith(
      "primary-valid-token",
      expect.anything(),
    );
  });

  it("仅 __Secure- 前缀 cookie 存在时也可正常验证", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { role: "VISITOR", sub: "user-1" },
    });

    const req = createMockRequest({
      pathname: "/dashboard",
      cookies: {
        "__Secure-authjs.session-token": "secure-only-token",
      },
    });

    await middleware(req);
    expect(spyNext).toHaveBeenCalled();
  });

  it("根路径 / 未登录时重定向到 /login", async () => {
    const req = createMockRequest({ pathname: "/" });
    await middleware(req);
    expect(spyRedirect).toHaveBeenCalled();
  });
});
