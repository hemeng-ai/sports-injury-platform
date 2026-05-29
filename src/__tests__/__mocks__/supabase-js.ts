// Mock @supabase/supabase-js — 避免测试环境导入真实 Supabase SDK
export const createClient = jest.fn(() => ({
  auth: {
    admin: {
      createUser: jest.fn().mockResolvedValue({
        data: { user: { id: "supa-mock-id", email: "mock@test.com" }, session: {} },
        error: null,
      }),
      updateUserById: jest.fn().mockResolvedValue({
        data: { user: {} },
        error: null,
      }),
    },
    signInWithPassword: jest.fn().mockResolvedValue({
      data: {
        user: { id: "supa-mock-id", email: "mock@test.com", app_metadata: { role: "ADMIN" } },
        session: { access_token: "mock-token", refresh_token: "mock-refresh", expires_at: 9999999999 },
      },
      error: null,
    }),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://mock.supabase.co/mock" } })),
    })),
  },
}));
