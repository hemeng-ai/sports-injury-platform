"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, User, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

const QUICK_LOGINS = [
  { label: "超级管理员", icon: ShieldCheck, role: "SUPERADMIN", email: "admin@sports-injury.local", password: "admin123" },
  { label: "管理员", icon: Shield, role: "ADMIN", email: "doctor@sports-injury.local", password: "doctor123" },
  { label: "访客登录", icon: User, role: "VISITOR", email: "visitor@sports-injury.local", password: "visitor123" },
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) {
        toast.error(error.message === "Invalid login credentials"
          ? "邮箱或密码不正确"
          : error.message);
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("请输入邮箱和密码");
      return;
    }
    await doLogin(email.trim(), password);
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!regUsername.trim() || regUsername.trim().length < 2) {
      toast.error("用户名至少 2 个字符");
      return;
    }
    if (!regEmail.trim() || !regEmail.includes("@")) {
      toast.error("请输入有效的邮箱");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("两次密码不一致");
      return;
    }
    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "注册失败");
        return;
      }
      toast.success("注册成功，请登录");
      setEmail(regEmail.trim());
      setPassword(regPassword);
      setRegUsername("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirm("");
    } catch {
      toast.error("注册失败");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FFFBF5 0%, #F5F0E8 30%, #EDF5F3 60%, #FFFBF5 100%)",
      }}
    >
      {/* 装饰背景 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #2D9D8E 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #E8A84C 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, #2D9D8E 0%, #4DB8AC 100%)",
              boxShadow: "0 4px 20px rgba(45, 157, 142, 0.25)",
            }}
          >
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#3D3929" }}>
            运动损伤资料平台
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#8B8576" }}>
            资料管理 · 指标分析 · 康复追踪
          </p>
        </div>

        {/* 卡片 */}
        <div className="rounded-2xl p-8"
          style={{
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(232, 226, 212, 0.8)",
            boxShadow: "0 2px 12px rgba(61, 57, 41, 0.06), 0 8px 32px rgba(45, 157, 142, 0.06)",
          }}
        >

          {/* 快捷登录 */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {QUICK_LOGINS.map((ql) => {
              const Icon = ql.icon;
              const isPrimary = ql.role === "SUPERADMIN";
              const isSecondary = ql.role === "ADMIN";
              return (
                <button
                  key={ql.role}
                  disabled={loading}
                  onClick={() => doLogin(ql.email, ql.password)}
                  className="flex flex-col items-center gap-1 py-4 px-2 rounded-xl border transition-all duration-200 disabled:opacity-50 cursor-pointer"
                  style={{
                    background: isPrimary
                      ? "linear-gradient(135deg, #2D9D8E 0%, #4DB8AC 100%)"
                      : isSecondary ? "#F5F0E8" : "transparent",
                    borderColor: isPrimary ? "transparent" : "#E8E2D4",
                    color: isPrimary ? "#FFFFFF" : "#3D3929",
                    boxShadow: isPrimary ? "0 2px 12px rgba(45, 157, 142, 0.2)" : "none",
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{ql.label}</span>
                </button>
              );
            })}
          </div>

          {/* 分隔线 */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "#E8E2D4" }} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2" style={{ background: "#FFFFFF", color: "#A69F8D" }}>或手动输入</span>
            </div>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 rounded-lg p-1"
              style={{ background: "#E8E2D4" }}
            >
              <TabsTrigger
                value="login"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:text-[#2D9D8E] data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=inactive]:text-[#6B6558]"
              >
                登录
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:text-[#2D9D8E] data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=inactive]:text-[#6B6558]"
              >
                注册
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email" style={{ color: "#3D3929" }}>邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                    required
                    className="rounded-lg bg-white border-2 border-[#C8BFA0] focus:border-[#2D9D8E] focus:ring-2 focus:ring-[#2D9D8E]/20 text-[#3D3929] placeholder:text-[#B8AF9A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" style={{ color: "#3D3929" }}>密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    required
                    className="rounded-lg bg-white border-2 border-[#C8BFA0] focus:border-[#2D9D8E] focus:ring-2 focus:ring-[#2D9D8E]/20 text-[#3D3929] placeholder:text-[#B8AF9A]"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-lg h-11 font-medium"
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #2D9D8E 0%, #4DB8AC 100%)",
                    boxShadow: "0 2px 12px rgba(45, 157, 142, 0.2)",
                  }}
                >
                  {loading ? "登录中..." : "登录"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username" style={{ color: "#3D3929" }}>用户名</Label>
                  <Input
                    id="reg-username"
                    type="text"
                    placeholder="至少 2 个字符"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    disabled={regLoading}
                    required
                    className="rounded-lg bg-white border-2 border-[#C8BFA0] focus:border-[#2D9D8E] focus:ring-2 focus:ring-[#2D9D8E]/20 text-[#3D3929] placeholder:text-[#B8AF9A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" style={{ color: "#3D3929" }}>邮箱</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={regLoading}
                    required
                    className="rounded-lg bg-white border-2 border-[#C8BFA0] focus:border-[#2D9D8E] focus:ring-2 focus:ring-[#2D9D8E]/20 text-[#3D3929] placeholder:text-[#B8AF9A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" style={{ color: "#3D3929" }}>密码</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="至少 6 位"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    disabled={regLoading}
                    required
                    className="rounded-lg bg-white border-2 border-[#C8BFA0] focus:border-[#2D9D8E] focus:ring-2 focus:ring-[#2D9D8E]/20 text-[#3D3929] placeholder:text-[#B8AF9A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm" style={{ color: "#3D3929" }}>确认密码</Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    placeholder="再次输入密码"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    disabled={regLoading}
                    required
                    className="rounded-lg bg-white border-2 border-[#C8BFA0] focus:border-[#2D9D8E] focus:ring-2 focus:ring-[#2D9D8E]/20 text-[#3D3929] placeholder:text-[#B8AF9A]"
                  />
                </div>
                <div className="p-3 rounded-lg text-xs text-muted-foreground flex items-center gap-2"
                  style={{ background: "#FEF7ED" }}
                >
                  <Badge variant="outline" className="text-xs border-[#E8A84C] text-[#8B6D3B]">访客</Badge>
                  注册后默认为访客角色，可浏览资料
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-lg h-11 font-medium"
                  disabled={regLoading}
                  style={{
                    background: "linear-gradient(135deg, #2D9D8E 0%, #4DB8AC 100%)",
                    boxShadow: "0 2px 12px rgba(45, 157, 142, 0.2)",
                  }}
                >
                  {regLoading ? "注册中..." : "创建账号"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: "#A69F8D" }}>
          运动医学数据管理 · 安全可靠
        </p>
      </div>
    </div>
  );
}