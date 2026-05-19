"use client";

// 文件列表组件 — 表格视图，含操作按钮
import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye, Download, Trash2, FileText, Image, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/upload";
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
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-green-400" />;
  if (mimeType.startsWith("application/pdf")) return <FileText className="h-5 w-5 text-red-400" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <FileText className="h-5 w-5 text-blue-400" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

function getFileTypeBadge(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Badge variant="outline">图片</Badge>;
  if (mimeType.includes("pdf")) return <Badge variant="outline">PDF</Badge>;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <Badge variant="outline">Excel</Badge>;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <Badge variant="outline">Word</Badge>;
  return <Badge variant="outline">其他</Badge>;
}

export default function FileList({ files, loading, userRole, onDelete }: Props) {
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const canDelete = userRole === "ADMIN" || userRole === "SUPERADMIN";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p>暂无文件</p>
      </div>
    );
  }

  return (
    <>
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
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell>{getFileIcon(file.mimeType)}</TableCell>
              <TableCell className="font-medium max-w-[260px] truncate" title={file.originalName}>
                {file.originalName}
              </TableCell>
              <TableCell>{getFileTypeBadge(file.mimeType)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
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
                    onClick={() => window.open(file.path, "_blank")}
                    title="下载"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`确定删除 "${file.originalName}"？`)) {
                          onDelete(file.id);
                        }
                      }}
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

      {previewFile && (
        <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </>
  );
}
