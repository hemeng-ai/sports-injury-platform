
// ---- mock @supabase/supabase-js (全局) ----
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: { user: { id: "supa-id", email: "test@test.com" } }, error: null }),
        updateUserById: jest.fn().mockResolvedValue({ data: { user: {} }, error: null }),
      },
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: "supa-id", email: "test@test.com", app_metadata: { role: "ADMIN" } }, session: {} }, error: null }),
    },
  })),
}));


// ---- mock @supabase/ssr (全局) ----
jest.mock("@supabase/ssr", () => {
  const mockAuth = {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: new Error("Invalid") }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  };

  return {
    createServerClient: jest.fn(() => ({ auth: { ...mockAuth } })),
    createBrowserClient: jest.fn(() => ({ auth: { ...mockAuth } })),
    createClient: jest.fn(() => ({ auth: { ...mockAuth } })),
  };
});

// 测试环境预置变量
// 注意：此文件仅用于测试，不含生产密钥
process.env.AUTH_SECRET = "test-secret-for-jest-testing-only";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET = "test-bucket";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";


