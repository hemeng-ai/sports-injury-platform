# 更新日志

所有值得注意的变更记录于此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [v0.2.0] — 2026-05-20

### 阶段：体验优化阶段

### 主要变更

#### UI 视觉优化
- 全局色彩系统重建：背景层级 `#0D1117` → `#161B22` → `#1C2128`，主交互色改为蓝绿 `#06B6D4`
- 卡片质感升级：玻璃效果（backdrop-blur）、悬浮阴影、hover 边框高亮
- 侧边栏选中状态优化：左侧 3px 竖条指示器 + 主色高亮文字 + 底部用户信息区
- 字体优化：中文优先 `Noto Sans SC` / `PingFang SC`，数值内容使用 `IBM Plex Mono` / `JetBrains Mono`

#### Dashboard 增强
- 统计卡片三栏布局：图标 + 大字数字（滚动动画）+ 迷你折线图 Sparkline
- 空状态引导区：三张快速开始卡片（上传文件 / 创建指标 / 管理用户）
- 最近活动时间线：展示最近 5 条操作记录，空状态占位文字

#### 文件管理优化
- 空状态重设计：线条风格插画 SVG + 引导文案 + 上传按钮
- 快捷筛选标签：替换下拉框，支持多选标签组 [全部] [PDF] [Word] [Excel] [图片] [其他]
- 文件列表行优化：文件图标按类型变色 + 完整操作列 + AlertDialog 删除确认

#### 数据分析增强
- 描述统计卡片网格：均值跨两列 + 小卡片并排展示，数值使用 monospace 字体
- 图表空状态：虚线边框占位框 + 引导文案

#### 用户体验细节
- Toast 通知统一：密码提醒改为 sonner warning toast（附"去修改"链接）
- 密码修改表单增强：显示/隐藏切换（Eye/EyeOff）、强度指示器（4 格进度条）、Loading 状态、行内错误提示
- 骨架屏补全：Dashboard 卡片、文件列表（5 行骨架行）、图表区域
- 路由切换进度条：集成 nextjs-toploader，使用主色 `#06B6D4`

#### 功能完善
- **操作日志**：新增 AuditLog 数据模型 + API + 用户管理页"操作日志"Tab，记录操作人/类型/对象/时间，超级管理员可见
- **文件批量操作**：支持多选（Checkbox）+ 批量操作栏（批量下载、批量删除含确认弹窗）
- **指标导出**：指标体系页添加"导出 Excel"按钮，使用 xlsx 库导出当前筛选结果

### 技术变更
- 新增依赖：`nextjs-toploader`
- 新增数据模型：`AuditLog`（关联 User）
- 新增 API 路由：`/api/dashboard/activity`、`/api/audit-log`
- 更新 CSS：全局变量从 OKLCH 迁移至 hex 色值

---

## [v0.1.0] — 初始版本

### 阶段：核心功能阶段

- Next.js 15 App Router + React 19 框架搭建
- shadcn/ui (new-york 暗色主题) + TailwindCSS 4
- NextAuth v5 (Credentials + JWT) 认证体系
- Prisma + SQLite 数据持久化
- 文件管理：拖拽上传、树状目录、搜索筛选、软删除
- 指标体系：CRUD、分类管理、Excel 自动映射
- 数据分析：描述统计、Pearson 相关性、线性趋势、图表可视化
- 三级角色权限：Visitor / Admin / SuperAdmin
- 227 个测试用例覆盖
