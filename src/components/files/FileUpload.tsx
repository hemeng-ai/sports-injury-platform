"use client";

// 拖拽文件上传组件 — 基于 react-dropzone
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2, File as FileIcon } from "lucide-react";
import { toast } from "sonner";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, formatFileSize } from "@/lib/upload";

interface Props {
  currentFolderId?: string;
  onUploadComplete: () => void;
}

export default function FileUpload({ currentFolderId, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      setProgress(0);

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        if (currentFolderId) formData.append("folderId", currentFolderId);

        try {
          const res = await fetch("/api/files", { method: "POST", body: formData });
          if (!res.ok) {
            const data = await res.json();
            toast.error(data.error || "上传失败");
            continue;
          }
          toast.success(`${file.name} 上传成功`);
        } catch {
          toast.error(`${file.name} 上传失败，请重试`);
        }

        setProgress(Math.round(((i + 1) / acceptedFiles.length) * 100));
      }

      setUploading(false);
      setProgress(0);
      onUploadComplete();
    },
    [currentFolderId, onUploadComplete],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: MAX_FILE_SIZE,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-primary bg-primary/10"
          : "border-muted-foreground/25 hover:border-primary/50"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">上传中 {progress}%...</p>
          <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : isDragActive ? (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-primary" />
          <p className="text-sm font-medium">松开以添加文件</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <FileIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">拖拽文件到此处，或点击选择</p>
          <p className="text-xs text-muted-foreground">
            支持 Word / Excel / PDF / 图片（最大 50MB）
          </p>
        </div>
      )}
    </div>
  );
}
