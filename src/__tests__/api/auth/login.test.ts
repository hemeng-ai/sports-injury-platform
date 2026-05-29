/**
 * @jest-environment node
 *
 * 登录 API 测试 — POST /api/auth/login (Supabase Auth)
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: jest.fn().mockResolvedValue({
        id: "test-id", username: "admin", email: "admin@test.com",
        role: "ADMIN", supabaseUserId: "supa-id",
      }),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

import { POST } from "@/app/api/auth/login/route";

describe("POST /api/auth/login", () => {
  it("缺少字段返回 400", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST", body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("邮箱格式无效返回 400", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "bademail", password: "123456" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("密码过短返回 400", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("登录成功返回 200", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@test.com", password: "admin123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.role).toBe("ADMIN");
  });
});
