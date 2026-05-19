"use client";

// 文件搜索与筛选组件
import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSearchChange: (search: string) => void;
  onTypeChange: (type: string) => void;
}

export default function FileSearch({ onSearchChange, onTypeChange }: Props) {
  const [searchValue, setSearchValue] = useState("");
  const [typeValue, setTypeValue] = useState("all");

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  const handleTypeChange = useCallback(
    (value: string) => {
      setTypeValue(value);
      onTypeChange(value === "all" ? "" : value);
    },
    [onTypeChange],
  );

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
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
      <Select value={typeValue} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="文件类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          <SelectItem value="image">图片</SelectItem>
          <SelectItem value="pdf">PDF</SelectItem>
          <SelectItem value="word">Word</SelectItem>
          <SelectItem value="excel">Excel</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
