"use client";

// 密码修改提醒 — 首次登录或从未修改过密码时显示
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X, ArrowRight } from "lucide-react";

export default function PasswordReminder() {
  const { data: session } = useSession();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (session?.user) {
      // 检查用户是否从未修改过密码
      const passwordChangedAt = (session.user as Record<string, unknown>).passwordChangedAt;
      if (!passwordChangedAt) {
        // 检查是否已手动关闭
        const dismissed = localStorage.getItem("password-reminder-dismissed");
        if (!dismissed) {
          setVisible(true);
        }
      }
    }
  }, [session]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("password-reminder-dismissed", "true");
  };

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between bg-amber-950/40 border border-amber-700/50 rounded-lg px-4 py-3 mb-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-200">
            安全提示：建议尽快修改默认密码
          </p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            当前账户尚未修改过密码，为了账户安全请前往个人设置进行修改
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <Button
          variant="outline"
          size="sm"
          className="border-amber-700/50 text-amber-200 hover:bg-amber-900/30 text-xs"
          onClick={() => router.push("/settings")}
        >
          <ArrowRight className="h-3.5 w-3.5 mr-1" />
          去修改
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1 text-amber-500 hover:text-amber-300 rounded"
          title="不再提醒"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
