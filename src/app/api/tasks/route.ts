import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { getUserTasks } from "@/models/task";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户UUID
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("未登录或认证失败");
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const task_type = searchParams.get("task_type") || undefined;
    const task_status = searchParams.get("task_status") || undefined;
    const date_from = searchParams.get("date_from") ? new Date(searchParams.get("date_from")!) : undefined;
    const date_to = searchParams.get("date_to") ? new Date(searchParams.get("date_to")!) : undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // 构建查询条件
    const query = {
      user_uuid,
      task_type,
      task_status,
      date_from,
      date_to,
      page,
      limit: Math.min(limit, 100) // 限制最大每页100条
    };

    // 获取任务列表
    const result = await getUserTasks(query);

    // 格式化返回数据，隐藏敏感信息
    const formattedTasks = result.tasks.map(task => ({
      id: task.id,
      task_type: task.task_type,
      credits_consumed: task.credits_consumed,
      credits_remaining: task.credits_remaining,
      task_status: task.task_status,
      // 隐藏敏感字段：external_task_id, external_provider
      error_message: task.error_message,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));

    return respData({
      tasks: formattedTasks,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit)
      }
    });

  } catch (error) {
    console.error("获取任务列表失败:", error);
    return respErr("获取任务列表失败");
  }
}