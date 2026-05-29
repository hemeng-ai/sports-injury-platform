/**
 * @jest-environment node
 *
 * 文件列表 API 测试 — GET/POST /api/files
 */

jest.mock("@auth/core/jwt", () => ({
  decode: jest.fn().mockResolvedValue({ sub: "test-user-id" }),
}));

const mockFileFindMany = jest.fn();
const mockFileCreate = jest.fn();
const mockFileCount = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    file: {
      findMany: (...args: unknown[]) => mockFileFindMany(...args),
      create: (...args: unknown[]) => mockFileCreate(...args),
      count: (...args: unknown[]) => mockFileCount(...args),
    },
  },
}));

jest.mock("@/lib/rbac", () => ({
  checkApiPermission: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/upload", () => ({
  saveFile: jest.fn().mockResolvedValue({ path: "/uploads/test.pdf", originalName: "test.pdf", size: 1024, mimeType: "application/pdf" }),
  validateFileType: jest.fn().mockReturnValue(true),
}));

let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/files/route");
  GET = mod.GET;
  POST = mod.POST;
});

beforeEach(() => { jest.clearAllMocks(); mockFileCount.mockResolvedValue(0); });

describe("GET /api/files", () => {
  it("返回文件列表", async () => {
    mockFileFindMany.mockResolvedValue([{ id: "f1", name: "a.pdf" }]);
    const res = await GET(new Request("http://localhost/api/files"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.files).toHaveLength(1);
  });

  it("空列表返回空数组", async () => {
    mockFileFindMany.mockResolvedValue([]);
    const res = await GET(new Request("http://localhost/api/files"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.files).toEqual([]);
  });
});

describe("POST /api/files", () => {
  it("上传成功返回 201", async () => {
    mockFileCreate.mockResolvedValue({ id: "new", name: "test.pdf" });
    const form = new FormData();
    form.append("file", new Blob(["data"], { type: "application/pdf" }), "test.pdf");
    form.append("folderId", "folder-1");
    const res = await POST(new Request("http://localhost/api/files", { method: "POST", body: form }));
    expect(res.status).toBe(201);
  });
});
