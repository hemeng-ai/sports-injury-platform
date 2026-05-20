"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Shield, ShieldCheck } from "lucide-react";

const QUICK_LOGINS = [
  { label: "游客登录", icon: User, role: "VISITOR", username: "visitor", password: "visitor123", variant: "outline" as const },
  { label: "管理员登录", icon: Shield, role: "ADMIN", username: "doctor", password: "doctor123", variant: "secondary" as const },
  { label: "超级管理员", icon: ShieldCheck, role: "SUPERADMIN", username: "admin", password: "admin123", variant: "default" as const },
];

/** 根据 NextAuth 返回的 error code 映射中文提示 */
function getErrorMessage(code: string | undefined): string {
  switch (code) {
    case "empty_fields": return "请输入用户名和密码";
    case "invalid_credentials": return "用户名或密码不正确";
    default: return "登录失败";
  }
}

export default function LoginPage() {
  const router = useRouter();

  // 登录表单
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 注册表单
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // 快速登录
  const handleQuickLogin = async (u: string, p: string) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", { username: u, password: p, redirect: false });
      // NextAuth 认证失败时 HTTP 仍返回 200，须先检查 error 再检查 ok
      if (result?.error) {
        toast.error(getErrorMessage(result?.code));
      } else if (result?.ok) {
        router.push("/dashboard");
      }
    } catch { toast.error("登录失败"); }
    finally { setLoading(false); }
  };

  // 手动登录
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !password) { toast.error("请输入用户名和密码"); return; }
    setLoading(true);
    try {
      const result = await signIn("credentials", { username: username.trim(), password, redirect: false });
      // NextAuth 认证失败时 HTTP 仍返回 200，须先检查 error 再检查 ok
      if (result?.error) {
        toast.error(getErrorMessage(result?.code));
      } else if (result?.ok) {
        router.push("/dashboard");
      }
    } catch { toast.error("登录失败"); }
    finally { setLoading(false); }
  };

  // 注册
  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!regUsername.trim() || regUsername.trim().length < 2) { toast.error("用户名至少 2 个字符"); return; }
    if (!regPassword || regPassword.length < 6) { toast.error("密码至少 6 位"); return; }
    if (regPassword !== regConfirm) { toast.error("两次密码不一致"); return; }
    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: regUsername.trim(), password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "注册失败"); return; }
      toast.success("注册成功，请登录");
      // 自动填到登录表单
      setUsername(regUsername.trim());
      setPassword(regPassword);
      setRegUsername(""); setRegPassword(""); setRegConfirm("");
    } catch { toast.error("注册失败"); }
    finally { setRegLoading(false); }
  };

  return (
    <Card className="w-full max-w-md p-8 space-y-6 mx-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">运动损伤资料平台</h1>
          <p className="text-muted-foreground text-sm">资料管理与指标分析系统</p>
        </div>

        {/* 快速登录按钮 */}
        <div className="grid grid-cols-3 gap-2">
          {QUICK_LOGINS.map((ql) => {
            const Icon = ql.icon;
            return (
              <Button
                key={ql.role}
                variant={ql.variant}
                className="flex flex-col items-center gap-1 py-5 h-auto"
                disabled={loading}
                onClick={() => handleQuickLogin(ql.username, ql.password)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{ql.label}</span>
              </Button>
            );
          })}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">或手动输入</span>
          </div>
        </div>

        {/* 登录/注册 切换 */}
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          {/* 登录表单 */}
          <TabsContent value="login">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input id="username" type="text" placeholder="请输入用户名" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} autoComplete="username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input id="password" type="password" placeholder="请输入密码" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} autoComplete="current-password" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "登录中..." : "登录"}
              </Button>
            </form>
          </TabsContent>

          {/* 注册表单 */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="reg-username">用户名</Label>
                <Input id="reg-username" type="text" placeholder="至少 2 个字符" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} disabled={regLoading} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">密码</Label>
                <Input id="reg-password" type="password" placeholder="至少 6 位" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={regLoading} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm">确认密码</Label>
                <Input id="reg-confirm" type="password" placeholder="再次输入密码" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} disabled={regLoading} required />
              </div>
              <div className="p-3 rounded-md bg-muted/50 text-xs text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className="text-xs">游客</Badge>
                注册后默认为游客角色，可浏览资料但无法上传或编辑
              </div>
              <Button type="submit" className="w-full" disabled={regLoading}>
                {regLoading ? "注册中..." : "注册"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
  );
}
