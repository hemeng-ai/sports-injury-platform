import "@testing-library/jest-dom";
/**
 * @jest-environment jsdom
 *
 * AuthGuard 测试 — Supabase Auth 版本
 */
import { render, screen, waitFor } from "@testing-library/react";
import { AuthGuard } from "@/components/auth/AuthGuard";

const mockGetUser = jest.fn();

jest.mock("@/lib/supabase-client", () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

describe("AuthGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("未登录时显示加载中 → 跳转", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    render(<AuthGuard><p>内容</p></AuthGuard>);
    await waitFor(() => {
      expect(screen.getByText("验证中...")).toBeInTheDocument();
    });
  });

  it("已登录 VISITOR 无 minRole 要求 → 显示内容", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "VISITOR" } } },
      error: null,
    });
    render(<AuthGuard><p>受保护内容</p></AuthGuard>);
    await waitFor(() => {
      expect(screen.getByText("受保护内容")).toBeInTheDocument();
    });
  });

  it("VISITOR 访问需要 ADMIN 的页面 → 显示 403", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "VISITOR" } } },
      error: null,
    });
    render(<AuthGuard minRole="ADMIN"><p>管理员内容</p></AuthGuard>);
    await waitFor(() => {
      expect(screen.getByText("403 — 权限不足")).toBeInTheDocument();
    });
  });

  it("ADMIN 访问需要 ADMIN 的页面 → 显示内容", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "ADMIN" } } },
      error: null,
    });
    render(<AuthGuard minRole="ADMIN"><p>管理员内容</p></AuthGuard>);
    await waitFor(() => {
      expect(screen.getByText("管理员内容")).toBeInTheDocument();
    });
  });
});

