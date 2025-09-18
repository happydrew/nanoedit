import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { getUserCreditUsageRecords } from "@/models/creditUsageRecord";
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

    // 获取积分使用记录
    const result = await getUserCreditUsageRecords(query);

    // 格式化返回数据，隐藏敏感信息
    const formattedRecords = result.records.map(record => ({
      id: record.id,
      record_no: record.record_no,
      task_type: record.task_type,
      task_description: record.task_description,
      credits_consumed: record.credits_consumed,
      credits_remaining: record.credits_remaining,
      task_status: record.task_status,
      external_provider: record.external_provider,
      // 隐藏敏感字段：external_task_id, task_input, task_output
      error_message: record.error_message,
      started_at: record.started_at,
      completed_at: record.completed_at,
      created_at: record.created_at
    }));

    return respData({
      records: formattedRecords,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit)
      }
    });

  } catch (error) {
    console.error("获取积分使用记录失败:", error);
    return respErr("获取积分使用记录失败");
  }
}