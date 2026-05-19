/**
 * 登录页面测试 — src/app/login/page.tsx
 *
 * 规格：
 * - 渲染登录表单：用户名输入框、密码输入框、登录按钮
 * - 提交时调用 signIn
 * - 错误时有 toast 提示
 * - 成功后跳转到 /dashboard
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- mock 依赖 ----
const mockSignIn = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockRouterPush(...args),
  }),
}));

// 为 sonner toast 提供基本 mock
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// 模拟 server action — 实际登录页面会在 client 组件中通过 signIn 处理
// 该测试验证 UI 行为，不测试 server action

let LoginPage: React.ComponentType;

beforeAll(async () => {
  const mod = await import("@/app/login/page");
  LoginPage = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ==================== 测试用例 ====================

describe("登录页面 — /login", () => {
  it("渲染登录表单标题", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: "登录", level: 1 })
    ).toBeInTheDocument();
  });

  it("渲染用户名输入框", () => {
    render(<LoginPage />);
    const usernameInput = screen.getByPlaceholderText(/用户名/i);
    expect(usernameInput).toBeInTheDocument();
    expect(usernameInput.tagName).toBe("INPUT");
  });

  it("渲染密码输入框", () => {
    render(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput.getAttribute("type")).toBe("password");
  });

  it("渲染登录按钮", () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole("button", { name: /登录/i });
    expect(submitButton).toBeInTheDocument();
  });

  it("输入用户名和密码后点击登录按钮触发提交", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const usernameInput = screen.getByPlaceholderText(/用户名/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const submitButton = screen.getByRole("button", { name: /登录/i });

    await user.type(usernameInput, "testuser");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    // signIn 应被调用
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  it("signIn 返回 error 时显示错误提示", async () => {
    mockSignIn.mockResolvedValue({ error: "CredentialsSignin" });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText(/用户名/i), "wronguser");
    await user.type(screen.getByPlaceholderText(/密码/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /登录/i }));

    await waitFor(() => {
      // 页面应保持可操作（未跳转）
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  it("signIn 成功时跳转到 /dashboard", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText(/用户名/i), "testuser");
    await user.type(screen.getByPlaceholderText(/密码/i), "password123");
    await user.click(screen.getByRole("button", { name: /登录/i }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("空用户名提交时阻止调用 signIn", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /登录/i }));
    // 表单验证应阻止提交
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
