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

interface CreditUsageRecord {
  id: number;
  record_no: string;
  task_type: string;
  task_description?: string;
  credits_consumed: number;
  credits_remaining: number;
  task_status: string;
  external_provider?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface CreditUsageRecordsResponse {
  records: CreditUsageRecord[];
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

export default function CreditUsageRecords() {
  const [records, setRecords] = useState<CreditUsageRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    task_type: '',
    task_status: '',
    page: 1
  });

  // 获取积分使用记录
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.task_type) params.append('task_type', filters.task_type);
      if (filters.task_status) params.append('task_status', filters.task_status);
      params.append('page', filters.page.toString());
      params.append('limit', '20');

      const response = await fetch(`/api/credit-usage-records?${params.toString()}`);
      const result = await response.json();

      if (result.code === 0) {
        const data: CreditUsageRecordsResponse = result.data;
        setRecords(data.records);
        setPagination(data.pagination);
      } else {
        console.error('获取积分使用记录失败:', result.message);
      }
    } catch (error) {
      console.error('获取积分使用记录错误:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
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

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt || !completedAt) return '-';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    return `${seconds}秒`;
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            积分使用记录
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 筛选器 */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">筛选:</span>
            </div>

            <Select value={filters.task_type} onValueChange={(value) => handleFilterChange('task_type', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="任务类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部类型</SelectItem>
                <SelectItem value="ai_image_edit">AI图片编辑</SelectItem>
                <SelectItem value="ai_text_generation">AI文本生成</SelectItem>
                <SelectItem value="ai_video_generation">AI视频生成</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.task_status} onValueChange={(value) => handleFilterChange('task_status', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部状态</SelectItem>
                <SelectItem value="pending">等待中</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecords}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          {/* 记录表格 */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务类型</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>消耗积分</TableHead>
                  <TableHead>剩余积分</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>服务商</TableHead>
                  <TableHead>耗时</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {loading ? '加载中...' : '暂无记录'}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="font-medium">
                          {taskTypeLabels[record.task_type] || record.task_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={record.task_description}>
                          {record.task_description || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-red-600">
                          -{record.credits_consumed}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {record.credits_remaining}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(record.task_status)}>
                          {taskStatusLabels[record.task_status] || record.task_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.external_provider || '-'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(record.started_at, record.completed_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(record.created_at)}
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
                共 {pagination.total} 条记录，第 {pagination.page} / {pagination.pages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}