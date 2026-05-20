"use client";

// 文件搜索与快捷筛选标签组件 — v0.2.0
import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onSearchChange: (search: string) => void;
  onTypeChange: (type: string) => void;
}

/** 文件类型筛选标签配置 */
const TYPE_TAGS = [
  { value: "", label: "全部" },
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word" },
  { value: "excel", label: "Excel" },
  { value: "image", label: "图片" },
  { value: "other", label: "其他" },
];

export default function FileSearch({ onSearchChange, onTypeChange }: Props) {
  const [searchValue, setSearchValue] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set([""]));

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  const handleTagClick = useCallback(
    (value: string) => {
      const next = new Set<string>();
      // 点击 "全部"：清空其他选择
      if (value === "") {
        next.add("");
        setActiveTypes(next);
        onTypeChange("");
        return;
      }

      // 点击具体类型
      const current = new Set(activeTypes);
      current.delete(""); // 移除 "全部"
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      // 如果没有选中任何类型，回到 "全部"
      if (current.size === 0) {
        current.add("");
      }
      setActiveTypes(current);
      // 传递逗号分隔的类型列表
      const typeStr = current.has("")
        ? ""
        : [...current].join(",");
      onTypeChange(typeStr);
    },
    [activeTypes, onTypeChange],
  );

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="搜索文件名..."
          className="pl-9 pr-9"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchValue("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* 快捷筛选标签组 */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_TAGS.map((tag) => {
          const isActive = activeTypes.has(tag.value);
          return (
            <button
              key={tag.value}
              type="button"
              onClick={() => handleTagClick(tag.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                "border",
                isActive
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
