"use client";

// 密码修改提醒 — v0.2.0: 改用 sonner Toast 替代固定横幅
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PasswordReminder() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      const passwordChangedAt = (session.user as Record<string, unknown>).passwordChangedAt;
      if (!passwordChangedAt) {
        const dismissed = localStorage.getItem("password-reminder-dismissed");
        if (!dismissed) {
          toast.warning("建议尽快修改默认密码", {
            description: "当前账户尚未修改过密码，为了账户安全请前往个人设置进行修改",
            icon: <ShieldAlert className="h-5 w-5 text-warning" />,
            duration: Infinity,
            dismissible: true,
            action: {
              label: "去修改",
              onClick: () => router.push("/settings"),
            },
            onDismiss: () => {
              localStorage.setItem("password-reminder-dismissed", "true");
            },
            onAutoClose: () => {
              localStorage.setItem("password-reminder-dismissed", "true");
            },
          });
        }
      }
    }
  }, [session, router]);

  return null; // 不再渲染任何视觉元素
}
