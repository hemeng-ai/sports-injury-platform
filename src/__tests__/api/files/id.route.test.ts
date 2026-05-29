/**
 * @jest-environment node
 *
 * 文件详情 API 测试 — GET/DELETE /api/files/[id]
 */

// ---- mock prisma ----
const mockFileFindUnique = jest.fn();
const mockFileUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    file: { findUnique: (...args: unknown[]) => mockFileFindUnique(...args), update: (...args: unknown[]) => mockFileUpdate(...args) },
  },
}));

// ---- mock rbac (跳过认证检查，返回 null = 通过) ----
jest.mock("@/lib/rbac", () => ({
  checkApiPermission: jest.fn().mockResolvedValue(null),
  canAccess: jest.fn().mockReturnValue(true),
  hasMinRole: jest.fn().mockReturnValue(true),
}));

// ---- mock upload (跳过文件删除) ----
jest.mock("@/lib/upload", () => ({
  removeFile: jest.fn().mockResolvedValue(undefined),
  getFilePath: jest.fn((p: string) => p),
  validateFileType: jest.fn().mockReturnValue(true),
  formatFileSize: jest.fn().mockReturnValue("1 MB"),
}));

// ---- mock next/server ----
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: (body: unknown, init?: { status?: number }) => {
        const r = new Response(JSON.stringify(body), { status: init?.status ?? 200, headers: { "Content-Type": "application/json" } });
        return r;
      },
    },
  };
});

let GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let DELETE: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/files/[id]/route");
  GET = mod.GET;
  DELETE = mod.DELETE;
});

beforeEach(() => { jest.clearAllMocks(); });

describe("GET /api/files/[id]", () => {
  it("VISITOR 可以访问", async () => {
    mockFileFindUnique.mockResolvedValue({ id: "f1", name: "test.pdf", deletedAt: null });
    const res = await GET(new Request("http://localhost/api/files/f1"), { params: Promise.resolve({ id: "f1" }) });
    expect(res.status).toBe(200);
  });

  it("返回完整文件信息", async () => {
    const file = { id: "f2", name: "report.pdf", originalName: "report.pdf", size: 1024, mimeType: "application/pdf", deletedAt: null };
    mockFileFindUnique.mockResolvedValue(file);
    const res = await GET(new Request("http://localhost/api/files/f2"), { params: Promise.resolve({ id: "f2" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("f2");
    expect(data.name).toBe("report.pdf");
  });

  it("文件不存在返回 404", async () => {
    mockFileFindUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/files/missing"), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("已删除文件返回 404", async () => {
    mockFileFindUnique.mockResolvedValue({ id: "f3", deletedAt: new Date() });
    const res = await GET(new Request("http://localhost/api/files/f3"), { params: Promise.resolve({ id: "f3" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/files/[id]", () => {
  it("ADMIN 删除成功", async () => {
    mockFileFindUnique.mockResolvedValue({ id: "f4", name: "old.pdf", deletedAt: null });
    mockFileUpdate.mockResolvedValue({ id: "f4", name: "old.pdf", deletedAt: new Date() });
    const res = await DELETE(new Request("http://localhost/api/files/f4"), { params: Promise.resolve({ id: "f4" }) });
    expect(res.status).toBe(200);
  });

  it("调用 prisma update 设置 deletedAt", async () => {
    mockFileFindUnique.mockResolvedValue({ id: "f5", name: "x.pdf", deletedAt: null });
    mockFileUpdate.mockResolvedValue({ id: "f5" });
    await DELETE(new Request("http://localhost/api/files/f5"), { params: Promise.resolve({ id: "f5" }) });
    expect(mockFileUpdate).toHaveBeenCalled();
  });
});
