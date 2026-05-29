import os
os.chdir(r"D:\ClaudeWorkSpace\my_project\sports-injury-platform")

files = [
    r"src\app\api\auth\register\route.ts",
    r"src\app\api\auth\login\route.ts",
    r"src\app\api\auth\password\route.ts",
    r"src\app\api\admin\users\[id]\role\route.ts",
]

for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace module-level supabaseAdmin creation with lazy getter
    old = '''import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";
'''
    
    new = '''import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabaseAdmin;
}
'''
    
    # Check if the file has this import pattern
    if 'import { getUserFromRequest } from "@/lib/session"' in content:
        content = content.replace(old, new)
    else:
        # For login route which has different imports
        old2 = '''import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);'''
        new2 = '''import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabaseAdmin;
}'''
        content = content.replace(old2, new2)
    
    # For password route which has different imports
    old3 = '''import { createClient } from "@supabase/supabase-js";
import { checkApiPermission } from "@/lib/rbac";
import { getUserFromRequest } from "@/lib/session";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);'''
    new3 = '''import { createClient } from "@supabase/supabase-js";
import { checkApiPermission } from "@/lib/rbac";
import { getUserFromRequest } from "@/lib/session";

export const runtime = "nodejs";

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabaseAdmin;
}'''
    content = content.replace(old3, new3)

    # Replace all usages of supabaseAdmin with getSupabaseAdmin()
    content = content.replace("supabaseAdmin.auth", "getSupabaseAdmin().auth")
    content = content.replace("const supabaseAdmin", "const _supabaseAdmin")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Done: {path}")
