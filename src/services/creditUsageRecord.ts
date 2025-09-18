import {
  createCreditUsageRecord,
  updateCreditUsageRecord,
  CreateCreditUsageRecordData,
  UpdateCreditUsageRecordData
} from "@/models/creditUsageRecord";
import { getSnowId } from "@/lib/hash";
import { getUserCredits } from "@/services/credit";

// 任务类型枚举
export enum TaskType {
  AIImageEdit = "ai_image_edit",
  AITextGeneration = "ai_text_generation",
  AIVideoGeneration = "ai_video_generation",
}

// 任务状态枚举
export enum TaskStatus {
  Pending = "pending",
  Processing = "processing",
  Success = "success",
  Failed = "failed",
  Cancelled = "cancelled",
}

// 第三方服务提供商枚举
export enum ExternalProvider {
  KieAI = "kie.ai",
  OpenAI = "openai",
  Anthropic = "anthropic",
}

/**
 * 创建积分使用记录
 * @param userUuid 用户UUID
 * @param taskType 任务类型
 * @param creditsConsumed 消耗的积分
 * @param options 可选参数
 */
export async function createUsageRecord(
  userUuid: string,
  taskType: TaskType,
  creditsConsumed: number,
  options: {
    taskDescription?: string;
    externalTaskId?: string;
    externalProvider?: ExternalProvider;
    taskInput?: any;
  } = {}
): Promise<string> {
  try {
    // 获取用户当前积分
    const userCredits = await getUserCredits(userUuid);
    const creditsRemaining = Math.max(0, userCredits.left_credits - creditsConsumed);

    // 生成记录编号
    const recordNo = `${taskType}_${getSnowId()}`;

    // 创建记录数据
    const recordData: CreateCreditUsageRecordData = {
      record_no: recordNo,
      user_uuid: userUuid,
      task_type: taskType,
      task_description: options.taskDescription,
      credits_consumed: creditsConsumed,
      credits_remaining: creditsRemaining,
      task_status: TaskStatus.Pending,
      external_task_id: options.externalTaskId,
      external_provider: options.externalProvider,
      task_input: options.taskInput ? JSON.stringify(options.taskInput) : undefined,
      started_at: new Date(),
    };

    // 创建记录
    await createCreditUsageRecord(recordData);

    console.log(`积分使用记录已创建: ${recordNo}, 用户: ${userUuid}, 消耗积分: ${creditsConsumed}`);
    return recordNo;

  } catch (error) {
    console.error("创建积分使用记录失败:", error);
    throw new Error("创建积分使用记录失败");
  }
}

/**
 * 更新积分使用记录状态
 * @param recordNo 记录编号
 * @param status 新状态
 * @param options 可选参数
 */
export async function updateUsageRecordStatus(
  recordNo: string,
  status: TaskStatus,
  options: {
    taskOutput?: any;
    errorMessage?: string;
  } = {}
): Promise<void> {
  try {
    const updateData: UpdateCreditUsageRecordData = {
      task_status: status,
      task_output: options.taskOutput ? JSON.stringify(options.taskOutput) : undefined,
      error_message: options.errorMessage,
      completed_at: status === TaskStatus.Success || status === TaskStatus.Failed ? new Date() : undefined,
    };

    await updateCreditUsageRecord(recordNo, updateData);

    console.log(`积分使用记录状态已更新: ${recordNo}, 状态: ${status}`);

  } catch (error) {
    console.error("更新积分使用记录状态失败:", error);
    throw new Error("更新积分使用记录状态失败");
  }
}

/**
 * 标记任务为处理中
 * @param recordNo 记录编号
 */
export async function markTaskAsProcessing(recordNo: string): Promise<void> {
  await updateUsageRecordStatus(recordNo, TaskStatus.Processing);
}

/**
 * 标记任务为成功
 * @param recordNo 记录编号
 * @param taskOutput 任务输出结果
 */
export async function markTaskAsSuccess(recordNo: string, taskOutput?: any): Promise<void> {
  await updateUsageRecordStatus(recordNo, TaskStatus.Success, {
    taskOutput
  });
}

/**
 * 标记任务为失败
 * @param recordNo 记录编号
 * @param errorMessage 错误信息
 */
export async function markTaskAsFailed(recordNo: string, errorMessage: string): Promise<void> {
  await updateUsageRecordStatus(recordNo, TaskStatus.Failed, {
    errorMessage
  });
}

/**
 * 标记任务为取消
 * @param recordNo 记录编号
 */
export async function markTaskAsCancelled(recordNo: string): Promise<void> {
  await updateUsageRecordStatus(recordNo, TaskStatus.Cancelled);
}