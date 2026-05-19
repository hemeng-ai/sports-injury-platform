"use client";

/**
 * Navbar — 顶部导航栏
 * 左侧品牌 + 右侧用户信息（Avatar + 用户名 + Role Badge + 退出 DropdownMenu）
 */
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Activity, LogOut, User } from "lucide-react";

/** 角色显示标签的中文映射 */
const ROLE_LABELS: Record<string, string> = {
  VISITOR: "VISITOR",
  ADMIN: "ADMIN",
  SUPERADMIN: "SUPERADMIN",
};

/** 角色对应 Badge variant */
const ROLE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  VISITOR: "secondary",
  ADMIN: "default",
  SUPERADMIN: "destructive",
};

export default function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user as { name?: string; role?: string } | undefined;

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* 左侧：品牌 */}
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-foreground">
            运动损伤资料平台
          </span>
        </div>

        {/* 右侧：用户信息 */}
        <div className="flex items-center gap-2">
          {status === "loading" && (
            <div className="flex items-center gap-2">
              <div className="animate-pulse h-8 w-8 rounded-full bg-muted" />
              <div className="animate-pulse h-4 w-16 rounded bg-muted" />
            </div>
          )}

          {status === "authenticated" && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline-block">
                    {user.name}
                  </span>
                  <Badge variant={ROLE_VARIANTS[user.role || ""] || "secondary"}>
                    {ROLE_LABELS[user.role || ""] || user.role}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{user.name}</span>
                    </div>
                    <Badge
                      variant={ROLE_VARIANTS[user.role || ""] || "secondary"}
                      className="w-fit"
                    >
                      {ROLE_LABELS[user.role || ""] || user.role}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleSignOut}
                  className="cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
