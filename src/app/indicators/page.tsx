"use client";

// 指标体系管理页面 — 指标表格 + 创建/编辑 + Excel 导入
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Search, Plus, Pencil, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface Indicator {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  normalRange: string | null;
  riskThreshold: string | null;
  testMethod: string | null;
  dataSource: string | null;
  categoryId: string;
  category?: { id: string; name: string };
  createdAt: string;
}

interface IndicatorCategory {
  id: string;
  name: string;
}

interface ExcelParseResult {
  fileName: string;
  sheetNames: string[];
  sheets: { name: string; headers: string[]; rowCount: number }[];
  suggestedIndicatorMappings: {
    columnName: string;
    suggestedCategory: string;
    confidence: string;
    sampleValues: string[];
  }[];
}

export default function IndicatorsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as string | undefined;
  const canEdit = userRole === "ADMIN" || userRole === "SUPERADMIN";

  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<IndicatorCategory[]>([]);

  // Dialog 状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Indicator | null>(null);

  // Excel 相关
  const [excelResult, setExcelResult] = useState<ExcelParseResult | null>(null);
  const [excelUploading, setExcelUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  // 加载分类列表
  useEffect(() => {
    fetch("/api/indicators/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const fetchIndicators = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/indicators?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setIndicators(data.indicators);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error("加载指标列表失败");
    }
    setLoading(false);
  }, [categoryFilter, search, page]);

  useEffect(() => { fetchIndicators(); }, [fetchIndicators]);

  // Excel 上传解析
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/excel/parse", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "解析失败"); return; }
      const data = await res.json();
      setExcelResult(data);
      setActiveTab("excel");
      toast.success(`已解析 ${data.sheetNames.length} 个 Sheet`);
    } catch {
      toast.error("Excel 解析失败");
    }
    setExcelUploading(false);
    e.target.value = "";
  };

  // 从 Excel 建议创建指标
  const handleCreateFromExcel = async (mapping: ExcelParseResult["suggestedIndicatorMappings"][0]) => {
    // 根据分类名称找到 categoryId
    const catId = categories.find((c) => c.name === mapping.suggestedCategory)?.id;
    if (!catId) {
      // 如果分类不存在，先创建
      try {
        const res = await fetch("/api/indicators/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: mapping.suggestedCategory }),
        });
        const cat = await res.json();
        await saveIndicator(mapping.columnName, cat.id);
      } catch {
        toast.error("创建指标分类失败");
      }
    } else {
      await saveIndicator(mapping.columnName, catId);
    }
  };

  const saveIndicator = async (name: string, categoryId: string) => {
    const res = await fetch("/api/indicators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, categoryId }),
    });
    if (res.ok) {
      toast.success(`已创建指标：${name}`);
      fetchIndicators();
    }
  };

  // 删除指标
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除指标 "${name}"？`)) return;
    try {
      await fetch(`/api/indicators/${id}`, { method: "DELETE" });
      toast.success("已删除");
      fetchIndicators();
    } catch {
      toast.error("删除失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">指标体系</h1>
          <p className="text-sm text-muted-foreground mt-1">管理运动损伤评估指标与Excel数据导入</p>
        </div>
        <div className="flex gap-2">
          {/* Excel 上传按钮 */}
          <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent ${excelUploading ? "opacity-50 pointer-events-none" : ""}`}>
            <FileSpreadsheet className="h-4 w-4" />
            {excelUploading ? "解析中..." : "导入 Excel"}
            <input type="file" accept=".xls,.xlsx" className="hidden" onChange={handleExcelUpload} disabled={excelUploading} />
          </label>
          {canEdit && (
            <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />新建指标
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">指标列表</TabsTrigger>
          {excelResult && (
            <TabsTrigger value="excel">
              Excel 预览 ({excelResult.sheetNames.length} sheets)
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          {/* 搜索筛选栏 */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="搜索指标名称..."
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 指标表格 */}
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">加载中...</p>
          ) : indicators.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">暂无指标</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>指标名称</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>正常范围</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicators.map((ind) => (
                  <TableRow key={ind.id}>
                    <TableCell className="font-medium">{ind.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ind.category?.name || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ind.unit || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{ind.normalRange || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {ind.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => { setEditItem(ind); setDialogOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(ind.id, ind.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />上一页
              </Button>
              <span className="text-sm text-muted-foreground px-3">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                下一页<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Excel 预览 Tab */}
        {excelResult && (
          <TabsContent value="excel" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {excelResult.sheets.map((sheet, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-sm">{sheet.name}</h3>
                  <p className="text-xs text-muted-foreground">{sheet.rowCount} 行 × {sheet.headers.length} 列</p>
                  {sheet.headers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sheet.headers.slice(0, 8).map((h) => (
                        <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
                      ))}
                      {sheet.headers.length > 8 && (
                        <Badge variant="secondary" className="text-xs">+{sheet.headers.length - 8} more</Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 指标映射建议 */}
            {excelResult.suggestedIndicatorMappings.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">建议创建的指标</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {excelResult.suggestedIndicatorMappings.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                      <div>
                        <span className="font-medium text-sm">{m.columnName}</span>
                        <Badge className="ml-2" variant="outline">{m.suggestedCategory}</Badge>
                        <span className="text-xs text-muted-foreground ml-2">
                          示例: {m.sampleValues.slice(0, 3).join(", ")}
                        </span>
                      </div>
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => handleCreateFromExcel(m)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />创建
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* 创建/编辑指标 Dialog */}
      <IndicatorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        item={editItem}
        categories={categories}
        onSaved={fetchIndicators}
      />
    </div>
  );
}

// 创建/编辑指标对话框
function IndicatorDialog({
  open, onClose, item, categories, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  item: Indicator | null;
  categories: IndicatorCategory[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "", description: "", unit: "", normalRange: "",
    riskThreshold: "", testMethod: "", dataSource: "", categoryId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        description: item.description || "",
        unit: item.unit || "",
        normalRange: item.normalRange || "",
        riskThreshold: item.riskThreshold || "",
        testMethod: item.testMethod || "",
        dataSource: item.dataSource || "",
        categoryId: item.categoryId,
      });
    } else {
      setForm({ name: "", description: "", unit: "", normalRange: "", riskThreshold: "", testMethod: "", dataSource: "", categoryId: "" });
    }
  }, [item, open]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.categoryId) return;
    setSaving(true);
    try {
      const url = item ? `/api/indicators/${item.id}` : "/api/indicators";
      const method = item ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Save failed");
      toast.success(item ? "指标已更新" : "指标已创建");
      onSaved();
      onClose();
    } catch {
      toast.error("保存失败");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{item ? "编辑指标" : "新建指标"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="col-span-2">
            <Label>指标名称 *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 ACL_LSI" />
          </div>
          <div>
            <Label>分类 *</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>单位</Label>
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="如 % / cm / °" />
          </div>
          <div>
            <Label>正常范围</Label>
            <Input value={form.normalRange} onChange={(e) => setForm({ ...form, normalRange: e.target.value })} placeholder="如 >90%" />
          </div>
          <div>
            <Label>风险阈值</Label>
            <Input value={form.riskThreshold} onChange={(e) => setForm({ ...form, riskThreshold: e.target.value })} />
          </div>
          <div>
            <Label>测试方法</Label>
            <Input value={form.testMethod} onChange={(e) => setForm({ ...form, testMethod: e.target.value })} />
          </div>
          <div>
            <Label>数据来源</Label>
            <Input value={form.dataSource} onChange={(e) => setForm({ ...form, dataSource: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>描述</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="指标描述说明..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.categoryId}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
