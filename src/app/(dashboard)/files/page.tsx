"use client";

// 文件管理页面 — 集成上传、搜索、列表、预览
import { useState, useCallback, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase-client";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UploadCloud, ChevronLeft, ChevronRight, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import FileUpload from "@/components/files/FileUpload";
import FileList from "@/components/files/FileList";
import FileSearch from "@/components/files/FileSearch";
import TreeView from "@/components/tree/TreeView";
import { toast } from "sonner";

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

function FilesPageContent() {
  const supabase = createClient();
  const [session, setSession] = useState<{ user?: { role?: string; id?: string; name?: string } } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSession({ user: { role: (user.app_metadata as Record<string, unknown>)?.role as string, id: user.id, name: user.email } });
      }
    });
  }, [supabase]);
  const searchParams = useSearchParams();
  const folderFromUrl = searchParams.get("folderId");

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(folderFromUrl || "");
  const [treeOpen, setTreeOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const userRole = session?.user?.role as string | undefined;
  const canUpload = userRole === "ADMIN" || userRole === "SUPERADMIN";

  const handleBatchDelete = async (ids: string[]) => {
    let successCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch { /* continue */ }
    }
    if (successCount > 0) {
      toast.success(`成功删除 ${successCount} 个文件`);
    }
    fetchFiles();
  };

  const handleBatchDownload = (ids: string[]) => {
    const targetFiles = files.filter((f) => ids.includes(f.id));
    for (const file of targetFiles) {
      const a = document.createElement("a");
      a.href = file.path;
      a.download = file.originalName;
      a.click();
    }
    toast.success(`开始下载 ${targetFiles.length} 个文件`);
  };

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.set("folderId", currentFolderId);
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/files?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFiles(data.files);
      setTotalPages(data.totalPages);
    } catch {
      toast.error("加载文件列表失败");
    }
    setLoading(false);
  }, [currentFolderId, search, typeFilter, page]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (folderFromUrl) setCurrentFolderId(folderFromUrl);
  }, [folderFromUrl]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("文件已删除");
      fetchFiles();
    } catch {
      toast.error("删除失败，请重试");
    }
  };

  return (
    <div className="flex gap-0 h-[calc(100vh-8rem)]">
      {/* 左侧文件夹树 */}
      <div className={`${treeOpen ? "w-60" : "w-0"} flex-shrink-0 transition-all duration-200 overflow-hidden border-r border-border bg-card/50`}>
        <div className="p-3 overflow-y-auto h-full">
          <TreeView
            folderType="INJURY"
            onSelectFolder={(folderId) => {
              setCurrentFolderId(folderId);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* 右侧文件管理 */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTreeOpen(!treeOpen)}
                title={treeOpen ? "收起目录" : "展开目录"}
              >
                {treeOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
              <div>
                <h1 className="text-2xl font-bold">文件管理</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  管理运动损伤相关资料文件
                </p>
              </div>
            </div>
            {canUpload && (
              <Button onClick={() => setShowUpload(!showUpload)} variant="outline">
                <UploadCloud className="h-4 w-4 mr-2" />
                {showUpload ? "收起上传" : "上传文件"}
              </Button>
            )}
          </div>

          {/* 上传区域 */}
          {showUpload && canUpload && (
            <FileUpload
              currentFolderId={currentFolderId}
              onUploadComplete={fetchFiles}
            />
          )}

          {/* 搜索筛选栏 */}
          <FileSearch
            onSearchChange={(s) => { setSearch(s); setPage(1); }}
            onTypeChange={(t) => { setTypeFilter(t); setPage(1); }}
          />

          {/* 文件列表 */}
          <FileList
            files={files}
            loading={loading}
            userRole={userRole}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onBatchDelete={handleBatchDelete}
            onBatchDownload={handleBatchDownload}
          />

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                上一页
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><p className="text-muted-foreground">加载中...</p></div>}>
      <FilesPageContent />
    </Suspense>
  );
}
