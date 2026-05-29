/**
 * Auth 工具测试 — Supabase 认证
 */
describe("auth — Supabase 认证工具", () => {
  it("createClient 和 getUserFromRequest 可被导入", async () => {
    const auth = await import("@/lib/auth");
    expect(auth.createClient).toBeDefined();
    expect(auth.getUserFromRequest).toBeDefined();
  });
});
