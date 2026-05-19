"use client";

// 树视图容器 — 加载数据、提供 TreeProvider、渲染 TreeNode 列表
import { useEffect, useCallback } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TreeProvider, useTreeContext } from "./tree-context";
import TreeNode from "./TreeNode";
import { toast } from "sonner";
import { useState } from "react";

interface TreeViewProps {
  folderType?: string;
  onSelectFolder?: (folderId: string) => void;
}

function TreeContent({ folderType, onSelectFolder }: TreeViewProps) {
  const { treeData, setTreeData, selectNode, selectedId, expandedIds, toggleExpand, addChildNode } = useTreeContext();
  const [loading, setLoading] = useState(true);
  const [addingRoot, setAddingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState("");

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folderType) params.set("type", folderType);
      const res = await fetch(`/api/folders?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setTreeData(data);
    } catch {
      toast.error("加载文件夹树失败");
    }
    setLoading(false);
  }, [folderType, setTreeData]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    if (selectedId && onSelectFolder) {
      onSelectFolder(selectedId);
    }
  }, [selectedId, onSelectFolder]);

  const handleAddRoot = useCallback(async () => {
    const trimmed = newRootName.trim();
    if (!trimmed) { setAddingRoot(false); return; }
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, type: folderType || "INJURY" }),
      });
      if (!res.ok) throw new Error("Create failed");
      const created = await res.json();
      addChildNode(null, { ...created, children: [], fileCount: 0 });
      toast.success(`已创建：${trimmed}`);
    } catch {
      toast.error("创建根文件夹失败");
    }
    setAddingRoot(false);
    setNewRootName("");
  }, [newRootName, folderType, addChildNode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {folderType === "INJURY" ? "资料目录" : folderType === "INDICATOR" ? "指标体系" : "数据分析"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setAddingRoot(true)}
          title="新建根文件夹"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {addingRoot && (
        <div className="px-2 mb-2">
          <Input
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onBlur={handleAddRoot}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRoot();
              if (e.key === "Escape") { setAddingRoot(false); setNewRootName(""); }
            }}
            placeholder="文件夹名称..."
            className="h-7 text-sm"
            autoFocus
          />
        </div>
      )}

      {treeData.length === 0 && !addingRoot && (
        <p className="text-xs text-muted-foreground px-2 py-4 text-center">
          暂无文件夹，点击 + 创建
        </p>
      )}

      {treeData.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

export default function TreeView(props: TreeViewProps) {
  return (
    <TreeProvider>
      <TreeContent {...props} />
    </TreeProvider>
  );
}
