"use client";

// 树状结构状态管理
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface TreeNode {
  id: string;
  name: string;
  parentId: string | null;
  type: string;
  sortOrder: number;
  fileCount?: number;
  children: TreeNode[];
}

interface TreeContextValue {
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  setExpandedAll: (ids: string[]) => void;
  selectedId: string | null;
  selectNode: (id: string | null) => void;
  treeData: TreeNode[];
  setTreeData: (data: TreeNode[]) => void;
  renameNode: (id: string, name: string) => void;
  removeNode: (id: string) => void;
  addChildNode: (parentId: string | null, node: TreeNode) => void;
  moveNode: (id: string, newParentId: string | null, newSortOrder: number) => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);

export function useTreeContext() {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("useTreeContext must be used within TreeProvider");
  return ctx;
}

export function TreeProvider({ children }: { children: ReactNode }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [treeData, setTreeDataState] = useState<TreeNode[]>([]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setExpandedAll = useCallback((ids: string[]) => {
    setExpandedIds(new Set(ids));
  }, []);

  const selectNode = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const setTreeData = useCallback((data: TreeNode[]) => {
    setTreeDataState(data);
  }, []);

  // 乐观更新辅助函数
  const renameNode = useCallback((id: string, name: string) => {
    setTreeDataState((prev) => updateNodeInTree(prev, id, { name }));
  }, []);

  const removeNode = useCallback((id: string) => {
    setTreeDataState((prev) => removeNodeFromTree(prev, id));
  }, []);

  const addChildNode = useCallback((parentId: string | null, node: TreeNode) => {
    if (!parentId) {
      setTreeDataState((prev) => [...prev, node]);
    } else {
      setTreeDataState((prev) => addChildInTree(prev, parentId, node));
    }
  }, []);

  const moveNode = useCallback((_id: string, _newParentId: string | null, _newSortOrder: number) => {
    // 拖拽排序暂时通过刷新树来反映
  }, []);

  return (
    <TreeContext.Provider
      value={{
        expandedIds, toggleExpand, setExpandedAll,
        selectedId, selectNode,
        treeData, setTreeData,
        renameNode, removeNode, addChildNode, moveNode,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
}

// 递归更新树中的某个节点
function updateNodeInTree(nodes: TreeNode[], id: string, updates: Partial<TreeNode>): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, ...updates };
    if (node.children.length > 0) {
      return { ...node, children: updateNodeInTree(node.children, id, updates) };
    }
    return node;
  });
}

// 递归删除树中的某个节点
function removeNodeFromTree(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeNodeFromTree(node.children, id),
    }));
}

// 向树的某个父节点添加子节点
function addChildInTree(nodes: TreeNode[], parentId: string, child: TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, child] };
    }
    if (node.children.length > 0) {
      return { ...node, children: addChildInTree(node.children, parentId, child) };
    }
    return node;
  });
}
