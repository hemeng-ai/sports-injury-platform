"use client";

// 个人设置页面 — 用户信息 + 修改密码
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Card as CardWrapper } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Lock, Shield } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    SUPERADMIN: { label: "超级管理员", variant: "default" },
    ADMIN: { label: "管理员", variant: "secondary" },
    VISITOR: { label: "游客", variant: "outline" },
  };
  const roleInfo = roleLabels[user?.role || ""] || { label: user?.role || "未知", variant: "outline" as const };

  const handleChangePassword = async () => {
    if (!oldPassword) { toast.error("请输入原密码"); return; }
    if (!newPassword || newPassword.length < 6) { toast.error("新密码至少 6 位"); return; }
    if (newPassword !== confirmPassword) { toast.error("两次输入的新密码不一致"); return; }
    if (oldPassword === newPassword) { toast.error("新密码不能与原密码相同"); return; }

    setChanging(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "修改失败"); return; }
      toast.success("密码修改成功，下次登录时生效");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch {
      toast.error("网络错误，请重试");
    }
    setChanging(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">个人设置</h1>
        <p className="text-sm text-muted-foreground mt-1">查看个人信息与修改密码</p>
      </div>

      {/* 用户信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            基本信息
          </CardTitle>
          <CardDescription>当前登录账户信息</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">用户名</Label>
            <p className="text-sm font-medium mt-1">{user?.name || user?.email || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">角色</Label>
            <div className="mt-1">
              <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">用户 ID</Label>
            <p className="text-sm font-mono text-muted-foreground mt-1 text-xs">
              {user?.id ? `${user.id.slice(0, 8)}...` : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 修改密码卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            修改密码
          </CardTitle>
          <CardDescription>为保障安全，修改密码需先验证原密码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>原密码</Label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="输入当前密码"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>新密码</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 位"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>确认新密码</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              className="mt-1.5"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changing} className="w-full">
            {changing ? "修改中..." : "修改密码"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
