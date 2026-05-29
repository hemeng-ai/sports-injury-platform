import "@testing-library/jest-dom";
/**
 * @jest-environment jsdom
 *
 * 登录页面测试 — Supabase Auth 版本
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

const mockSignIn = jest.fn();

jest.mock("@/lib/supabase-client", () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
  })),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

describe("登录页面", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ data: { user: {} }, error: null });
  });

  it("渲染登录表单", () => {
    render(<LoginPage />);
    expect(screen.getByText("运动损伤资料平台")).toBeInTheDocument();
  });

  it("显示快速登录按钮", () => {
    render(<LoginPage />);
    expect(screen.getByText("超级管理员")).toBeInTheDocument();
    expect(screen.getByText("管理员")).toBeInTheDocument();
    expect(screen.getByText("游客登录")).toBeInTheDocument();
  });

  it("输入邮箱密码后提交调用 signInWithPassword", async () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText("请输入邮箱");
    const passwordInput = screen.getByPlaceholderText("请输入密码");
    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
      });
    });
  });
});
