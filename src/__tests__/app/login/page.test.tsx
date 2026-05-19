/**
 * 登录页面测试 — src/app/login/page.tsx
 *
 * 规格：
 * - 三种快速登录按钮（游客/管理员/超级管理员）
 * - 登录/注册 Tab 切换
 * - 手动登录表单
 * - 注册表单（默认 VISITOR）
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignIn = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: (...args: unknown[]) => mockRouterPush(...args) }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

let LoginPage: React.ComponentType;

beforeAll(async () => {
  const mod = await import("@/app/login/page");
  LoginPage = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("登录页面 — /login", () => {
  it("渲染平台标题", () => {
    render(<LoginPage />);
    expect(screen.getByText("运动损伤资料平台")).toBeInTheDocument();
  });

  it("渲染三种快速登录按钮", () => {
    render(<LoginPage />);
    expect(screen.getByText("游客登录")).toBeInTheDocument();
    expect(screen.getByText("管理员登录")).toBeInTheDocument();
    expect(screen.getByText("超级管理员")).toBeInTheDocument();
  });

  it("渲染登录/注册 Tab", () => {
    render(<LoginPage />);
    expect(screen.getByRole("tab", { name: "登录" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "注册" })).toBeInTheDocument();
  });

  it("点击快速登录按钮调用 signIn", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByText("游客登录"));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ username: "visitor" }));
    });
  });

  it("signIn 成功时跳转 /dashboard", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByText("游客登录"));
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("手动输入用户名密码后点击登录按钮触发 signIn", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    const user = userEvent.setup();
    render(<LoginPage />);

    const usernameInput = screen.getByPlaceholderText("请输入用户名");
    const passwordInput = screen.getByPlaceholderText("请输入密码");
    await user.type(usernameInput, "testuser");
    await user.type(passwordInput, "password123");
    // 点击表单登录按钮
    const buttons = screen.getAllByRole("button", { name: /登录/ });
    const formButton = buttons.find(b => b.getAttribute("type") === "submit");
    if (formButton) await user.click(formButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  it("切换到注册 tab 可输入注册信息", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("tab", { name: "注册" }));
    expect(screen.getByPlaceholderText("至少 2 个字符")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("至少 6 位")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("再次输入密码")).toBeInTheDocument();
  });
});
