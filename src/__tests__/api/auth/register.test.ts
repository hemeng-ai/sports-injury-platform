/**
 * 注册 API 测试 — POST /api/auth/register
 */
// ---- mock 模块 ----
const mockUserFindUnique = jest.fn();
const mockUserCreate = jest.fn();
const mockBcryptHash = jest.fn();
let mockAuthResult: { user?: { id: string; role: string } } | null = null;

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
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  hash: (...args: unknown[]) => mockBcryptHash(...args),
}));

jest.mock("@/lib/auth", () => ({
  auth: () => mockAuthResult,
}));

let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/auth/register/route");
  POST = mod.POST;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthResult = null;
});

function buildRequest(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
  } as unknown as Request;
}

describe("POST /api/auth/register", () => {
  it("缺少 username 时返回 400", async () => {
    const res = await POST(buildRequest({ password: "test123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("缺少 password 时返回 400", async () => {
    const res = await POST(buildRequest({ username: "newuser" }));
    expect(res.status).toBe(400);
  });

  it("password 少于 6 位时返回 400", async () => {
    const res = await POST(buildRequest({ username: "newuser", password: "12345" }));
    expect(res.status).toBe(400);
  });

  it("用户名已存在时返回 409", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing", username: "existinguser" });
    const res = await POST(buildRequest({ username: "existinguser", password: "test123456" }));
    expect(res.status).toBe(409);
  });

  it("注册成功时返回 201 及用户信息（不含 password）", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("$2a$12$hashedpassword");
    mockUserCreate.mockResolvedValue({
      id: "new-user-1", username: "newuser", role: "VISITOR",
      createdAt: new Date("2025-06-01"), updatedAt: new Date("2025-06-01"),
    });

    const res = await POST(buildRequest({ username: "newuser", password: "secure123" }));
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.user).toBeDefined();
    expect(json.user.id).toBe("new-user-1");
    expect(json.user.username).toBe("newuser");
    expect(json.user.role).toBe("VISITOR");
    expect(json.user.password).toBeUndefined();
    expect(mockBcryptHash).toHaveBeenCalledWith("secure123", 12);
  });

  it("未提供 role 时默认创建 VISITOR", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("$2a$12$hashed");
    mockUserCreate.mockResolvedValue({
      id: "u2", username: "visitor1", role: "VISITOR",
      createdAt: new Date(), updatedAt: new Date(),
    });

    const res = await POST(buildRequest({ username: "visitor1", password: "secure123" }));
    expect(res.status).toBe(201);
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "VISITOR" }),
      })
    );
  });

  it("未认证用户注册时指定 role=ADMIN 应降级为 VISITOR", async () => {
    mockAuthResult = null;
    mockUserFindUnique.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("$2a$12$hashed");
    mockUserCreate.mockResolvedValue({
      id: "u3", username: "wannabe", role: "VISITOR",
      createdAt: new Date(), updatedAt: new Date(),
    });

    const res = await POST(buildRequest({
      username: "wannabe", password: "secure123", role: "ADMIN",
    }));
    expect(res.status).toBe(201);
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "VISITOR" }),
      })
    );
  });

  it("SuperAdmin 可创建 ADMIN 用户", async () => {
    mockAuthResult = { user: { id: "sa-1", role: "SUPERADMIN" } };
    mockUserFindUnique.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("$2a$12$hashed");
    mockUserCreate.mockResolvedValue({
      id: "u4", username: "newadmin", role: "ADMIN",
      createdAt: new Date(), updatedAt: new Date(),
    });

    const res = await POST(buildRequest({
      username: "newadmin", password: "secure123", role: "ADMIN",
    }));
    expect(res.status).toBe(201);
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "ADMIN" }),
      })
    );
  });

  it("请求体非合法 JSON 时返回 400", async () => {
    const badReq = {
      json: async () => { throw new Error("bad json"); },
    } as unknown as Request;
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });
});
