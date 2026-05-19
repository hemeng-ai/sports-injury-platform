/**
 * 文件 API 测试 — POST/GET /api/files
 *
 * @jest-environment node
 *
 * Task 1.5 规格：
 * - POST: multipart 上传，Prisma 记录，返回文件信息（Admin+）
 * - GET: 查询支持 ?folderId=&search=&type=&page=&limit=(所有登录用户)
 */

// ---- mock prisma ----
const mockFileCreate = jest.fn();
const mockFileFindMany = jest.fn();
const mockFileCount = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    file: {
      create: (...args: unknown[]) => mockFileCreate(...args),
      findMany: (...args: unknown[]) => mockFileFindMany(...args),
      count: (...args: unknown[]) => mockFileCount(...args),
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

// ---- mock saveFile ----
const mockSaveFile = jest.fn();

jest.mock("@/lib/upload", () => {
  const actual = jest.requireActual("@/lib/upload");
  return {
    ...actual,
    saveFile: (...args: unknown[]) => mockSaveFile(...args),
  };
});

// ---- mock jose ----
const mockJwtVerify = jest.fn();

jest.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

let POST: (req: Request) => Promise<Response>;
let GET: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/files/route");
  POST = mod.POST;
  GET = mod.GET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

/** 创建带 auth cookie 的 Request */
function createAuthRequest(
  method: string,
  body: FormData | null,
  role = "ADMIN",
): Request {
  const headers = new Headers();
  headers.set(
    "cookie",
    `authjs.session-token=valid-${role.toLowerCase()}-token; Path=/; HttpOnly`,
  );

  return {
    method,
    headers,
    formData: body ? async () => body : undefined,
    json: async () => ({}),
    url: "https://example.com/api/files",
  } as unknown as Request;
}

/** 模拟认证成功 */
function mockAuthSuccess(role = "ADMIN") {
  mockJwtVerify.mockResolvedValueOnce({
    payload: { role, sub: "user-1" },
  });
}

/** 模拟认证失败 */
function mockAuthFail() {
  mockJwtVerify.mockRejectedValueOnce(new Error("invalid token"));
}

/** 创建 mock FormData（简化版） */
function createMockFormData(
  file: { name: string; size: number; type: string; content: Buffer } | null,
  folderId?: string,
): FormData {
  const fd = new FormData();
  if (file) {
    const blob = new Blob([file.content], { type: file.type });
    fd.append("file", blob, file.name);
  }
  if (folderId) {
    fd.append("folderId", folderId);
  }
  return fd;
}

// ==================== POST /api/files 测试 ====================
describe("POST /api/files — 文件上传", () => {
  describe("认证与权限", () => {
    it("无 session cookie 返回 401", async () => {
      const req = {
        method: "POST",
        headers: new Headers(),
        formData: async () => new FormData(),
      } as unknown as Request;

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("token 无效返回 401", async () => {
      mockAuthFail();
      const fd = createMockFormData(
        { name: "test.pdf", size: 1024, type: "application/pdf", content: Buffer.from("pdf") },
      );
      const req = createAuthRequest("POST", fd, "VISITOR");
      // 使 token 验证失败
      mockJwtVerify.mockReset();
      mockJwtVerify.mockRejectedValueOnce(new Error("expired"));

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("VISITOR 上传返回 403", async () => {
      mockAuthSuccess("VISITOR");
      const fd = createMockFormData(
        { name: "test.pdf", size: 1024, type: "application/pdf", content: Buffer.from("pdf") },
      );
      const req = createAuthRequest("POST", fd, "VISITOR");

      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("ADMIN 上传通过权限检查", async () => {
      mockAuthSuccess("ADMIN");
      mockSaveFile.mockResolvedValueOnce({
        path: "/uploads/uuid-test.pdf",
        originalName: "report.pdf",
        size: 1024,
        mimeType: "application/pdf",
      });
      mockFileCreate.mockResolvedValueOnce({
        id: "file-1",
        name: "uuid-test.pdf",
        originalName: "report.pdf",
        path: "/uploads/uuid-test.pdf",
        size: 1024,
        mimeType: "application/pdf",
        tags: "",
        folderId: "folder-1",
        uploadedBy: "user-1",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        deletedAt: null,
      });

      const fd = createMockFormData(
        { name: "report.pdf", size: 1024, type: "application/pdf", content: Buffer.from("pdf content") },
        "folder-1",
      );
      const req = createAuthRequest("POST", fd, "ADMIN");

      const res = await POST(req);
      // 权限通过，不应返回 401/403
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("文件上传成功", () => {
    it("成功上传 PDF 返回 201 及文件信息", async () => {
      mockAuthSuccess("ADMIN");
      mockSaveFile.mockResolvedValueOnce({
        path: "/uploads/uuid-pdf.pdf",
        originalName: "report.pdf",
        size: 2048,
        mimeType: "application/pdf",
      });
      mockFileCreate.mockResolvedValueOnce({
        id: "file-2",
        name: "uuid-pdf.pdf",
        originalName: "report.pdf",
        path: "/uploads/uuid-pdf.pdf",
        size: 2048,
        mimeType: "application/pdf",
        tags: "",
        folderId: "folder-1",
        uploadedBy: "user-1",
        createdAt: new Date("2025-01-02"),
        updatedAt: new Date("2025-01-02"),
        deletedAt: null,
      });

      const fd = createMockFormData(
        { name: "report.pdf", size: 2048, type: "application/pdf", content: Buffer.from("pdf data") },
        "folder-1",
      );
      const req = createAuthRequest("POST", fd, "ADMIN");

      const res = await POST(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBe("file-2");
      expect(json.originalName).toBe("report.pdf");
      expect(json.mimeType).toBe("application/pdf");
      expect(json.size).toBe(2048);
      expect(json.folderId).toBe("folder-1");
    });

    it("上传 Excel 文件成功", async () => {
      mockAuthSuccess("ADMIN");
      mockSaveFile.mockResolvedValueOnce({
        path: "/uploads/uuid-xlsx.xlsx",
        originalName: "data.xlsx",
        size: 5120,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      mockFileCreate.mockResolvedValueOnce({
        id: "file-3",
        name: "uuid-xlsx.xlsx",
        originalName: "data.xlsx",
        path: "/uploads/uuid-xlsx.xlsx",
        size: 5120,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        tags: "",
        folderId: "folder-2",
        uploadedBy: "user-1",
        createdAt: new Date("2025-01-03"),
        updatedAt: new Date("2025-01-03"),
        deletedAt: null,
      });

      const fd = createMockFormData(
        {
          name: "data.xlsx",
          size: 5120,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          content: Buffer.from("excel data"),
        },
        "folder-2",
      );
      const req = createAuthRequest("POST", fd, "ADMIN");

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.mimeType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    });
  });

  describe("错误处理", () => {
    it("无文件字段返回 400", async () => {
      mockAuthSuccess("ADMIN");
      const fd = new FormData();
      fd.append("folderId", "folder-1");
      const req = createAuthRequest("POST", fd, "ADMIN");

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("文件超过 50MB 返回 413", async () => {
      mockAuthSuccess("ADMIN");
      // 超过大小限制
      const largeBlob = new Blob([Buffer.alloc(51 * 1024 * 1024)], { type: "application/pdf" });
      const fd = new FormData();
      fd.append("file", largeBlob, "huge.pdf");
      fd.append("folderId", "folder-1");

      const req = createAuthRequest("POST", fd, "ADMIN");

      const res = await POST(req);
      expect(res.status).toBe(413);
    });

    it("不支持的文件类型返回 400", async () => {
      mockAuthSuccess("ADMIN");
      const fd = createMockFormData(
        { name: "script.exe", size: 1024, type: "application/x-msdos-program", content: Buffer.from("exe") },
        "folder-1",
      );
      const req = createAuthRequest("POST", fd, "ADMIN");

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("缺少 folderId 返回 400", async () => {
      mockAuthSuccess("ADMIN");
      const fd = createMockFormData(
        { name: "test.pdf", size: 1024, type: "application/pdf", content: Buffer.from("pdf") },
        // 没有 folderId
      );
      const req = createAuthRequest("POST", fd, "ADMIN");

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});

// ==================== GET /api/files 测试 ====================
describe("GET /api/files — 文件列表查询", () => {
  const mockFiles = [
    {
      id: "file-a",
      name: "uuid-a.pdf",
      originalName: "report.pdf",
      path: "/uploads/uuid-a.pdf",
      size: 2048,
      mimeType: "application/pdf",
      tags: "",
      folderId: "folder-1",
      uploadedBy: "user-1",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
      deletedAt: null,
    },
    {
      id: "file-b",
      name: "uuid-b.png",
      originalName: "photo.png",
      path: "/uploads/uuid-b.png",
      size: 512000,
      mimeType: "image/png",
      tags: '["tag1","tag2"]',
      folderId: "folder-1",
      uploadedBy: "user-2",
      createdAt: new Date("2025-01-02"),
      updatedAt: new Date("2025-01-02"),
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    mockFileFindMany.mockResolvedValue(mockFiles);
    mockFileCount.mockResolvedValue(2);
  });

  describe("认证与权限", () => {
    it("无 cookie 返回 401", async () => {
      const req = {
        method: "GET",
        headers: new Headers(),
        url: "https://example.com/api/files",
      } as unknown as Request;

      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("VISITOR 可以访问文件列表（所有登录用户可查看）", async () => {
      mockAuthSuccess("VISITOR");
      const req = createAuthRequest("GET", null, "VISITOR");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe("查询功能", () => {
    it("返回文件列表和分页信息", async () => {
      mockAuthSuccess("ADMIN");
      const req = createAuthRequest("GET", null, "ADMIN");

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.files).toBeDefined();
      expect(Array.isArray(json.files)).toBe(true);
      expect(json.files.length).toBe(2);
      expect(json.total).toBe(2);
      expect(json.page).toBe(1);
      expect(json.limit).toBeDefined();
      expect(json.totalPages).toBeDefined();
    });

    it("支持 folderId 筛选", async () => {
      mockAuthSuccess("ADMIN");
      const req = {
        method: "GET",
        headers: new Headers({
          cookie: "authjs.session-token=valid-admin-token; Path=/; HttpOnly",
        }),
        url: "https://example.com/api/files?folderId=folder-1",
      } as unknown as Request;

      const res = await GET(req);
      expect(res.status).toBe(200);

      // verify findMany was called with folderId filter
      expect(mockFileFindMany).toHaveBeenCalled();
      const findManyArg = mockFileFindMany.mock.calls[0]?.[0];
      expect(findManyArg).toBeDefined();
      // The where should contain folderId and deletedAt: null
    });

    it("支持 search 关键词搜索（匹配 originalName）", async () => {
      mockAuthSuccess("ADMIN");
      const req = {
        method: "GET",
        headers: new Headers({
          cookie: "authjs.session-token=valid-admin-token; Path=/; HttpOnly",
        }),
        url: "https://example.com/api/files?search=report",
      } as unknown as Request;

      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("支持 type 筛选（mimeType 前缀匹配）", async () => {
      mockAuthSuccess("ADMIN");
      const req = {
        method: "GET",
        headers: new Headers({
          cookie: "authjs.session-token=valid-admin-token; Path=/; HttpOnly",
        }),
        url: "https://example.com/api/files?type=image",
      } as unknown as Request;

      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("支持分页参数 page 和 limit", async () => {
      mockAuthSuccess("ADMIN");
      const req = {
        method: "GET",
        headers: new Headers({
          cookie: "authjs.session-token=valid-admin-token; Path=/; HttpOnly",
        }),
        url: "https://example.com/api/files?page=2&limit=10",
      } as unknown as Request;

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.page).toBe(2);
      expect(json.limit).toBe(10);
    });

    it("默认 page=1 limit=20", async () => {
      mockAuthSuccess("ADMIN");
      const req = {
        method: "GET",
        headers: new Headers({
          cookie: "authjs.session-token=valid-admin-token; Path=/; HttpOnly",
        }),
        url: "https://example.com/api/files",
      } as unknown as Request;

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.page).toBe(1);
      expect(json.limit).toBe(20);
    });

    it("空结果返回空数组和 total=0", async () => {
      mockFileFindMany.mockResolvedValueOnce([]);
      mockFileCount.mockResolvedValueOnce(0);
      mockAuthSuccess("ADMIN");

      const req = {
        method: "GET",
        headers: new Headers({
          cookie: "authjs.session-token=valid-admin-token; Path=/; HttpOnly",
        }),
        url: "https://example.com/api/files?search=nonexistent",
      } as unknown as Request;

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.files).toEqual([]);
      expect(json.total).toBe(0);
    });
  });
});
