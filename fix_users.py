import os
os.chdir(r"D:\ClaudeWorkSpace\my_project\sports-injury-platform")

path = r"src\app\(dashboard)\users\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace import
content = content.replace(
    'import { useSession } from "next-auth/react";',
    'import { createClient } from "@/lib/supabase-client";'
)

# 2. Replace session access pattern
old_session = '''  const { data: session } = useSession();
  const router = useRouter();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "SUPERADMIN";

  // 非管理员重定向
  useEffect(() => {
    if (session && !isSuperAdmin && (session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, isSuperAdmin, router]);

  if (!isSuperAdmin && (session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">无权访问此页面</p>
      </div>
    );
  }'''

new_session = '''  const supabase = createClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const isSuperAdmin = userRole === "SUPERADMIN";

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const role = (user.app_metadata as Record<string, unknown>)?.role as string || "VISITOR";
      setUserRole(role);
      if (role !== "SUPERADMIN" && role !== "ADMIN") {
        router.push("/dashboard");
      }
    });
  }, [supabase, router]);

  if (userRole === null) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (userRole !== "SUPERADMIN" && userRole !== "ADMIN") {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">无权访问此页面</p>
      </div>
    );
  }'''

content = content.replace(old_session, new_session)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done: users/page.tsx")
