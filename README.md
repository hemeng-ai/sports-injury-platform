# 运动损伤资料管理与指标分析平台（V1）

基于 Next.js 15 全栈单体应用的运动医学数据管理平台。支持运动损伤资料管理、指标体系整理、Excel 数据读取、轻量统计分析和文件归档共享。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 15 App Router + React 19 |
| 语言 | TypeScript（strict） |
| UI | TailwindCSS 4 + shadcn/ui（new-york 风格，深色主题） |
| 数据库 | Prisma ORM + SQLite |
| 认证 | NextAuth v5（Credentials Provider + JWT） |
| 图表 | Recharts |
| Excel | SheetJS (xlsx) |
| 部署 | Docker / Docker Compose |

## 快速开始

### 环境要求

- Node.js 22+
- Git

### 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量
cp .env.example .env
# 编辑 .env，修改 AUTH_SECRET 为随机字符串

# 3. 初始化数据库
npx prisma db push

# 4. 填充种子数据
npm run prisma:seed

# 5. 启动开发服务器
npm run dev

# 6. 访问 http://localhost:3000
# 默认管理员账号: admin / admin123
```

### Docker 一键部署

```bash
# 启动
docker-compose up -d

# 初始化数据库（首次运行）
docker exec sports-injury-platform npx prisma db push
docker exec sports-injury-platform npm run prisma:seed

# 访问 http://localhost:3000
```

## 角色权限

| 角色 | 权限 |
|---|---|
| **Visitor（游客）** | 浏览资料、查看指标、查看分析结果、搜索文件 |
| **Admin（管理员）** | 上传/删除文件、创建分类、编辑指标、管理 Excel 数据 |
| **SuperAdmin（超级管理员）** | 全部权限 + 管理用户 + 系统配置 |

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── login/              # 登录页
│   ├── dashboard/          # Dashboard 首页
│   ├── files/              # 文件管理
│   ├── indicators/         # 指标体系
│   ├── analysis/           # 数据分析
│   ├── users/              # 用户管理
│   └── settings/           # 系统设置
├── api/                    # API Routes
│   ├── auth/               # 认证 API
│   ├── files/              # 文件 CRUD
│   ├── folders/            # 文件夹树管理
│   ├── indicators/         # 指标 CRUD + 分类
│   ├── excel/              # Excel 解析
│   └── analysis/           # 统计分析
├── components/             # React 组件
│   ├── ui/                 # shadcn/ui 组件
│   ├── layout/             # Navbar/Sidebar/Breadcrumb
│   ├── tree/               # 树状目录组件
│   ├── files/              # 文件管理组件
│   └── auth/               # 认证守卫
├── lib/                    # 工具库
│   ├── prisma.ts           # Prisma 单例
│   ├── auth.ts             # NextAuth 配置
│   ├── rbac.ts             # RBAC 权限控制
│   ├── excel-parser.ts     # Excel 解析引擎
│   ├── statistics.ts       # 统计计算
│   └── upload.ts           # 文件上传工具
└── types/                  # TypeScript 类型定义
```

## 核心功能

- **文件管理**：拖拽上传、批量上传、搜索筛选、预览下载、软删除
- **树状目录**：递归文件夹树、右键菜单、展开收起、权限控制
- **指标体系**：指标 CRUD、分类管理、Excel 自动映射
- **Excel 解析**：上传解析 Sheet/表头/数据列、自动识别指标类型
- **统计分析**：描述统计（mean/max/min/stdev）、Pearson 相关性、线性趋势
- **图表**：散点图、折线图、柱状图、趋势线
- **权限管理**：三级角色（Visitor/Admin/SuperAdmin）、RBAC 路由守卫

## 测试

```bash
npm test
# 227 个测试用例，覆盖 API/组件/工具层
```

## 后续迁移 PostgreSQL

1. `.env` 中 `DATABASE_URL` 改为 PostgreSQL 连接串
2. `prisma/schema.prisma` 中 `provider = "sqlite"` 改为 `"postgresql"`
3. 重新运行 `npx prisma db push`
