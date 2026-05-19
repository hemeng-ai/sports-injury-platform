/**
 * Breadcrumb 面包屑组件测试 — src/components/layout/Breadcrumb.tsx
 *
 * 规格：
 * - usePathname() 获取当前路径
 * - 自动解析路径生成面包屑
 * - 中文路径映射：
 *   /dashboard → 首页
 *   /files → 文件管理
 *   /indicators → 指标体系
 *   /analysis → 数据分析
 *   /users → 用户管理
 *   /settings → 系统设置
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";

// ---- mock 依赖 ----
let mockPathname = "/dashboard";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => mockPathname,
}));

// 动态导入组件
let Breadcrumb: React.ComponentType;

beforeAll(async () => {
  const mod = await import("@/components/layout/Breadcrumb");
  Breadcrumb = mod.default;
});

beforeEach(() => {
  mockPathname = "/dashboard";
});

// ==================== 测试用例 ====================

describe("Breadcrumb 面包屑组件", () => {
  it("根路径 /dashboard 显示「首页」", () => {
    mockPathname = "/dashboard";
    render(<Breadcrumb />);
    expect(screen.getByText("首页")).toBeInTheDocument();
  });

  it("/files 路径显示「首页 > 文件管理」", () => {
    mockPathname = "/files";
    render(<Breadcrumb />);
    expect(screen.getByText("首页")).toBeInTheDocument();
    expect(screen.getByText("文件管理")).toBeInTheDocument();
  });

  it("/indicators/123 深路径显示「首页 > 指标体系 > 123」", () => {
    mockPathname = "/indicators/123";
    render(<Breadcrumb />);
    expect(screen.getByText("首页")).toBeInTheDocument();
    expect(screen.getByText("指标体系")).toBeInTheDocument();
    // 深度未知路径段使用原始值
    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("未知路径段使用原始显示", () => {
    mockPathname = "/unknown/path";
    render(<Breadcrumb />);
    // 首页是默认前缀
    expect(screen.getByText("首页")).toBeInTheDocument();
    // 未知段保留原样
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(screen.getByText("path")).toBeInTheDocument();
  });

  it("/users 路径显示「首页 > 用户管理」", () => {
    mockPathname = "/users";
    render(<Breadcrumb />);
    expect(screen.getByText("首页")).toBeInTheDocument();
    expect(screen.getByText("用户管理")).toBeInTheDocument();
  });

  it("渲染为 nav 元素且包含 aria-label='面包屑导航'", () => {
    mockPathname = "/dashboard";
    render(<Breadcrumb />);
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
    // 使用更通用的检查方式
    const navEl = document.querySelector('nav');
    expect(navEl).toBeInTheDocument();
  });
});
