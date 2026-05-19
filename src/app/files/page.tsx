"use client";

// 文件管理页面 — 集成上传、搜索、列表、预览
import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UploadCloud, ChevronLeft, ChevronRight } from "lucide-react";
import FileUpload from "@/components/files/FileUpload";
import FileList from "@/components/files/FileList";
import FileSearch from "@/components/files/FileSearch";
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

export default function FilesPage() {
  const { data: session } = useSession();
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

  const userRole = session?.user?.role as string | undefined;
  const canUpload = userRole === "ADMIN" || userRole === "SUPERADMIN";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">文件管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理运动损伤相关资料文件
          </p>
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
  );
}
