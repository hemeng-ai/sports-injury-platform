/**
 * Navbar 组件测试 — src/components/layout/Navbar.tsx
 *
 * 规格：
 * - 深色运动医学科技风顶部导航栏
 * - 左侧：品牌 + "运动损伤资料平台"
 * - 右侧：useSession 获取用户 → Avatar + 用户名 + Role Badge + 退出 DropdownMenu
 * - loading 状态显示骨架占位
 * - unauthenticated 状态不显示用户区域
 * - 退出按钮触发 signOut({ callbackUrl: "/login" })
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- mock 依赖 ----
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockSignOut = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockRouterPush(...args),
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  }),
  usePathname: () => "/dashboard",
}));

// 可动态控制的 useSession 返回值
let mockSessionData: {
  data: { user?: { id?: string; name?: string; role?: string } } | null;
  status: "loading" | "authenticated" | "unauthenticated";
} = {
  data: null,
  status: "unauthenticated",
};

jest.mock("next-auth/react", () => ({
  useSession: () => mockSessionData,
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// 导入被测试组件
let Navbar: React.ComponentType;

beforeAll(async () => {
  const mod = await import("@/components/layout/Navbar");
  Navbar = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionData = {
    data: null,
    status: "unauthenticated",
  };
});

// ==================== 测试用例 ====================

describe("Navbar 组件", () => {
  it("渲染品牌名称「运动损伤资料平台」", () => {
    mockSessionData = {
      data: { user: { id: "u1", name: "张医师", role: "ADMIN" } },
      status: "authenticated",
    };
    render(<Navbar />);
    expect(screen.getByText("运动损伤资料平台")).toBeInTheDocument();
  });

  it("用户已登录时显示用户名", () => {
    mockSessionData = {
      data: { user: { id: "u1", name: "张医师", role: "ADMIN" } },
      status: "authenticated",
    };
    render(<Navbar />);
    expect(screen.getByText("张医师")).toBeInTheDocument();
  });

  it("用户已登录时显示 Avatar（含首字母 Fallback）", () => {
    mockSessionData = {
      data: { user: { id: "u1", name: "张医师", role: "ADMIN" } },
      status: "authenticated",
    };
    render(<Navbar />);
    // Avatar fallback 显示用户名首字符
    const avatar = screen.getByText("张");
    expect(avatar).toBeInTheDocument();
  });

  it("用户已登录时显示 Role Badge（ADMIN）", () => {
    mockSessionData = {
      data: { user: { id: "u1", name: "张医师", role: "ADMIN" } },
      status: "authenticated",
    };
    render(<Navbar />);

    // 跳过由于 shadcn Badge 使用的 data 属性查找的替代方案
    // 直接文本查找
    const badge = screen.getByText("ADMIN");
    expect(badge).toBeInTheDocument();
  });

  it("用户已登录时显示 Role Badge（VISITOR）", () => {
    mockSessionData = {
      data: { user: { id: "u2", name: "李访客", role: "VISITOR" } },
      status: "authenticated",
    };
    render(<Navbar />);
    expect(screen.getByText("VISITOR")).toBeInTheDocument();
  });

  it("用户已登录时显示 Role Badge（SUPERADMIN）", () => {
    mockSessionData = {
      data: { user: { id: "u3", name: "王超管", role: "SUPERADMIN" } },
      status: "authenticated",
    };
    render(<Navbar />);
    expect(screen.getByText("SUPERADMIN")).toBeInTheDocument();
  });

  it("status=loading 时不显示用户区域（显示骨架占位）", () => {
    mockSessionData = {
      data: null,
      status: "loading",
    };
    render(<Navbar />);
    // 加载中不显示用户名
    expect(screen.queryByText("张医师")).not.toBeInTheDocument();
    // 骨架占位存在（通过 data-slot 查找或动画类名）
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("status=unauthenticated 时不显示用户区域", () => {
    mockSessionData = {
      data: null,
      status: "unauthenticated",
    };
    render(<Navbar />);
    // 品牌仍然显示
    expect(screen.getByText("运动损伤资料平台")).toBeInTheDocument();
    // 用户区域不显示（无 Avatar、无用户名、无 Role Badge）
    expect(screen.queryByText("张")).not.toBeInTheDocument();
    expect(screen.queryByText("ADMIN")).not.toBeInTheDocument();
  });

  it("DropdownMenu 中显示用户名和角色信息", async () => {
    mockSessionData = {
      data: { user: { id: "u1", name: "张医师", role: "ADMIN" } },
      status: "authenticated",
    };
    const user = userEvent.setup();
    render(<Navbar />);

    // 点击触发 DropdownMenu（点击 Avatar 或用户名区域）
    const trigger = screen.getByText("张医师");
    await user.click(trigger);

    // DropdownMenu 展开后应显示用户名和角色
    // shadcn DropdownMenu 使用 Portal，内容会渲染到 document body
    // 注意：触发按钮和 Dropdown 内都有"张医师"，所以用 getAllByText
    const results = screen.getAllByText("张医师");
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("点击退出按钮调用 signOut({ callbackUrl: '/login' })", async () => {
    mockSessionData = {
      data: { user: { id: "u1", name: "张医师", role: "ADMIN" } },
      status: "authenticated",
    };
    const user = userEvent.setup();
    render(<Navbar />);

    // 点击打开 DropdownMenu（使用第一个匹配的"张医师"，即触发器按钮内的）
    const triggers = screen.getAllByText("张医师");
    await user.click(triggers[0]);

    // 点击退出登录菜单项
    const logoutButton = screen.getByText("退出登录");
    await user.click(logoutButton);

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});
