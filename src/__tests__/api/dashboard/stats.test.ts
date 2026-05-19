/**
 * Dashboard Stats API 测试 — src/app/api/dashboard/stats/route.ts
 *
 * 直接测试 handleGet()，通过依赖注入传入 mock jwtVerify
 */

// ---- jsdom polyfill ----
if (typeof TextEncoder === "undefined") {
  // @ts-ignore
  globalThis.TextEncoder = class TextEncoder {
    encode(str: string): Uint8Array {
      const buf = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        buf[i] = str.charCodeAt(i);
      }
      return buf;
    }
  };
}

// ---- mock next/server ----
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

let handleGet: (
  request: Request,
  jwtVerifyFn?: (...args: unknown[]) => Promise<unknown>,
) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/dashboard/stats/route");
  handleGet = mod.handleGet;
});

beforeEach(() => {
  jest.clearAllMocks();
});

/** 构建 mock Request */
function buildRequest(withCookie: boolean): Request {
  return {
    headers: {
      get: (name: string) =>
        name === "cookie" && withCookie
          ? "authjs.session-token=fake.jwt.token"
          : null,
    },
  } as unknown as Request;
}

// ==================== 测试用例 ====================

describe("GET /api/dashboard/stats", () => {
  it("已认证用户返回 200 + 统计数据 JSON", async () => {
    const mockVerify = jest.fn().mockResolvedValueOnce({
      payload: { role: "ADMIN", sub: "u1" },
    });

    const response = await handleGet(buildRequest(true), mockVerify);

    expect(response.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledTimes(1);
    const body = await response.json();
    expect(body).toBeDefined();
  });

  it("未认证用户（无 cookie）返回 401", async () => {
    const response = await handleGet(buildRequest(false));
    expect(response.status).toBe(401);
  });

  it("返回数据包含所有必需字段", async () => {
    const mockVerify = jest.fn().mockResolvedValueOnce({
      payload: { role: "ADMIN", sub: "u1" },
    });

    const response = await handleGet(buildRequest(true), mockVerify);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toHaveProperty("totalFiles");
    expect(body).toHaveProperty("totalIndicators");
    expect(body).toHaveProperty("recentUploads");
    expect(body).toHaveProperty("totalUsers");
    expect(body).toHaveProperty("fileTrend");
    expect(body).toHaveProperty("indicatorTrend");
    expect(body).toHaveProperty("uploadTrend");
    expect(body).toHaveProperty("userTrend");
  });

  it("每个统计值都是期望类型", async () => {
    const mockVerify = jest.fn().mockResolvedValueOnce({
      payload: { role: "ADMIN", sub: "u1" },
    });

    const response = await handleGet(buildRequest(true), mockVerify);
    const body = (await response.json()) as Record<string, unknown>;

    expect(typeof body.totalFiles).toBe("number");
    expect(typeof body.totalIndicators).toBe("number");
    expect(typeof body.recentUploads).toBe("number");
    expect(typeof body.totalUsers).toBe("number");
    expect(typeof body.fileTrend).toBe("string");
    expect(typeof body.indicatorTrend).toBe("string");
    expect(typeof body.uploadTrend).toBe("string");
    expect(typeof body.userTrend).toBe("string");
  });
});
