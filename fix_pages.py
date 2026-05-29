import os, re
os.chdir(r"D:\ClaudeWorkSpace\my_project\sports-injury-platform")

files = [
    r"src\app\(dashboard)\settings\page.tsx",
    r"src\app\(dashboard)\files\page.tsx",
    r"src\app\(dashboard)\indicators\page.tsx",
    r"src\app\(dashboard)\analysis\page.tsx",
]

for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace import
    content = content.replace(
        'import { useSession } from "next-auth/react";',
        'import { createClient } from "@/lib/supabase-client";'
    )

    # Replace const { data: session } = useSession(); with useEffect pattern
    old = '  const { data: session } = useSession();'
    new = '''  const supabase = createClient();
  const [session, setSession] = useState<{ user?: { role?: string; id?: string; name?: string } } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSession({ user: { role: (user.app_metadata as Record<string, unknown>)?.role as string, id: user.id, name: user.email } });
      }
    });
  }, [supabase]);'''

    # Only add useState/useEffect imports if they don't exist yet
    if 'useState' not in content and "import { useState" not in content:
        content = content.replace('import { useEffect', 'import { useEffect, useState')

    content = content.replace(old, new)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Done: {path}")
