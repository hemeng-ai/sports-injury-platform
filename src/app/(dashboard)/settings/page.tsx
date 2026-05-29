"use client";

// 个人设置页面 — v0.2.0: 密码可见性切换 + 强度指示器 + Loading + 行内错误
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

/** 密码强度等级 */
type StrengthLevel = { score: number; label: string; color: string; width: string };

function getPasswordStrength(password: string): StrengthLevel {
  if (!password) return { score: 0, label: "", color: "", width: "0%" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-zA-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels: Record<number, StrengthLevel> = {
    0: { score: 1, label: "弱", color: "#EF4444", width: "25%" },
    1: { score: 1, label: "弱", color: "#EF4444", width: "25%" },
    2: { score: 2, label: "中等", color: "#E6A817", width: "50%" },
    3: { score: 3, label: "强", color: "#22C55E", width: "75%" },
    4: { score: 4, label: "很强", color: "#06B6D4", width: "100%" },
  };
  return levels[score] || levels[2];
}

export default function SettingsPage() {
  const supabase = createClient();
  const [session, setSession] = useState<{ user?: { role?: string; id?: string; name?: string } } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSession({ user: { role: (user.app_metadata as Record<string, unknown>)?.role as string, id: user.id, name: user.email } });
      }
    });
  }, [supabase]);
  const user = session?.user;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [oldPasswordError, setOldPasswordError] = useState("");

  // 密码可见性
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    SUPERADMIN: { label: "超级管理员", variant: "default" },
    ADMIN: { label: "管理员", variant: "secondary" },
    VISITOR: { label: "游客", variant: "outline" },
  };
  const roleInfo = roleLabels[user?.role || ""] || { label: user?.role || "未知", variant: "outline" as const };

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const handleChangePassword = async () => {
    setOldPasswordError("");
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
      if (!res.ok) {
        if (res.status === 400 && data.error?.includes("原密码")) {
          setOldPasswordError(data.error);
        } else {
          toast.error(data.error || "修改失败", { duration: 5000 });
        }
        setChanging(false);
        return;
      }
      toast.success("密码修改成功，下次登录时生效", { duration: 3000 });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch {
      toast.error("网络错误，请重试", { duration: 5000 });
    }
    setChanging(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">个人设置</h1>
        <p className="text-sm text-muted-foreground mt-1">查看个人信息与修改密码</p>
      </div>

      {/* 基本信息 + 修改密码 并排 */}
      <div className="grid grid-cols-2 gap-6">
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
          {/* 原密码 */}
          <div>
            <Label>原密码</Label>
            <div className="relative mt-1.5">
              <Input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => { setOldPassword(e.target.value); setOldPasswordError(""); }}
                placeholder="输入当前密码"
                className={oldPasswordError ? "border-destructive" : ""}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {oldPasswordError && (
              <p className="text-xs text-destructive mt-1.5">{oldPasswordError}</p>
            )}
          </div>

          {/* 新密码 */}
          <div>
            <Label>新密码</Label>
            <div className="relative mt-1.5">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 6 位"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* 密码强度指示器 */}
            {newPassword && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1 h-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className="flex-1 rounded-full transition-colors duration-200"
                      style={{
                        backgroundColor: level <= strength.score ? strength.color : "#21262D",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: strength.color }}>
                  强度：{strength.label}
                </p>
              </div>
            )}
          </div>

          {/* 确认新密码 */}
          <div>
            <Label>确认新密码</Label>
            <div className="relative mt-1.5">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                className={
                  confirmPassword && newPassword !== confirmPassword ? "border-destructive" : ""
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive mt-1.5">两次输入的密码不一致</p>
            )}
          </div>

          <Button onClick={handleChangePassword} disabled={changing} className="w-full">
            {changing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                修改中...
              </>
            ) : (
              "修改密码"
            )}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
