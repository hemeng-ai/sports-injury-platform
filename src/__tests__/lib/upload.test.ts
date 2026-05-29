/**
 * upload 工具函数测试 — src/lib/upload.ts
 *
 * @jest-environment node
 *
 * Task 1.5 规格：
 * - validateFileType(mimeType): boolean — Word/Excel/PDF/图片 白名单校验
 * - formatFileSize(bytes): string — 文件大小格式化（B/KB/MB/GB）
 * - generateUniqueFilename(originalName): string — UUID + 扩展名
 * - saveFile(file): { path, originalName, size, mimeType } — 保存文件到 uploads/
 * - ALLOWED_MIME_TYPES — 允许的 MIME 类型常量
 * - MAX_FILE_SIZE — 50MB 常量
 *
 * 测试原则：纯函数直接测，saveFile mock 文件系统。
 */

// ---- mock supabase-storage ----
jest.mock("@/lib/supabase-storage", () => ({
  uploadToSupabase: jest.fn().mockImplementation((_buf, fileName) =>
    Promise.resolve("/uploads/" + fileName)
  ),
  deleteFromSupabase: jest.fn().mockResolvedValue(undefined),
  extractFilePathFromUrl: jest.fn((url) => url.replace("/uploads/", "")),
}));

// ---- mock fs/promises ----
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();

jest.mock("fs/promises", () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

// ---- mock uuid ----
const mockUuid = jest.fn();
jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

// ---- mock path (只 mock extname/join，其他保持原样) ----
jest.mock("path", () => {
  const actualPath = jest.requireActual("path");
  return {
    ...actualPath,
  };
});

let validateFileType: (mimeType: string) => boolean;
let formatFileSize: (bytes: number) => string;
let generateUniqueFilename: (originalName: string) => string;
let saveFile: (file: File) => Promise<{
  path: string;
  originalName: string;
  size: number;
  mimeType: string;
}>;
let ALLOWED_MIME_TYPES: string[];
let MAX_FILE_SIZE: number;

beforeAll(async () => {
  const mod = await import("@/lib/upload");
  validateFileType = mod.validateFileType;
  formatFileSize = mod.formatFileSize;
  generateUniqueFilename = mod.generateUniqueFilename;
  saveFile = mod.saveFile;
  ALLOWED_MIME_TYPES = mod.ALLOWED_MIME_TYPES;
  MAX_FILE_SIZE = mod.MAX_FILE_SIZE;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUuid.mockReturnValue("test-uuid-1234");
});

// ===================================================================
// ALLOWED_MIME_TYPES 常量
// ===================================================================
describe("ALLOWED_MIME_TYPES — 允许的文件类型常量", () => {
  it("包含 Word 文档类型（doc/docx）", () => {
    expect(ALLOWED_MIME_TYPES).toContain("application/msword");
    expect(ALLOWED_MIME_TYPES).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });

  it("包含 Excel 文档类型（xls/xlsx）", () => {
    expect(ALLOWED_MIME_TYPES).toContain("application/vnd.ms-excel");
    expect(ALLOWED_MIME_TYPES).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("包含 PDF 类型", () => {
    expect(ALLOWED_MIME_TYPES).toContain("application/pdf");
  });

  it("包含图片类型（jpg/jpeg/png/webp）", () => {
    expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
    expect(ALLOWED_MIME_TYPES).toContain("image/png");
    expect(ALLOWED_MIME_TYPES).toContain("image/webp");
  });

  it("不包含 gif（不在规格要求内）", () => {
    expect(ALLOWED_MIME_TYPES).not.toContain("image/gif");
  });

  it("不包含 text/plain（不在规格要求内）", () => {
    expect(ALLOWED_MIME_TYPES).not.toContain("text/plain");
  });

  it("不包含 video/mp4（不在规格要求内）", () => {
    expect(ALLOWED_MIME_TYPES).not.toContain("video/mp4");
  });
});

// ===================================================================
// validateFileType 测试
// ===================================================================
describe("validateFileType — 文件类型校验", () => {
  describe("允许的文件类型", () => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    it.each(allowedTypes)("允许 %s", (mimeType) => {
      expect(validateFileType(mimeType)).toBe(true);
    });
  });

  describe("不允许的文件类型", () => {
    it("拒绝可执行文件", () => {
      expect(validateFileType("application/x-msdos-program")).toBe(false);
    });

    it("拒绝 HTML 文件", () => {
      expect(validateFileType("text/html")).toBe(false);
    });

    it("拒绝 ZIP 压缩包", () => {
      expect(validateFileType("application/zip")).toBe(false);
    });

    it("拒绝 SVG 图片（不在规格内，可能含脚本）", () => {
      expect(validateFileType("image/svg+xml")).toBe(false);
    });

    it("拒绝 GIF 图片", () => {
      expect(validateFileType("image/gif")).toBe(false);
    });
  });

  describe("边界条件", () => {
    it("空字符串返回 false", () => {
      expect(validateFileType("")).toBe(false);
    });

    it("null/undefined 安全处理（运行时不应传入）", () => {
      // 这些调用不应崩溃
      expect(() => validateFileType(null as unknown as string)).not.toThrow();
      expect(() => validateFileType(undefined as unknown as string)).not.toThrow();
    });

    it("大小写敏感 — 大写应拒绝", () => {
      expect(validateFileType("APPLICATION/PDF")).toBe(false);
    });

    it("image/jpg 不是标准 MIME 但常见，应被允许", () => {
      // image/jpg 实际上浏览器也会用，应额外放行
      expect(validateFileType("image/jpg")).toBe(true);
    });
  });
});

// ===================================================================
// formatFileSize 测试
// ===================================================================
describe("formatFileSize — 文件大小格式化", () => {
  describe("正常格式化", () => {
    it("0 bytes → '0 B'", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("512 bytes → '512 B'", () => {
      expect(formatFileSize(512)).toBe("512 B");
    });

    it("1024 bytes → '1.0 KB'", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
    });

    it("1536 bytes → '1.5 KB'", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("1048576 bytes (1MB) → '1.0 MB'", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
    });

    it("2621440 bytes (2.5MB) → '2.5 MB'", () => {
      expect(formatFileSize(2621440)).toBe("2.5 MB");
    });

    it("1073741824 bytes (1GB) → '1.0 GB'", () => {
      expect(formatFileSize(1073741824)).toBe("1.0 GB");
    });

    it("50MB (52428800 bytes) → '50.0 MB'", () => {
      expect(formatFileSize(52428800)).toBe("50.0 MB");
    });
  });

  describe("边界条件", () => {
    it("负数 bytes → 返回 '0 B'（安全回退）", () => {
      expect(formatFileSize(-1)).toBe("0 B");
    });

    it("小数 bytes（向上取整或截断）", () => {
      const result = formatFileSize(1.5);
      // 应至少返回合法格式字符串
      expect(result).toMatch(/^[\d.]+ [BKM]B?$/);
    });
  });
});

// ===================================================================
// generateUniqueFilename 测试
// ===================================================================
describe("generateUniqueFilename — 生成唯一文件名", () => {
  it("保留原始文件的扩展名", () => {
    mockUuid.mockReturnValue("abc-123");
    const result = generateUniqueFilename("report.pdf");
    expect(result).toBe("abc-123.pdf");
  });

  it("处理 .docx 扩展名", () => {
    mockUuid.mockReturnValue("xyz-789");
    const result = generateUniqueFilename("document.docx");
    expect(result).toBe("xyz-789.docx");
  });

  it("处理 .xlsx 扩展名", () => {
    mockUuid.mockReturnValue("uuid-456");
    const result = generateUniqueFilename("spreadsheet.xlsx");
    expect(result).toBe("uuid-456.xlsx");
  });

  it("处理 .jpeg 扩展名", () => {
    mockUuid.mockReturnValue("img-001");
    const result = generateUniqueFilename("photo.jpeg");
    expect(result).toBe("img-001.jpeg");
  });

  it("处理文件名中包含多个点的情况", () => {
    mockUuid.mockReturnValue("multi-dot");
    const result = generateUniqueFilename("my.report.v2.pdf");
    expect(result).toBe("multi-dot.pdf");
  });

  it("处理没有扩展名的文件", () => {
    mockUuid.mockReturnValue("no-ext");
    const result = generateUniqueFilename("README");
    expect(result).toBe("no-ext");
  });

  it("每次调用生成不同的 UUID", () => {
    mockUuid.mockReturnValueOnce("first-uuid").mockReturnValueOnce("second-uuid");
    const name1 = generateUniqueFilename("file.txt");
    const name2 = generateUniqueFilename("file.txt");
    expect(name1).not.toBe(name2);
  });

  it("处理中文文件名", () => {
    mockUuid.mockReturnValue("cn-file");
    const result = generateUniqueFilename("报告文档.docx");
    expect(result).toBe("cn-file.docx");
  });
});

// ===================================================================
// saveFile 测试
// ===================================================================
describe("saveFile — 保存文件到 uploads/", () => {
  function createMockFile(
    name: string,
    content: string,
    mimeType = "application/pdf",
  ): File {
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], name, { type: mimeType });
  }

  it("成功保存文件并返回元数据", async () => {
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUuid.mockReturnValue("save-uuid-1");

    const file = createMockFile("test-report.pdf", "PDF content here");
    const result = await saveFile(file);

    // 验证返回结构
    expect(result).toHaveProperty("path");
    expect(result).toHaveProperty("originalName");
    expect(result).toHaveProperty("size");
    expect(result).toHaveProperty("mimeType");

    expect(result.originalName).toBe("test-report.pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.path).toContain("save-uuid-1");
    expect(result.size).toBeGreaterThan(0);
  });

  it("路径以 /uploads/ 开头", async () => {
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUuid.mockReturnValue("path-uuid");

    const file = createMockFile("doc.docx", "doc content", "application/msword");
    const result = await saveFile(file);

    expect(result.path).toMatch(/^\/uploads\//);
  });

  it("保留原始 MIME 类型", async () => {
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUuid.mockReturnValue("mime-uuid");

    const file = createMockFile(
      "spreadsheet.xlsx",
      "excel data",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const result = await saveFile(file);

    expect(result.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("即使 uploads 目录已存在也能正常保存", async () => {
    mockMkdir.mockResolvedValue(undefined); // mkdir 在 recursive 模式下已存在也不会报错
    mockWriteFile.mockResolvedValue(undefined);
    mockUuid.mockReturnValue("existing-dir");

    const file = createMockFile("image.png", "image binary", "image/png");
    const result = await saveFile(file);

    expect(result.path).toBeDefined();
    expect(result.originalName).toBe("image.png");
  });
});

// ===================================================================
// MAX_FILE_SIZE 常量
// ===================================================================
describe("MAX_FILE_SIZE — 文件大小上限", () => {
  it("等于 50MB (52428800 bytes)", () => {
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    expect(MAX_FILE_SIZE).toBe(52428800);
  });
});
