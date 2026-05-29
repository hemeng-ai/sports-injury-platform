const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("请设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const users = [
  { username: "admin", email: "admin@sports-injury.local", password: "admin123", role: "SUPERADMIN" },
  { username: "doctor", email: "doctor@sports-injury.local", password: "doctor123", role: "ADMIN" },
  { username: "visitor", email: "visitor@sports-injury.local", password: "visitor123", role: "VISITOR" },
];

async function migrate() {
  for (const u of users) {
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      app_metadata: { role: u.role },
    });

    if (error) {
      console.log(`${u.username}: 已存在或创建失败 — ${error.message}`);
      continue;
    }

    console.log(`${u.username}: Supabase Auth 创建成功 (${authData.user.id})`);

    await prisma.user.update({
      where: { username: u.username },
      data: {
        email: u.email,
        supabaseUserId: authData.user.id,
      },
    });
    console.log(`${u.username}: Prisma User 关联完成`);
  }

  await prisma.$disconnect();
  console.log("迁移完成！");
}

migrate().catch(console.error);
