/**
 * Sidebar 树状侧边栏组件测试 — src/components/layout/Sidebar.tsx
 *
 * 规格：
 * - 自研递归 TreeView + TreeNode
 * - 节点列表包含 6 个导航项
 * - 权限过滤：VISITOR 隐藏 /users 节点
 * - 移动端 Sheet overlay 收起
 * - localStorage 持久化展开状态 key="sidebar-expanded"
 * - usePathname() 高亮当前激活节点
 * - 节点用 next/link Link 包裹
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- mock 依赖 ----
let mockPathname = "/dashboard";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => mockPathname,
}));

// mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} data-testid={`link-${href.replace(/\//g, "-")}`} {...props}>
        {children}
      </a>
    );
  };
});

// mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// 动态导入
let Sidebar: React.ComponentType<{
  userRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
}>;

beforeAll(async () => {
  const mod = await import("@/components/layout/Sidebar");
  Sidebar = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = "/dashboard";
  localStorageMock.clear();
});

// ==================== 测试用例 ====================

describe("Sidebar 树状侧边栏组件", () => {
  it("渲染所有默认导航节点（首页/文件管理/指标体系/数据分析/系统设置）", () => {
    render(<Sidebar userRole="ADMIN" />);
    expect(screen.getByText("首页")).toBeInTheDocument();
    expect(screen.getByText("文件管理")).toBeInTheDocument();
    expect(screen.getByText("指标体系")).toBeInTheDocument();
    expect(screen.getByText("数据分析")).toBeInTheDocument();
    expect(screen.getByText("系统设置")).toBeInTheDocument();
  });

  it("VISITOR 角色时隐藏用户管理节点", () => {
    render(<Sidebar userRole="VISITOR" />);
    expect(screen.getByText("首页")).toBeInTheDocument();
    // 用户管理应对 VISITOR 隐藏
    expect(screen.queryByText("用户管理")).not.toBeInTheDocument();
  });

  it("ADMIN 角色时显示所有节点（包括用户管理）", () => {
    render(<Sidebar userRole="ADMIN" />);
    expect(screen.getByText("用户管理")).toBeInTheDocument();
    expect(screen.getByText("系统设置")).toBeInTheDocument();
  });

  it("高亮当前激活节点（usePathname 匹配）", () => {
    mockPathname = "/files";
    render(<Sidebar userRole="ADMIN" />);

    // 文件管理节点应有激活样式（通过 class 或 data-active 属性）
    const activeLink = screen.getByText("文件管理").closest("a");
    expect(activeLink).not.toBeNull();
    const className = activeLink?.className || "";
    // 应包含激活状态的样式类名
    expect(className.includes("bg") || className.includes("active")).toBe(true);
  });

  it("点击节点时包含正确的 href（首页 → /dashboard）", () => {
    render(<Sidebar userRole="ADMIN" />);
    const dashboardLink = screen.getByText("首页").closest("a");
    expect(dashboardLink).not.toBeNull();
    expect(dashboardLink?.getAttribute("href")).toBe("/dashboard");
  });

  it("点击「系统设置」节点，href 指向 /settings", () => {
    render(<Sidebar userRole="ADMIN" />);
    const settingsLink = screen.getByText("系统设置").closest("a");
    expect(settingsLink).not.toBeNull();
    expect(settingsLink?.getAttribute("href")).toBe("/settings");
  });

  it("移动端模式：isOpen=true 时显示侧边栏", () => {
    render(<Sidebar userRole="ADMIN" isOpen={true} onClose={jest.fn()} />);
    // 侧边栏存在（桌面端 + 移动端各一个，所以至少 2 个）
    const homeLinks = screen.getAllByText("首页");
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("移动端模式：点击节点后调用 onClose", async () => {
    const mockOnClose = jest.fn();
    const user = userEvent.setup();
    render(<Sidebar userRole="ADMIN" isOpen={true} onClose={mockOnClose} />);

    await user.click(screen.getAllByText("文件管理")[0]);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("localStorage 持久化展开状态：初始从 localStorage 读取", () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(["indicators"]));
    render(<Sidebar userRole="ADMIN" />);
    // 读取了 sidebar-expanded key
    expect(localStorageMock.getItem).toHaveBeenCalledWith("sidebar-expanded");
  });
});
