/**
 * @jest-environment node
 *
 * 路由守卫中间件测试 — src/middleware.ts (Supabase Auth)
 */

const mockGetUser = jest.fn();

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// 不 mock 全局 Response，而是通过检查中间件返回的 Response 对象来验证

let middleware: (req: Record<string, unknown>) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/middleware");
  middleware = mod.middleware;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
});

function req(pathname: string, cookies?: Record<string, string>) {
  const u = new URL(pathname, "https://example.com");
  return {
    nextUrl: u,
    url: u.toString(),
    cookies: {
      getAll: () =>
        cookies
          ? Object.entries(cookies).map(([k, v]) => ({ name: k, value: v }))
          : [],
      set: jest.fn(),
    },
  };
}

describe("公开路径放行", () => {
  it("/login 放行 (无重定向)", async () => {
    const res = await middleware(req("/login"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("已登录访问 /login → 重定向到 /dashboard", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { role: "VISITOR" } } },
      error: null,
    });
    const res = await middleware(req("/login"));
    expect(res.headers.get("location")).toContain("/dashboard");
    expect([301,302,307,308]).toContain(res.status);
  });
});

describe("未登录重定向", () => {
  it("未登录访问 /dashboard → 重定向到 /login", async () => {
    const res = await middleware(req("/dashboard"));
    expect(res.headers.get("location")).toContain("/login");
  });
});

describe("角色守卫", () => {
  it("VISITOR 访问 /users → 重定向", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { role: "VISITOR" } } },
      error: null,
    });
    const res = await middleware(req("/users"));
    expect(res.headers.get("location")).toContain("/login");
  });

  it("SUPERADMIN 访问 /users → 放行", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { role: "SUPERADMIN" } } },
      error: null,
    });
    const res = await middleware(req("/users"));
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("API 路由保护", () => {
  it("未登录访问 API → 401", async () => {
    const res = await middleware(req("/api/protected/data"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("未登录");
  });

  it("VISITOR 访问 /api/admin/users → 403", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { role: "VISITOR" } } },
      error: null,
    });
    const res = await middleware(req("/api/admin/users"));
    expect(res.status).toBe(403);
  });

  it("ADMIN 访问 /api/admin/users → 放行", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { role: "ADMIN" } } },
      error: null,
    });
    const res = await middleware(req("/api/admin/users"));
    expect(res.status).not.toBe(403);
  });
});
