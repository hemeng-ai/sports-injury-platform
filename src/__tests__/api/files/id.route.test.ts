/**
 * 文件详情 API 测试 — GET/DELETE /api/files/[id]
 *
 * @jest-environment node
 *
 * Task 1.5 规格：
 * - GET: 获取单个文件信息（所有登录用户）
 * - DELETE: 软删除（Admin+）
 */

// ---- mock prisma ----
const mockFileFindUnique = jest.fn();
const mockFileUpdate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    file: {
      findUnique: (...args: unknown[]) => mockFileFindUnique(...args),
      update: (...args: unknown[]) => mockFileUpdate(...args),
    },
  },
}));

// ---- mock next/server ----
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
      headers: new Headers(),
    }) as unknown as Response,
  },
}));

// ---- mock jose ----
const mockJwtVerify = jest.fn();

jest.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

let GET: (req: Request, ctx: { params: { id: string } }) => Promise<Response>;
let DELETE: (req: Request, ctx: { params: { id: string } }) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/files/[id]/route");
  GET = mod.GET;
  DELETE = mod.DELETE;
});

beforeEach(() => {
  jest.clearAllMocks();
});

/** 创建带认证的 Request */
function createRequest(role: string, url = "https://example.com/api/files/file-1"): Request {
  const headers = new Headers();
  headers.set(
    "cookie",
    `authjs.session-token=valid-${role.toLowerCase()}-token; Path=/; HttpOnly`,
  );

  return {
    method: "GET",
    headers,
    url,
    json: async () => ({}),
  } as unknown as Request;
}

/** 模拟 JWT 认证成功 */
function mockAuthSuccess(role = "ADMIN") {
  mockJwtVerify.mockResolvedValueOnce({
    payload: { role, sub: "user-1" },
  });
}

/** 完整的文件 mock 数据 */
const mockFileRecord = {
  id: "file-1",
  name: "uuid-test.pdf",
  originalName: "report.pdf",
  path: "/uploads/uuid-test.pdf",
  size: 2048,
  mimeType: "application/pdf",
  tags: '["important"]',
  folderId: "folder-1",
  uploadedBy: "user-1",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  deletedAt: null,
};

// ==================== GET /api/files/[id] 测试 ====================
describe("GET /api/files/[id] — 获取单个文件", () => {
  describe("认证", () => {
    it("无 cookie 返回 401", async () => {
      const req = {
        method: "GET",
        headers: new Headers(),
        url: "https://example.com/api/files/file-1",
      } as unknown as Request;

      const res = await GET(req, { params: { id: "file-1" } });
      expect(res.status).toBe(401);
    });

    it("VISITOR 可以访问", async () => {
      mockAuthSuccess("VISITOR");
      mockFileFindUnique.mockResolvedValueOnce(mockFileRecord);

      const req = createRequest("VISITOR");
      const res = await GET(req, { params: { id: "file-1" } });

      expect(res.status).toBe(200);
    });
  });

  describe("正常查询", () => {
    it("返回完整文件信息", async () => {
      mockAuthSuccess("ADMIN");
      mockFileFindUnique.mockResolvedValueOnce(mockFileRecord);

      const req = createRequest("ADMIN");
      const res = await GET(req, { params: { id: "file-1" } });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("file-1");
      expect(json.originalName).toBe("report.pdf");
      expect(json.mimeType).toBe("application/pdf");
      expect(json.size).toBe(2048);
      expect(json.folderId).toBe("folder-1");
    });
  });

  describe("错误处理", () => {
    it("文件不存在返回 404", async () => {
      mockAuthSuccess("ADMIN");
      mockFileFindUnique.mockResolvedValueOnce(null);

      const req = createRequest("ADMIN");
      const res = await GET(req, { params: { id: "nonexistent" } });

      expect(res.status).toBe(404);
    });

    it("已删除的文件（deletedAt 不为 null）返回 404", async () => {
      mockAuthSuccess("ADMIN");
      mockFileFindUnique.mockResolvedValueOnce({
        ...mockFileRecord,
        deletedAt: new Date("2025-01-15"),
      });

      const req = createRequest("ADMIN");
      const res = await GET(req, { params: { id: "file-1" } });

      expect(res.status).toBe(404);
    });
  });
});

// ==================== DELETE /api/files/[id] 测试 ====================
describe("DELETE /api/files/[id] — 软删除文件", () => {
  describe("权限控制", () => {
    it("VISITOR 删除返回 403", async () => {
      mockAuthSuccess("VISITOR");

      const req = createRequest("VISITOR");
      const res = await DELETE(req, { params: { id: "file-1" } });

      expect(res.status).toBe(403);
    });

    it("ADMIN 删除通过权限检查", async () => {
      mockAuthSuccess("ADMIN");
      mockFileFindUnique.mockResolvedValueOnce(mockFileRecord);
      mockFileUpdate.mockResolvedValueOnce({
        ...mockFileRecord,
        deletedAt: new Date(),
      });

      const req = createRequest("ADMIN");
      const res = await DELETE(req, { params: { id: "file-1" } });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("成功删除", () => {
    it("软删除成功返回 200 及成功消息", async () => {
      mockAuthSuccess("ADMIN");
      mockFileFindUnique.mockResolvedValueOnce(mockFileRecord);
      mockFileUpdate.mockResolvedValueOnce({
        ...mockFileRecord,
        deletedAt: new Date("2025-01-15"),
      });

      const req = createRequest("ADMIN");
      const res = await DELETE(req, { params: { id: "file-1" } });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBeDefined();
    });

    it("调用 prisma update 设置 deletedAt", async () => {
      mockAuthSuccess("ADMIN");
      mockFileFindUnique.mockResolvedValueOnce(mockFileRecord);
      mockFileUpdate.mockResolvedValueOnce({
        ...mockFileRecord,
        deletedAt: new Date("2025-01-15"),
      });

      const req = createRequest("ADMIN");
      await DELETE(req, { params: { id: "file-1" } });

      expect(mockFileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "file-1" },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe("错误处理", () => {
    it("文件不存在返回 404", async () => {
      mockAuthSuccess("ADMIN");
      mockFileFindUnique.mockResolvedValueOnce(null);

      const req = createRequest("ADMIN");
      const res = await DELETE(req, { params: { id: "nonexistent" } });

      expect(res.status).toBe(404);
    });

    it("文件已被删除返回 404", async () => {
      mockAuthSuccess("ADMIN");
      mockFileFindUnique.mockResolvedValueOnce({
        ...mockFileRecord,
        deletedAt: new Date("2025-01-10"),
      });

      const req = createRequest("ADMIN");
      const res = await DELETE(req, { params: { id: "file-1" } });

      expect(res.status).toBe(404);
    });
  });
});
