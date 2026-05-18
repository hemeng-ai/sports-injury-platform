# 运动损伤资料管理与指标分析平台

运动医学从业者在局域网内共享损伤资料与指标数据的全栈应用。

## 技术栈

- **框架**: Next.js 15 (App Router) + TypeScript
- **UI**: TailwindCSS 4 + shadcn/ui + Lucide Icons
- **数据库**: SQLite (via Prisma ORM)
- **认证**: NextAuth v5 (Credentials Provider + JWT)
- **图表**: Recharts
- **Excel**: SheetJS (xlsx)
- **拖拽**: dnd-kit + react-dropzone

## 快速启动

### 前提条件
- Node.js 18+
- Git

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npx prisma db push

# 3. 填充种子数据（创建 SuperAdmin: admin/admin123）
npm run prisma:seed

# 4. 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| SuperAdmin | admin | admin123 |

## 项目结构

```
src/
├── app/           # Next.js App Router 页面与 API
│   ├── api/       # API Routes
│   ├── login/     # 登录页
│   ├── dashboard/ # 仪表盘
│   ├── files/     # 文件管理
│   ├── indicators/# 指标体系
│   ├── analysis/  # 数据分析
│   ├── users/     # 用户管理
│   └── settings/  # 系统设置
├── components/    # React 组件
│   ├── ui/        # shadcn/ui 基础组件
│   ├── layout/    # 布局组件
│   ├── tree/      # 树形组件
│   ├── files/     # 文件组件
│   ├── indicators/# 指标组件
│   ├── analysis/  # 分析组件
│   └── auth/      # 认证组件
├── lib/           # 工具库
├── types/         # TypeScript 类型定义
└── middleware.ts  # Next.js 中间件
```

## 角色权限

| 权限 | VISITOR | ADMIN | SUPERADMIN |
|------|---------|-------|------------|
| 浏览文件/指标 | ✓ | ✓ | ✓ |
| 上传/编辑文件 | ✗ | ✓ | ✓ |
| 管理目录 | ✗ | ✓ | ✓ |
| 数据分析 | ✓ | ✓ | ✓ |
| 管理用户 | ✗ | ✗ | ✓ |

## Docker 部署

```bash
docker-compose up -d
```

详见 `docker-compose.yml` 配置。
