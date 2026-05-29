"use client";

// 文件预览组件 — 支持图片/PDF/Word/Excel 在线预览
import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2, AlertTriangle, Download } from "lucide-react";
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

type PreviewStatus = "loading" | "loaded" | "error";

/** 文件元信息 — 预览区下方统一展示 */
function FileMeta({ file }: { file: FileRecord }) {
  return (
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
  );
}

/** 加载骨架 */
function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
      <p className="text-sm text-muted-foreground">正在加载预览...</p>
    </div>
  );
}

/** 加载失败降级 — 显示错误 + 下载按钮 */
function PreviewError({ message, file }: { message: string; file: FileRecord }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
      <p className="text-sm font-medium text-foreground mb-1">预览失败</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-sm">{message}</p>
      <a
        href={file.path}
        download={file.originalName}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Download className="h-4 w-4" />
        下载文件
      </a>
    </div>
  );
}

// ======================== Word 预览 ========================

function WordPreview({ file }: { file: FileRecord }) {
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [html, setHtml] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(file.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      // mammoth 动态导入，减少首屏体积
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({ arrayBuffer: buf });
      setHtml(result.value);
      setStatus("loaded");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "无法解析 Word 文档");
      setStatus("error");
    }
  }, [file.path]);

  useEffect(() => { load(); }, [load]);

  if (status === "loading") return <LoadingSkeleton />;
  if (status === "error") return <PreviewError message={errorMsg} file={file} />;

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert p-4 border rounded-lg bg-white dark:bg-zinc-900 max-h-[60vh] overflow-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ======================== Excel 预览 ========================

function ExcelPreview({ file }: { file: FileRecord }) {
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [sheets, setSheets] = useState<{ name: string; html: string }[]>([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(file.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buf, { type: "array" });
      const sheetList = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const html = XLSX.utils.sheet_to_html(sheet, {
          id: `sheet-${name}`,
          editable: false,
        });
        return { name, html };
      });
      setSheets(sheetList);
      setActiveSheet(sheetList[0]?.name || "");
      setStatus("loaded");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "无法解析 Excel 文件");
      setStatus("error");
    }
  }, [file.path]);

  useEffect(() => { load(); }, [load]);

  if (status === "loading") return <LoadingSkeleton />;
  if (status === "error") return <PreviewError message={errorMsg} file={file} />;

  const currentHtml = sheets.find((s) => s.name === activeSheet)?.html || "";

  return (
    <div>
      {sheets.length > 1 && (
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {sheets.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setActiveSheet(s.name)}
              className={`px-3 py-1.5 text-xs rounded-t-md border border-b-0 transition-colors whitespace-nowrap ${
                s.name === activeSheet
                  ? "bg-background text-foreground font-medium border-border"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div
        className="border rounded-lg overflow-auto max-h-[60vh] bg-white dark:bg-zinc-900"
        dangerouslySetInnerHTML={{
          __html: currentHtml.replace(
            /<table/g,
            '<table class="w-full text-sm border-collapse"',
          ),
        }}
      />
    </div>
  );
}

// ======================== 主组件 ========================

export default function FilePreview({ file, onClose }: Props) {
  const isImage = file.mimeType.startsWith("image/");
  const isPDF = file.mimeType === "application/pdf";
  // 精确匹配，避免 .xlsx MIME（含 "officedocument"）误匹配 isWord
  const isExcel =
    file.mimeType.includes("spreadsheetml") ||
    file.mimeType === "application/vnd.ms-excel";
  const isWord =
    !isExcel &&
    (file.mimeType.includes("wordprocessingml") ||
     file.mimeType === "application/msword");

  const renderPreview = () => {
    if (isImage) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.path}
          alt={file.originalName}
          className="max-w-full max-h-[65vh] object-contain mx-auto rounded-lg"
        />
      );
    }

    if (isPDF) {
      return (
        <iframe
          src={file.path}
          className="w-full h-[70vh] rounded-lg border"
          title={file.originalName}
        />
      );
    }

    if (isExcel) {
      return <ExcelPreview file={file} />;
    }

    if (isWord) {
      return <WordPreview file={file} />;
    }

    // 不支持的类型
    return (
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
    );
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-base truncate pr-4">
            {file.originalName}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {renderPreview()}
          <FileMeta file={file} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
