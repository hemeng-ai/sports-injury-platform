// Mock supabase-server — 供测试使用
const mockUser = {
  id: "test-user-id",
  email: "test@test.com",
  app_metadata: { role: "ADMIN" },
  user_metadata: {},
};

const mockAuth = {
  getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  getSession: jest.fn().mockResolvedValue({ data: { session: { user: mockUser } }, error: null }),
  signOut: jest.fn().mockResolvedValue({ error: null }),
};

export const createClient = jest.fn().mockResolvedValue({
  auth: mockAuth,
  from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis() }),
});
