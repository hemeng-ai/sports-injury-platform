// Mock @/lib/session — 供所有测试使用
export const getUserFromRequest = jest.fn().mockResolvedValue({
  id: "test-user-id",
  email: "test@test.com",
  role: "ADMIN",
});

export const decryptSessionToken = jest.fn().mockResolvedValue(null);
export const getSessionFromRequest = jest.fn().mockResolvedValue({ role: "ADMIN", sub: "test-user-id" });
