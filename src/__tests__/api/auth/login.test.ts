/**
 * 登录 API 测试 — POST /api/auth/login
 */
// ---- mock 模块（必须在所有 import 之前） ----
const mockUserFindUnique = jest.fn();
const mockBcryptCompare = jest.fn();

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => {
      return {
        status: init?.status ?? 200,
        json: async () => body,
      } as unknown as Response;
    },
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  compare: (...args: unknown[]) => mockBcryptCompare(...args),
}));

let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/auth/login/route");
  POST = mod.POST;
});

beforeEach(() => {
  jest.clearAllMocks();
});

/** 创建 mock Request：路由 handler 仅调用 .json() */
function buildRequest(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
  } as unknown as Request;
}

describe("POST /api/auth/login", () => {
  it("缺少 username 时返回 400", async () => {
    const res = await POST(buildRequest({ password: "test123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("缺少 password 时返回 400", async () => {
    const res = await POST(buildRequest({ username: "testuser" }));
    expect(res.status).toBe(400);
  });

  it("用户名不存在时返回 401", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const res = await POST(buildRequest({ username: "nobody", password: "test123" }));
    expect(res.status).toBe(401);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { username: "nobody" },
    });
  });

  it("密码错误时返回 401", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1", username: "testuser", password: "$2a$12$hashed",
      role: "VISITOR", createdAt: new Date(), updatedAt: new Date(),
    });
    mockBcryptCompare.mockResolvedValue(false);
    const res = await POST(buildRequest({ username: "testuser", password: "wrongpass" }));
    expect(res.status).toBe(401);
  });

  it("用户名和密码正确时返回 200 及用户信息（不含 password）", async () => {
    const mockUser = {
      id: "user-1", username: "testuser", password: "$2a$12$hashed",
      role: "VISITOR", createdAt: new Date("2025-01-01"), updatedAt: new Date("2025-01-01"),
    };
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockBcryptCompare.mockResolvedValue(true);

    const res = await POST(buildRequest({ username: "testuser", password: "correctpass" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.user).toBeDefined();
    expect(json.user.id).toBe("user-1");
    expect(json.user.username).toBe("testuser");
    expect(json.user.role).toBe("VISITOR");
    expect(json.user.password).toBeUndefined();
  });

  it("请求体不是合法 JSON 时返回 400", async () => {
    const badReq = {
      json: async () => { throw new Error("Invalid JSON"); },
    } as unknown as Request;
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });
});
