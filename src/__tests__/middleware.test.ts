/**
 * @jest-environment node
 *
 * 路由守卫中间件测试 — src/middleware.ts (Supabase Auth + IP 白名单)
 */

const mockGetUser = jest.fn();

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

let middleware: (req: Record<string, unknown>) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/middleware");
  middleware = mod.middleware;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  delete process.env.ALLOWED_ADMIN_IPS;
});

function req(
  pathname: string,
  opts?: { cookies?: Record<string, string>; headers?: Record<string, string> },
) {
  const u = new URL(pathname, "https://example.com");
  const headers = new Headers();
  if (opts?.headers) {
    for (const [k, v] of Object.entries(opts.headers)) {
      headers.set(k, v);
    }
  }
  return {
    nextUrl: u,
    url: u.toString(),
    headers,
    cookies: {
      getAll: () =>
        opts?.cookies
          ? Object.entries(opts.cookies).map(([k, v]) => ({ name: k, value: v }))
          : [],
      set: jest.fn(),
    },
  };
}

// ==================== 基础路由测试 ====================

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
    expect([301, 302, 307, 308]).toContain(res.status);
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

// ==================== IP 白名单测试 ====================

describe("IP 白名单 — 本地开发自动放行", () => {
  it("127.0.0.1 访问 /api/admin/users → 不受 IP 限制", async () => {
    process.env.ALLOWED_ADMIN_IPS = "203.0.113.1";
    mockGetUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { role: "ADMIN" } } },
      error: null,
    });
    const res = await middleware(
      req("/api/admin/users", { headers: { "x-forwarded-for": "127.0.0.1" } }),
    );
    expect(res.status).not.toBe(403);
  });

  it("未配置白名单 + 外部 IP → 403", async () => {
    const res = await middleware(
      req("/api/admin/users", { headers: { "x-forwarded-for": "203.0.113.99" } }),
    );
    expect(res.status).toBe(403);
  });
});

describe("IP 白名单 — 精确 IP 匹配", () => {
  it("白名单中的 IP 访问管理页面 → 放行", async () => {
    process.env.ALLOWED_ADMIN_IPS = "203.0.113.1";
    mockGetUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { role: "SUPERADMIN" } } },
      error: null,
    });
    const res = await middleware(
      req("/users", { headers: { "x-forwarded-for": "203.0.113.1" } }),
    );
    expect(res.headers.get("location")).toBeNull();
  });

  it("白名单外的 IP 访问管理页面 → 403", async () => {
    process.env.ALLOWED_ADMIN_IPS = "203.0.113.1";
    const res = await middleware(
      req("/users", { headers: { "x-forwarded-for": "198.51.100.5" } }),
    );
    expect(res.status).toBe(403);
  });

  it("白名单外的 IP 访问管理 API → 403", async () => {
    process.env.ALLOWED_ADMIN_IPS = "203.0.113.1";
    const res = await middleware(
      req("/api/admin/users", { headers: { "x-forwarded-for": "198.51.100.5" } }),
    );
    expect(res.status).toBe(403);
  });
});

describe("IP 白名单 — CIDR 子网匹配", () => {
  it("子网内 IP 放行", async () => {
    process.env.ALLOWED_ADMIN_IPS = "10.0.0.0/8";
    mockGetUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { role: "ADMIN" } } },
      error: null,
    });
    const res = await middleware(
      req("/api/admin/users", { headers: { "x-forwarded-for": "10.20.30.40" } }),
    );
    expect(res.status).not.toBe(403);
  });

  it("子网外 IP 拒绝", async () => {
    process.env.ALLOWED_ADMIN_IPS = "10.0.0.0/8";
    const res = await middleware(
      req("/api/admin/users", { headers: { "x-forwarded-for": "192.168.1.1" } }),
    );
    expect(res.status).toBe(403);
  });
});

describe("IP 白名单 — 非管理路由不受影响", () => {
  it("白名单外 IP 访问 /dashboard → 进入正常认证流程", async () => {
    process.env.ALLOWED_ADMIN_IPS = "203.0.113.1";
    const res = await middleware(
      req("/dashboard", { headers: { "x-forwarded-for": "198.51.100.5" } }),
    );
    expect(res.headers.get("location")).toContain("/login");
  });

  it("白名单外 IP 访问 /api/auth/login → 不受 IP 限制", async () => {
    process.env.ALLOWED_ADMIN_IPS = "203.0.113.1";
    const res = await middleware(
      req("/api/auth/login", { headers: { "x-forwarded-for": "198.51.100.5" } }),
    );
    expect(res.status).not.toBe(403);
  });
});

describe("IP 白名单 — 多个 IP + CIDR", () => {
  it("逗号分隔多个条目，匹配第二个", async () => {
    process.env.ALLOWED_ADMIN_IPS = "203.0.113.1, 10.0.0.0/8";
    mockGetUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { role: "ADMIN" } } },
      error: null,
    });
    const res = await middleware(
      req("/api/admin/users", { headers: { "x-forwarded-for": "10.5.5.5" } }),
    );
    expect(res.status).not.toBe(403);
  });

  it("逗号分隔，IP 不在任何条目中 → 403", async () => {
    process.env.ALLOWED_ADMIN_IPS = "203.0.113.1, 10.0.0.0/8";
    const res = await middleware(
      req("/api/admin/users", { headers: { "x-forwarded-for": "192.168.1.1" } }),
    );
    expect(res.status).toBe(403);
  });
});