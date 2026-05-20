/**
 * Dashboard 首页组件测试 — src/app/dashboard/page.tsx
 *
 * 规格：
 * - 调用 fetch("/api/dashboard/stats") 获取统计数据
 * - 4 张统计卡片：文件总数/指标总数/最近上传/用户数
 * - loading → 4 个骨架卡片
 * - error → toast 错误提示
 * - 数据展示：卡片标题 + 数值 + 趋势百分比
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// ---- mock 依赖 ----
// mock ResizeObserver（JSDOM 不支持，Recharts ResponsiveContainer 需要）
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// mock localStorage
Object.defineProperty(window, "localStorage", {
  value: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  writable: true,
});

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { passwordChangedAt: new Date().toISOString() } }, status: "authenticated" }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => "/dashboard",
}));

// mock sonner toast
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

// mock 全局 fetch
let mockFetchResponse: { ok: boolean; status: number; json: () => Promise<unknown> } = {
  ok: true,
  status: 200,
  json: async () => ({
    totalFiles: 42,
    totalIndicators: 15,
    recentUploads: 7,
    totalUsers: 23,
    fileTrend: "+12%",
    indicatorTrend: "+5%",
    uploadTrend: "+20%",
    userTrend: "+3%",
  }),
};

global.fetch = jest.fn(() => Promise.resolve(mockFetchResponse)) as jest.Mock;

// 动态导入
let DashboardPage: React.ComponentType;

beforeAll(async () => {
  const mod = await import("@/app/dashboard/page");
  DashboardPage = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      totalFiles: 42,
      totalIndicators: 15,
      recentUploads: 7,
      totalUsers: 23,
      fileTrend: "+12%",
      indicatorTrend: "+5%",
      uploadTrend: "+20%",
      userTrend: "+3%",
    }),
  };
});

// ==================== 测试用例 ====================

describe("Dashboard 首页组件", () => {
  it("loading 状态显示骨架卡片", () => {
    // 延迟 fetch 以观察 loading 状态
    mockFetchResponse = new Promise(() => {
      // never resolves during test
    }) as unknown as { ok: boolean; status: number; json: () => Promise<unknown> };
    (global.fetch as jest.Mock).mockReturnValueOnce(mockFetchResponse);

    render(<DashboardPage />);
    // 骨架卡片应存在（animate-pulse 类名）
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("成功加载后显示 4 张统计卡片", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
  });

  it("卡片标题分别为「文件总数」「指标总数」「最近上传」「用户数」", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("文件总数")).toBeInTheDocument();
    });

    expect(screen.getByText("指标总数")).toBeInTheDocument();
    expect(screen.getByText("最近上传")).toBeInTheDocument();
    expect(screen.getByText("用户数")).toBeInTheDocument();
  });

  it("显示趋势百分比", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("+12%")).toBeInTheDocument();
    });

    expect(screen.getByText("+5%")).toBeInTheDocument();
    expect(screen.getByText("+20%")).toBeInTheDocument();
    expect(screen.getByText("+3%")).toBeInTheDocument();
  });

  it("fetch 失败时显示错误提示", async () => {
    mockFetchResponse = {
      ok: false,
      status: 500,
      json: async () => ({ error: "服务器错误" }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });
});
