"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase-client";

/**
 * 密码修改提醒 — 检测用户是否从未修改过默认密码
 */
export function PasswordReminder() {
  const supabase = createClient();
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      if (!user) return;
      // 检查是否从未修改密码（通过 user_metadata 中的标记）
      const passwordChangedAt = (user.user_metadata as Record<string, string>)?.passwordChangedAt;
      if (!passwordChangedAt && user.created_at) {
        const createdDate = new Date(user.created_at);
        const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        // 创建超过 1 天且未修改过密码 → 提醒
        if (daysSinceCreation > 1) {
          setShowReminder(true);
        }
      }
    });
  }, [supabase]);

  if (!showReminder) return null;

  return (
    <Button variant="ghost" size="sm" asChild className="text-amber-500">
      <Link href="/settings">
        建议修改默认密码
      </Link>
    </Button>
  );
}
