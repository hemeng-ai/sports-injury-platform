# 文件在线预览增强 — 设计文档

**日期**: 2026-05-22
**状态**: 已批准

## 背景

当前 FilePreview 组件仅支持图片和 PDF 预览，Word 和 Excel 文件显示"不支持在线预览"。用户需要在下载前确认文件内容。

## 设计

### 方案：纯客户端渲染

- Word (.docx) → `mammoth` 库解析 → 转 HTML 渲染
- Excel (.xlsx) → `xlsx` 库（已安装）解析 → 渲染为 HTML 表格
- 已有图片和 PDF 预览保持不变

### 改动范围

| 变更 | 文件 |
|---|---|
| 修改 | `src/components/files/FilePreview.tsx` |
| 新增依赖 | `mammoth` |

### 状态处理

每种预览类型：加载中 → 骨架动画 | 失败 → 错误提示 + 下载降级 | 成功 → 渲染内容

### 不做什么

- 不改后端 API
- 不新增路由
- .doc（旧格式）暂不支持，mammoth 仅支持 .docx

## 测试要点

- Word 预览：加载中/成功/失败三种状态
- Excel 预览：单Sheet/多Sheet切换/加载失败降级
- 图片/PDF：不受影响
