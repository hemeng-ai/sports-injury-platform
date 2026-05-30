"use client";

// 文件列表组件 — v0.2.0: AlertDialog 删除确认 + 空状态优化 + 骨架行 + 批量操作
import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye, Download, Trash2, FileText, Image as ImageIcon, FileSpreadsheet, FolderOpen, X,
} from "lucide-react";
import { formatFileSize } from "@/lib/upload-utils";
import FilePreview from "./FilePreview";

interface FileRecord {
  id: string;
  name: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  tags: string;
  folderId: string;
  createdAt: string;
  uploader?: { id: string; username: string; role: string } | null;
}

interface Props {
  files: FileRecord[];
  loading: boolean;
  userRole?: string;
  onDelete: (id: string) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchDownload?: (ids: string[]) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-green-400" />;
  if (mimeType.startsWith("application/pdf")) return <FileText className="h-5 w-5 text-red-400" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <FileText className="h-5 w-5 text-blue-400" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

function getFileTypeLabel(mimeType: string) {
  if (mimeType.startsWith("image/")) return "图片";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Excel";
  if (mimeType.includes("word") || mimeType.includes("document")) return "Word";
  return "其他";
}

/** 骨架行 */
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="h-5 w-5 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="space-y-1.5">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
      </TableCell>
      <TableCell>
        <div className="h-5 w-12 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-14 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" />
      </TableCell>
    </TableRow>
  );
}

/** 空状态 */
function EmptyState({ onUpload }: { onUpload?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      {/* 线条风格插画式 SVG */}
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="mb-6 opacity-60">
        <rect x="20" y="30" width="50" height="40" rx="4" stroke="#06B6D4" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M35 45 L45 55 L55 42" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M75 25 L85 15 L95 25 L85 35 Z" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M85 35 L85 60" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M75 50 L95 50" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="85" cy="62" r="3" stroke="#06B6D4" strokeWidth="1" />
      </svg>
      <p className="text-base font-medium text-foreground mb-1.5">还没有任何文件</p>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        上传损伤影像、病例报告、文献资料，开始建立你的资料库
      </p>
      {onUpload && (
        <Button onClick={onUpload} className="bg-primary hover:bg-primary/90 text-white">
          <FolderOpen className="h-4 w-4 mr-2" />
          拖拽文件到此处，或点击上传
        </Button>
      )}
    </div>
  );
}

export default function FileList({
  files, loading, userRole, onDelete,
  onBatchDelete, onBatchDownload,
  selectedIds, onSelectionChange,
}: Props) {
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const canDelete = userRole === "ADMIN" || userRole === "SUPERADMIN";
  const canBatch = canDelete;

  const allSelected = files.length > 0 && files.every((f) => selectedIds.has(f.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(files.map((f) => f.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  if (loading) {
    return (
      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>文件名</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>大小</TableHead>
              <TableHead>上传者</TableHead>
              <TableHead>上传时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (files.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {/* 批量操作栏 */}
      {selectedIds.size > 0 && canBatch && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            已选 {selectedIds.size} 项
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onSelectionChange(new Set())}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            取消选择
          </Button>
          <div className="flex-1" />
          {onBatchDownload && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onBatchDownload([...selectedIds])}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              批量下载
            </Button>
          )}
          {onBatchDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              onClick={() => setBatchDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              批量删除
            </Button>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {canBatch && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="全选"
                  />
                </TableHead>
              )}
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>文件名</TableHead>
              <TableHead>类型</TableHead>
              <TableHead className="mono-value">大小</TableHead>
              <TableHead>上传者</TableHead>
              <TableHead>上传时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                {canBatch && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(file.id)}
                      onCheckedChange={() => toggleSelect(file.id)}
                      aria-label={`选择 ${file.originalName}`}
                    />
                  </TableCell>
                )}
                <TableCell>{getFileIcon(file.mimeType)}</TableCell>
                <TableCell className="font-medium max-w-[260px] truncate" title={file.originalName}>
                  {file.originalName}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getFileTypeLabel(file.mimeType)}</Badge>
                </TableCell>
                <TableCell className="mono-value text-sm">
                  {formatFileSize(file.size)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {file.uploader?.username || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(file.createdAt).toLocaleDateString("zh-CN")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPreviewFile(file)}
                      title="预览"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = file.path;
                        a.download = file.originalName;
                        a.click();
                      }}
                      title="下载"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(file)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 文件预览 */}
      {previewFile && (
        <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* 单个删除确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除「{deleteTarget?.originalName}」？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认弹窗 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量删除确认</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除已选的 {selectedIds.size} 个文件？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onBatchDelete?.([...selectedIds]);
                setBatchDeleteOpen(false);
                onSelectionChange(new Set());
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
