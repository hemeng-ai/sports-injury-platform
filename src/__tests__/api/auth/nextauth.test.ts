/**
 * NextAuth Route Handler 测试 — /api/auth/[...nextauth]
 *
 * 规格：
 * - 导出 GET 和 POST handler
 * - GET/POST 是可调用的函数
 */

const mockHandlers = {
  GET: jest.fn(),
  POST: jest.fn(),
};

jest.mock("@/lib/auth", () => ({
  handlers: mockHandlers,
}));

describe("NextAuth Route Handler — /api/auth/[...nextauth]", () => {
  it("导出 GET handler", async () => {
    const mod = await import("@/app/api/auth/[...nextauth]/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });

  it("导出 POST handler", async () => {
    const mod = await import("@/app/api/auth/[...nextauth]/route");
    expect(mod.POST).toBeDefined();
    expect(typeof mod.POST).toBe("function");
  });

  it("GET 和 POST 是不同函数", async () => {
    const mod = await import("@/app/api/auth/[...nextauth]/route");
    expect(mod.GET).not.toBe(mod.POST);
  });
});
