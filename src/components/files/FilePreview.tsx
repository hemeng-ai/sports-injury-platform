"use client";

// 文件预览组件 — Dialog 弹窗预览
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import { formatFileSize } from "@/lib/upload-utils";

interface FileRecord {
  id: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface Props {
  file: FileRecord;
  onClose: () => void;
}

export default function FilePreview({ file, onClose }: Props) {
  const isImage = file.mimeType.startsWith("image/");
  const isPDF = file.mimeType === "application/pdf";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-base truncate pr-4">
            {file.originalName}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.path}
              alt={file.originalName}
              className="max-w-full max-h-[65vh] object-contain mx-auto rounded-lg"
            />
          ) : isPDF ? (
            <iframe
              src={file.path}
              className="w-full h-[70vh] rounded-lg border"
              title={file.originalName}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <p className="text-sm text-muted-foreground">此文件类型不支持在线预览</p>
              <p className="text-xs text-muted-foreground mt-1">
                请下载后使用本地应用打开
              </p>
              <a
                href={file.path}
                download={file.originalName}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                下载文件
              </a>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
            <div>
              <span className="font-medium">文件大小：</span>
              {formatFileSize(file.size)}
            </div>
            <div>
              <span className="font-medium">文件类型：</span>
              {file.mimeType}
            </div>
            <div>
              <span className="font-medium">上传时间：</span>
              {new Date(file.createdAt).toLocaleString("zh-CN")}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
