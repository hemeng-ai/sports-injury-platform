"use client";

// 用户管理页面 — v0.2.0: 用户列表 + 操作日志 Tab（超级管理员可见）
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, Shield, Clock, FileText, Upload, Trash2, UserPlus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface UserRecord {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

interface AuditLogRecord {
  id: string;
  action: string;
  target: string;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
  user: { username: string };
}

const ROLE_LABELS: Record<string, string> = {
  VISITOR: "游客",
  ADMIN: "管理员",
  SUPERADMIN: "超级管理员",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  VISITOR: "outline",
  ADMIN: "secondary",
  SUPERADMIN: "default",
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  UPLOAD: Upload,
  DELETE: Trash2,
  MODIFY: FileText,
  CREATE: UserPlus,
  LOGIN: Shield,
  EXPORT: FileText,
};

const ACTION_LABELS: Record<string, string> = {
  UPLOAD: "上传文件",
  DELETE: "删除",
  MODIFY: "修改",
  CREATE: "创建",
  LOGIN: "登录",
  EXPORT: "导出",
};

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "SUPERADMIN";

  // 非管理员重定向
  useEffect(() => {
    if (session && !isSuperAdmin && (session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, isSuperAdmin, router]);

  if (!isSuperAdmin && (session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">无权访问此页面</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理用户账户与查看操作日志</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          新建用户
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-1.5" />
            用户列表
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="logs">
              <Clock className="h-4 w-4 mr-1.5" />
              操作日志
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <UserListTab />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="logs" className="mt-4">
            <AuditLogTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/** 用户列表 Tab */
function UserListTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => toast.error("加载用户列表失败"))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchSearch = !search || u.username.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">加载中...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          所有用户
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 搜索筛选栏 */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户名..."
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部角色</SelectItem>
              <SelectItem value="SUPERADMIN">超级管理员</SelectItem>
              <SelectItem value="ADMIN">管理员</SelectItem>
              <SelectItem value="VISITOR">游客</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>注册时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_VARIANTS[u.role] || "outline"}>
                    {ROLE_LABELS[u.role] || u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** 操作日志 Tab */
function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-log?page=${page}&limit=30`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error("加载操作日志失败");
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">加载中...</CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
          <Clock className="h-10 w-10 mb-3 opacity-30" />
          <p>暂无操作记录</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          操作日志
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>操作人</TableHead>
              <TableHead>操作类型</TableHead>
              <TableHead>操作对象</TableHead>
              <TableHead>详情</TableHead>
              <TableHead>操作时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const ActionIcon = ACTION_ICONS[log.action] || FileText;
              return (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.user.username}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ActionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{ACTION_LABELS[log.action] || log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.target}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {log.detail || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一页
            </Button>
            <span className="text-sm text-muted-foreground px-3">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              下一页
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
