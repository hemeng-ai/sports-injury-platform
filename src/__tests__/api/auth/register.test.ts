/**
 * @jest-environment node
 *
 * 注册 API 测试 — POST /api/auth/register (Supabase Auth)
 */

// Mock prisma 避免 PrismaClient 初始化
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: "test-id", username: "newuser", email: "new@test.com",
        role: "VISITOR", supabaseUserId: "supa-id", createdAt: new Date(),
      }),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  it("缺少必填字段返回 400", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST", body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("邮箱格式无效返回 400", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "test", email: "bad", password: "123456" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("用户名过短返回 400", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "a", email: "a@b.com", password: "123456" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("密码过短返回 400", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "test", email: "a@b.com", password: "123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("注册成功返回 201", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: "newuser", email: "new@test.com", password: "123456",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.role).toBe("VISITOR");
  });
});
