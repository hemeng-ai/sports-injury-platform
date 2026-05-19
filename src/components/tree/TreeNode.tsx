"use client";

// 递归树节点组件 — 支持展开/收起、右键菜单、拖拽
import { useState, useCallback } from "react";
import { ChevronRight, Folder, FolderOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTreeContext, type TreeNode as TreeNodeType } from "./tree-context";
import { Input } from "@/components/ui/input";

interface Props {
  node: TreeNodeType;
  depth?: number;
}

export default function TreeNode({ node, depth = 0 }: Props) {
  const {
    expandedIds, toggleExpand,
    selectedId, selectNode,
    renameNode, removeNode, addChildNode,
  } = useTreeContext();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  // 右键菜单 — 创建子文件夹
  const handleCreateChild = useCallback(() => {
    setAdding(true);
  }, []);

  // 右键菜单 — 重命名
  const handleRename = useCallback(() => {
    setEditing(true);
    setEditName(node.name);
  }, [node.name]);

  // 右键菜单 — 删除
  const handleDelete = useCallback(async () => {
    if (!confirm(`确定删除文件夹 "${node.name}" 及其所有内容？`)) return;
    try {
      const res = await fetch(`/api/folders/${node.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      removeNode(node.id);
    } catch {
      alert("删除失败");
    }
  }, [node.id, node.name, removeNode]);

  const submitRename = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === node.name) { setEditing(false); return; }
    try {
      const res = await fetch(`/api/folders/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Rename failed");
      renameNode(node.id, trimmed);
    } catch {
      alert("重命名失败");
    }
    setEditing(false);
  }, [editName, node.id, node.name, renameNode]);

  const submitNewChild = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setAdding(false); return; }
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, parentId: node.id, type: node.type }),
      });
      if (!res.ok) throw new Error("Create failed");
      const created = await res.json();
      addChildNode(node.id, created);
      // 自动展开父节点
      toggleExpand(node.id);
    } catch {
      alert("创建失败");
    }
    setAdding(false);
    setNewName("");
  }, [newName, node.id, node.type, addChildNode, toggleExpand]);

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors group",
              isSelected
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => {
              selectNode(node.id);
              if (hasChildren) toggleExpand(node.id);
            }}
          >
            {/* 展开/收起箭头 */}
            <span className="w-4 flex-shrink-0 flex items-center justify-center">
              {hasChildren ? (
                <ChevronRight
                  className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")}
                />
              ) : null}
            </span>

            {/* 文件夹图标 */}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-400" />
            ) : (
              <Folder className="h-4 w-4 flex-shrink-0 text-amber-400" />
            )}

            {/* 名称 */}
            {editing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setEditing(false); }}
                className="h-6 px-1 py-0 text-sm flex-1"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{node.name}</span>
            )}

            {/* 操作按钮（hover 可见） */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-0.5 rounded hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); handleCreateChild(); }}
                title="新建子文件夹"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleCreateChild}>
            <Plus className="h-4 w-4 mr-2" />
            新建子文件夹
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleRename}>
            <Pencil className="h-4 w-4 mr-2" />
            重命名
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            删除文件夹
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* 子节点 */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}

      {/* 新建子文件夹输入框 */}
      {adding && (
        <div
          className="flex items-center gap-1.5 py-1 px-2"
          style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={submitNewChild}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNewChild();
              if (e.key === "Escape") { setAdding(false); setNewName(""); }
            }}
            placeholder="输入文件夹名称..."
            className="h-7 text-sm"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
