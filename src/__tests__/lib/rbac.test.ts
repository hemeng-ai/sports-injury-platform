/**
 * @jest-environment node
 *
 * RBAC 权限控制函数测试 — src/lib/rbac.ts
 *
 * Task 1.3 规格：
 * - ROLE_HIERARCHY: VISITOR < ADMIN < SUPERADMIN
 * - canAccess(userRole, requiredRole) — 角色层级比较，纯函数
 * - hasMinRole(userRole, minRole) — 最小角色检查，纯函数
 * - checkApiPermission(request, minRole) — API 端权限校验，返回 null/401/403 Response
 *
 * 测试原则：测试即规格，先红灯后绿灯。
 * 使用 node 环境：canAccess/hasMinRole 是纯函数，checkApiPermission 依赖 Node Request/Response。
 */

// ---- mock 依赖 ----
const mockJwtVerify = jest.fn();

jest.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

// ---- 导入被测模块 ----
let canAccess: (userRole: string | null | undefined, requiredRole: string) => boolean;
let hasMinRole: (userRole: string | null | undefined, minRole: string) => boolean;
let checkApiPermission: (
  request: Request,
  minRole: string
) => Promise<Response | null>;

beforeAll(async () => {
  const mod = await import("@/lib/rbac");
  canAccess = mod.canAccess;
  hasMinRole = mod.hasMinRole;
  checkApiPermission = mod.checkApiPermission;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ===================================================================
// canAccess 测试 — 角色层级比较
// ===================================================================
describe("canAccess — 角色层级比较", () => {
  describe("正常路径（happy path）", () => {
    it("SUPERADMIN 可以访问 SUPERADMIN 级别资源", () => {
      expect(canAccess("SUPERADMIN", "SUPERADMIN")).toBe(true);
    });

    it("SUPERADMIN 可以访问 ADMIN 级别资源（向下兼容）", () => {
      expect(canAccess("SUPERADMIN", "ADMIN")).toBe(true);
    });

    it("SUPERADMIN 可以访问 VISITOR 级别资源（向下兼容）", () => {
      expect(canAccess("SUPERADMIN", "VISITOR")).toBe(true);
    });

    it("ADMIN 可以访问 ADMIN 级别资源", () => {
      expect(canAccess("ADMIN", "ADMIN")).toBe(true);
    });

    it("ADMIN 可以访问 VISITOR 级别资源（向下兼容）", () => {
      expect(canAccess("ADMIN", "VISITOR")).toBe(true);
    });

    it("VISITOR 可以访问 VISITOR 级别资源", () => {
      expect(canAccess("VISITOR", "VISITOR")).toBe(true);
    });
  });

  describe("权限拒绝路径", () => {
    it("ADMIN 不能访问 SUPERADMIN 级别资源", () => {
      expect(canAccess("ADMIN", "SUPERADMIN")).toBe(false);
    });

    it("VISITOR 不能访问 ADMIN 级别资源", () => {
      expect(canAccess("VISITOR", "ADMIN")).toBe(false);
    });

    it("VISITOR 不能访问 SUPERADMIN 级别资源", () => {
      expect(canAccess("VISITOR", "SUPERADMIN")).toBe(false);
    });
  });

  describe("边界条件", () => {
    it("userRole 为 null 时返回 false", () => {
      expect(canAccess(null, "VISITOR")).toBe(false);
    });

    it("userRole 为 undefined 时返回 false", () => {
      expect(canAccess(undefined, "VISITOR")).toBe(false);
    });

    it("userRole 为空字符串时返回 false", () => {
      expect(canAccess("", "VISITOR")).toBe(false);
    });

    it("userRole 为无效角色字符串时返回 false", () => {
      expect(canAccess("INVALID_ROLE" as string, "VISITOR")).toBe(false);
    });

    it("requiredRole 为无效角色字符串时返回 false", () => {
      expect(canAccess("ADMIN", "INVALID_ROLE" as string)).toBe(false);
    });
  });

  describe("纯函数特性", () => {
    it("多次调用相同参数应返回相同结果（无副作用）", () => {
      const result1 = canAccess("ADMIN", "VISITOR");
      const result2 = canAccess("ADMIN", "VISITOR");
      expect(result1).toBe(result2);
    });

    it("不应修改全局状态", () => {
      const before = canAccess("SUPERADMIN", "ADMIN");
      // 多次调用后状态不变
      for (let i = 0; i < 10; i++) {
        canAccess("ADMIN", "VISITOR");
        canAccess("VISITOR", "ADMIN");
      }
      const after = canAccess("SUPERADMIN", "ADMIN");
      expect(after).toBe(before);
    });
  });
});

// ===================================================================
// hasMinRole 测试 — 最小角色检查
// ===================================================================
describe("hasMinRole — 最小角色检查", () => {
  describe("正常路径", () => {
    it("SUPERADMIN 满足 ADMIN 要求", () => {
      expect(hasMinRole("SUPERADMIN", "ADMIN")).toBe(true);
    });

    it("SUPERADMIN 满足 SUPERADMIN 要求", () => {
      expect(hasMinRole("SUPERADMIN", "SUPERADMIN")).toBe(true);
    });

    it("ADMIN 满足 VISITOR 要求", () => {
      expect(hasMinRole("ADMIN", "VISITOR")).toBe(true);
    });

    it("VISITOR 满足 VISITOR 要求", () => {
      expect(hasMinRole("VISITOR", "VISITOR")).toBe(true);
    });
  });

  describe("权限拒绝", () => {
    it("VISITOR 不满足 ADMIN 要求", () => {
      expect(hasMinRole("VISITOR", "ADMIN")).toBe(false);
    });

    it("ADMIN 不满足 SUPERADMIN 要求", () => {
      expect(hasMinRole("ADMIN", "SUPERADMIN")).toBe(false);
    });
  });

  describe("边界条件", () => {
    it("userRole 为 null 时返回 false", () => {
      expect(hasMinRole(null, "VISITOR")).toBe(false);
    });

    it("userRole 为 undefined 时返回 false", () => {
      expect(hasMinRole(undefined, "ADMIN")).toBe(false);
    });

    it("userRole 为无效角色时返回 false", () => {
      expect(hasMinRole("UNKNOWN" as string, "VISITOR")).toBe(false);
    });
  });

  describe("纯函数特性", () => {
    it("无副作用，多次调用结果一致", () => {
      const r1 = hasMinRole("ADMIN", "VISITOR");
      const r2 = hasMinRole("ADMIN", "VISITOR");
      expect(r1).toBe(r2);
    });
  });
});

// ===================================================================
// checkApiPermission 测试 — API 权限校验
// ===================================================================
describe("checkApiPermission — API 权限校验", () => {
  const AUTH_SECRET = "test-secret-key-for-jwt-verification";

  /**
   * 辅助函数：创建带有模拟 cookie 的 Request 对象
   */
  function createApiRequest(
    cookieValue: string | null,
    url = "https://example.com/api/protected/data"
  ): Request {
    const headers = new Headers();
    if (cookieValue) {
      headers.set(
        "cookie",
        `authjs.session-token=${cookieValue}; Path=/; HttpOnly`
      );
    }
    return new Request(url, {
      method: "GET",
      headers,
    });
  }

  describe("认证失败 — 返回 401", () => {
    it("无 session cookie 时返回 401 JSON", async () => {
      const req = createApiRequest(null);
      const result = await checkApiPermission(req, "VISITOR");

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Response);
      expect(result!.status).toBe(401);

      const body = await result!.json();
      expect(body.error).toBeDefined();
    });

    it("cookie 存在但 token 无效/过期时返回 401 JSON", async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error("token expired"));

      const req = createApiRequest("invalid-token-value");
      const result = await checkApiPermission(req, "VISITOR");

      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);

      const body = await result!.json();
      expect(body.error).toBeDefined();
    });

    it("cookie 名为空字符串的 token 返回 401", async () => {
      const req = createApiRequest("");
      // 空 token 不应尝试验证
      const result = await checkApiPermission(req, "VISITOR");

      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });
  });

  describe("认证成功但权限不足 — 返回 403", () => {
    it("VISITOR 访问需要 ADMIN 角色的 API 返回 403", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "VISITOR", sub: "user-1" },
      });

      const req = createApiRequest("valid-visitor-token");
      const result = await checkApiPermission(req, "ADMIN");

      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);

      const body = await result!.json();
      expect(body.error).toBeDefined();
    });

    it("ADMIN 访问需要 SUPERADMIN 角色的 API 返回 403", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "ADMIN", sub: "user-2" },
      });

      const req = createApiRequest("valid-admin-token");
      const result = await checkApiPermission(req, "SUPERADMIN");

      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });
  });

  describe("认证成功且权限充足 — 返回 null（放行）", () => {
    it("ADMIN 访问需要 ADMIN 角色的 API 放行", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "ADMIN", sub: "user-2" },
      });

      const req = createApiRequest("valid-admin-token");
      const result = await checkApiPermission(req, "ADMIN");

      expect(result).toBeNull();
    });

    it("SUPERADMIN 访问需要 ADMIN 角色的 API 放行（向下兼容）", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "SUPERADMIN", sub: "user-3" },
      });

      const req = createApiRequest("valid-superadmin-token");
      const result = await checkApiPermission(req, "ADMIN");

      expect(result).toBeNull();
    });

    it("VISITOR 访问需要 VISITOR 角色的 API 放行", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "VISITOR", sub: "user-1" },
      });

      const req = createApiRequest("valid-visitor-token");
      const result = await checkApiPermission(req, "VISITOR");

      expect(result).toBeNull();
    });
  });

  describe("边界条件", () => {
    it("JWT payload 中无 role 字段时返回 403", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { sub: "user-no-role" },
      });

      const req = createApiRequest("token-no-role");
      const result = await checkApiPermission(req, "VISITOR");

      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });

    it("JWT payload 中 role 字段为无效值时返回 403", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { role: "INVALID", sub: "user-bad-role" },
      });

      const req = createApiRequest("token-bad-role");
      const result = await checkApiPermission(req, "VISITOR");

      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });
  });
});
