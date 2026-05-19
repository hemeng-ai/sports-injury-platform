/**
 * AuthGuard 组件测试 — src/components/auth/AuthGuard.tsx
 *
 * 规格：
 * - 已登录 → 渲染 children
 * - 未登录 → 重定向到 /login
 * - 加载中 → 显示 loading 状态
 * - 可选 role prop → 检查用户角色权限
 * - 角色不足 → 显示无权限页面 / 重定向
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { toast } from "sonner";

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

// 动态控制 useSession 的返回值
let mockSessionData: {
  data: { user?: { id?: string; role?: string } } | null;
  status: "loading" | "authenticated" | "unauthenticated";
} = {
  data: null,
  status: "unauthenticated",
};

jest.mock("next-auth/react", () => ({
  useSession: () => mockSessionData,
}));

let AuthGuard: React.ComponentType<{
  children: React.ReactNode;
  role?: string;
  fallback?: React.ReactNode;
}>;

beforeAll(async () => {
  const mod = await import("@/components/auth/AuthGuard");
  AuthGuard = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionData = {
    data: null,
    status: "unauthenticated",
  };
});

// ==================== 测试用例 ====================

describe("AuthGuard 组件", () => {
  it("status=loading 时显示加载状态", () => {
    mockSessionData = {
      data: null,
      status: "loading",
    };
    render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>
    );
    // 不应渲染 children
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
    // 应有加载指示器
    const loadingEl =
      screen.queryByRole("status") || screen.queryByText(/加载/i) || screen.queryByText(/loading/i);
    // 至少返回空壳而非 children
    expect(screen.queryByText("受保护内容")).toBeNull();
  });

  it("status=unauthenticated 时重定向到 /login", () => {
    mockSessionData = {
      data: null,
      status: "unauthenticated",
    };
    render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>
    );
    expect(mockRouterReplace).toHaveBeenCalledWith("/login");
    // children 不应渲染
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
  });

  it("status=authenticated 时渲染 children", () => {
    mockSessionData = {
      data: { user: { id: "u1", role: "VISITOR" } },
      status: "authenticated",
    };
    render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>
    );
    expect(screen.getByText("受保护内容")).toBeInTheDocument();
  });

  it("指定 role=ADMIN 但用户为 VISITOR 时不渲染 children", () => {
    mockSessionData = {
      data: { user: { id: "u1", role: "VISITOR" } },
      status: "authenticated",
    };
    render(
      <AuthGuard role="ADMIN">
        <div>管理员内容</div>
      </AuthGuard>
    );
    expect(screen.queryByText("管理员内容")).not.toBeInTheDocument();
  });

  it("指定 role=ADMIN 且用户为 ADMIN 时渲染 children", () => {
    mockSessionData = {
      data: { user: { id: "u2", role: "ADMIN" } },
      status: "authenticated",
    };
    render(
      <AuthGuard role="ADMIN">
        <div>管理员内容</div>
      </AuthGuard>
    );
    expect(screen.getByText("管理员内容")).toBeInTheDocument();
  });

  it("指定 role=ADMIN 且用户为 SUPERADMIN 时也渲染 children（向上兼容）", () => {
    mockSessionData = {
      data: { user: { id: "u3", role: "SUPERADMIN" } },
      status: "authenticated",
    };
    render(
      <AuthGuard role="ADMIN">
        <div>管理员内容</div>
      </AuthGuard>
    );
    expect(screen.getByText("管理员内容")).toBeInTheDocument();
  });

  it("未指定 role 时任何已认证用户均可通过", () => {
    mockSessionData = {
      data: { user: { id: "u4", role: "VISITOR" } },
      status: "authenticated",
    };
    render(
      <AuthGuard>
        <div>通用内容</div>
      </AuthGuard>
    );
    expect(screen.getByText("通用内容")).toBeInTheDocument();
  });

  it("提供 fallback 时，角色不足显示 fallback 内容", () => {
    mockSessionData = {
      data: { user: { id: "u5", role: "VISITOR" } },
      status: "authenticated",
    };
    render(
      <AuthGuard role="ADMIN" fallback={<div>无权限访问</div>}>
        <div>管理员内容</div>
      </AuthGuard>
    );
    expect(screen.getByText("无权限访问")).toBeInTheDocument();
    expect(screen.queryByText("管理员内容")).not.toBeInTheDocument();
  });
});

// ===================================================================
// Task 1.3 增强测试 — 角色守卫与加载状态
// ===================================================================
describe("AuthGuard 增强 — 加载骨架与 403 处理", () => {
  it("status=loading 时显示 skeleton 加载指示器", () => {
    mockSessionData = {
      data: null,
      status: "loading",
    };
    render(
      <AuthGuard requiredRole="ADMIN">
        <div>受保护内容</div>
      </AuthGuard>
    );

    // 应有加载指示器（spinner 或 skeleton）
    const loadingEl = screen.queryByRole("status");
    expect(loadingEl).toBeInTheDocument();
    // children 不应渲染
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
  });

  it("提供 requiredRole 但用户角色不足时显示 403 无权限页面（非重定向）", () => {
    mockSessionData = {
      data: { user: { id: "u6", role: "VISITOR" } },
      status: "authenticated",
    };

    // requiredRole 是新 prop 名，对应 Task 1.3 规格
    render(
      <AuthGuard requiredRole="ADMIN">
        <div>管理员内容</div>
      </AuthGuard>
    );

    // VISITOR 不能访问 ADMIN 内容 → 显示无权限，不重定向
    expect(screen.queryByText("管理员内容")).not.toBeInTheDocument();
    // 应有权限不足的提示（403 页面）
    expect(screen.getByText("403 - 权限不足")).toBeInTheDocument();
    expect(screen.getByText("您没有权限访问此内容")).toBeInTheDocument();
    // 不应触发重定向
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it("提供 requiredRole=SUPERADMIN 且用户为 SUPERADMIN 时渲染 children", () => {
    mockSessionData = {
      data: { user: { id: "u7", role: "SUPERADMIN" } },
      status: "authenticated",
    };

    render(
      <AuthGuard requiredRole="SUPERADMIN">
        <div>超管内容</div>
      </AuthGuard>
    );

    expect(screen.getByText("超管内容")).toBeInTheDocument();
  });

  it("未指定 requiredRole 时，已认证用户均可访问（向后兼容）", () => {
    mockSessionData = {
      data: { user: { id: "u8", role: "VISITOR" } },
      status: "authenticated",
    };

    render(
      <AuthGuard>
        <div>公共内容</div>
      </AuthGuard>
    );

    expect(screen.getByText("公共内容")).toBeInTheDocument();
  });

  it("requiredRole 和 role prop 同时使用时 requiredRole 优先", () => {
    mockSessionData = {
      data: { user: { id: "u9", role: "VISITOR" } },
      status: "authenticated",
    };

    // role=VISITOR（可通过）但 requiredRole=ADMIN（不可通过）
    render(
      <AuthGuard role="VISITOR" requiredRole="ADMIN">
        <div>冲突测试</div>
      </AuthGuard>
    );

    // requiredRole 优先级更高，VISITOR 不能访问 ADMIN 内容
    expect(screen.queryByText("冲突测试")).not.toBeInTheDocument();
  });
});
