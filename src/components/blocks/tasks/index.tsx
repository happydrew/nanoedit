"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, CreditCard, Filter, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useTranslations } from "next-intl";

interface TaskRecord {
  id: string;
  task_type: string;
  credits_consumed: number;
  credits_remaining: number;
  task_status: string;
  external_provider?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface TasksResponse {
  tasks: TaskRecord[];
  pagination: PaginationInfo;
}

const taskTypeLabels: Record<string, string> = {
  'ai_image_edit': 'AI图片编辑',
  'ai_text_generation': 'AI文本生成',
  'ai_video_generation': 'AI视频生成',
};

const taskStatusLabels: Record<string, string> = {
  'pending': '等待中',
  'processing': '处理中',
  'success': '成功',
  'failed': '失败',
  'cancelled': '已取消',
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'success':
      return 'default';
    case 'failed':
      return 'destructive';
    case 'processing':
      return 'secondary';
    case 'pending':
      return 'outline';
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
};

export default function TaskManage() {
  const t = useTranslations();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    task_type: 'all',
    task_status: 'all',
    page: 1
  });

  // 获取任务列表
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.task_type && filters.task_type !== 'all') params.append('task_type', filters.task_type);
      if (filters.task_status && filters.task_status !== 'all') params.append('task_status', filters.task_status);
      params.append('page', filters.page.toString());
      params.append('limit', '20');

      const response = await fetch(`/api/tasks?${params.toString()}`);
      const result = await response.json();

      if (result.code === 0) {
        const data: TasksResponse = result.data;
        setTasks(data.tasks);
        setPagination(data.pagination);
      } else {
        console.error(t('tasks.errors.fetchFailed'), result.message);
      }
    } catch (error) {
      console.error(t('tasks.errors.fetchError'), error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // 重置到第一页
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('tasks.my_tasks')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 筛选器 */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">{t('tasks.filters.label')}</span>
            </div>

            <Select value={filters.task_type} onValueChange={(value) => handleFilterChange('task_type', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('tasks.filters.task_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.filters.all_types')}</SelectItem>
                <SelectItem value="ai_image_edit">{t('tasks.task_types.ai_image_edit')}</SelectItem>
                <SelectItem value="ai_text_generation">{t('tasks.task_types.ai_text_generation')}</SelectItem>
                <SelectItem value="ai_video_generation">{t('tasks.task_types.ai_video_generation')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.task_status} onValueChange={(value) => handleFilterChange('task_status', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('tasks.filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.filters.all_status')}</SelectItem>
                <SelectItem value="pending">{t('tasks.task_status.pending')}</SelectItem>
                <SelectItem value="processing">{t('tasks.task_status.processing')}</SelectItem>
                <SelectItem value="success">{t('tasks.task_status.success')}</SelectItem>
                <SelectItem value="failed">{t('tasks.task_status.failed')}</SelectItem>
                <SelectItem value="cancelled">{t('tasks.task_status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchTasks}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('tasks.refresh')}
            </Button>
          </div>

          {/* 任务表格 */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tasks.table.task_id')}</TableHead>
                  <TableHead>{t('tasks.table.task_type')}</TableHead>
                  <TableHead>{t('tasks.table.credits_consumed')}</TableHead>
                  <TableHead>{t('tasks.table.credits_remaining')}</TableHead>
                  <TableHead>{t('tasks.table.status')}</TableHead>
                  <TableHead>{t('tasks.table.created_at')}</TableHead>
                  <TableHead>{t('tasks.table.updated_at')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {loading ? t('tasks.loading') : t('tasks.no_tasks')}
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {task.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {t(`tasks.task_types.${task.task_type}`)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-red-600">
                          -{task.credits_consumed}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {task.credits_remaining}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(task.task_status)}>
                          {t(`tasks.task_status.${task.task_status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(task.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(task.updated_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('tasks.pagination.total_tasks', {
                  total: pagination.total,
                  page: pagination.page,
                  pages: pagination.pages
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  {t('tasks.pagination.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  {t('tasks.pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}