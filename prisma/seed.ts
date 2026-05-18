// prisma/seed.ts — 初始数据填充脚本
// 运行方式: npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("[Seed] 开始填充初始数据...");

  // 检查是否已存在 SuperAdmin
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (existingAdmin) {
    console.log("[Seed] SuperAdmin 已存在，跳过用户创建");
  } else {
    // 创建 SuperAdmin
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        username: "admin",
        password: hashedPassword,
        role: "SUPERADMIN",
      },
    });
    console.log("[Seed] SuperAdmin 创建完成 (admin/admin123)");
  }

  // 创建默认指标分类
  const defaultCategories = [
    { name: "力量", description: "肌力评估相关指标" },
    { name: "平衡", description: "平衡能力评估相关指标" },
    { name: "柔韧性", description: "关节柔韧性相关指标" },
    { name: "爆发力", description: "爆发力测试相关指标" },
    { name: "关节活动度", description: "ROM 关节活动度相关指标" },
    { name: "步态", description: "步态分析相关指标" },
    { name: "疼痛评分", description: "VAS/NPRS 等疼痛评估指标" },
  ];

  for (const cat of defaultCategories) {
    const existing = await prisma.indicatorCategory.findUnique({
      where: { name: cat.name },
    });
    if (!existing) {
      await prisma.indicatorCategory.create({ data: cat });
      console.log(`[Seed] 指标分类创建: ${cat.name}`);
    }
  }

  console.log("[Seed] 初始数据填充完成");
}

main()
  .catch((e) => {
    console.error("[Seed] 错误:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
