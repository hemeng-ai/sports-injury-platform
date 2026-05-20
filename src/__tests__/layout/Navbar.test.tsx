/**
 * Navbar 组件测试 — src/components/layout/Navbar.tsx
 *
 * 规格：
 * - 深色运动医学科技风顶部导航栏
 * - 左侧：品牌 + "运动损伤资料平台"
 * - 右侧：主题切换按钮（ThemeToggle）
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";

// ---- mock 依赖 ----
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockRouterPush(...args),
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  }),
  usePathname: () => "/dashboard",
}));

// 导入被测试组件
let Navbar: React.ComponentType;

beforeAll(async () => {
  const mod = await import("@/components/layout/Navbar");
  Navbar = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ==================== 测试用例 ====================

describe("Navbar 组件", () => {
  it("渲染品牌名称「运动损伤资料平台」", () => {
    render(<Navbar />);
    expect(screen.getByText("运动损伤资料平台")).toBeInTheDocument();
  });

  it("渲染主题切换按钮（ThemeToggle）", () => {
    render(<Navbar />);
    // ThemeToggle 渲染一个 button，title 为"切换暗色模式"或"切换为明亮模式"
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("不显示用户信息区域（已移除）", () => {
    render(<Navbar />);
    // 用户相关的文本不应存在
    expect(screen.queryByText("管理员")).not.toBeInTheDocument();
    expect(screen.queryByText("游客")).not.toBeInTheDocument();
    expect(screen.queryByText("超级管理员")).not.toBeInTheDocument();
    expect(screen.queryByText("退出登录")).not.toBeInTheDocument();
    expect(screen.queryByText("个人设置")).not.toBeInTheDocument();
  });
});
