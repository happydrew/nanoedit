import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";

export interface Task {
  id: string;
  user_uuid: string;
  task_type: string;
  credits_consumed: number;
  credits_remaining: number;
  task_status: string;
  external_task_id?: string;
  external_provider?: string;
  error_message?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateTaskData {
  id: string;
  user_uuid: string;
  task_type: string;
  credits_consumed: number;
  credits_remaining: number;
  task_status: string;
  external_task_id?: string;
  external_provider?: string;
  error_message?: string;
}

export interface UpdateTaskData {
  task_status?: string;
  error_message?: string;
  updated_at?: Date;
}

export interface TaskQuery {
  user_uuid?: string;
  task_type?: string;
  task_status?: string;
  date_from?: Date;
  date_to?: Date;
  page?: number;
  limit?: number;
}

// 创建任务记录
export async function createTask(data: CreateTaskData): Promise<Task> {
  try {
    const now = new Date();
    const taskData = {
      ...data,
      created_at: now,
      updated_at: now,
    };

    const [task] = await db().insert(tasks).values(taskData).returning();

    console.log("createTask: 数据库插入成功", { task });

    return task as Task;
  } catch (error) {
    console.error("createTask: 数据库插入失败 - 详细错误信息:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : 'No stack',
      data
    });
    throw error;
  }
}

// 更新任务记录
export async function updateTask(
  taskId: string,
  data: UpdateTaskData
): Promise<Task | null> {
  const updateData = {
    ...data,
    updated_at: new Date(),
  };

  const [task] = await db()
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId))
    .returning();

  return task ? (task as Task) : null;
}

// 根据任务ID获取任务
export async function getTaskById(taskId: string): Promise<Task | null> {
  const [task] = await db()
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  return task ? (task as Task) : null;
}

// 获取用户的任务记录列表
export async function getUserTasks(query: TaskQuery): Promise<{
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}> {
  const {
    user_uuid,
    task_type,
    task_status,
    date_from,
    date_to,
    page = 1,
    limit = 20
  } = query;

  // 构建查询条件
  const conditions = [];

  if (user_uuid) {
    conditions.push(eq(tasks.user_uuid, user_uuid));
  }

  if (task_type) {
    conditions.push(eq(tasks.task_type, task_type));
  }

  if (task_status) {
    conditions.push(eq(tasks.task_status, task_status));
  }

  if (date_from) {
    conditions.push(gte(tasks.created_at, date_from));
  }

  if (date_to) {
    conditions.push(lte(tasks.created_at, date_to));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 获取总数
  const [totalResult] = await db()
    .select({ count: count() })
    .from(tasks)
    .where(whereClause);

  const total = totalResult.count;

  // 获取分页数据
  const offset = (page - 1) * limit;
  const taskList = await db()
    .select()
    .from(tasks)
    .where(whereClause)
    .orderBy(desc(tasks.created_at))
    .limit(limit)
    .offset(offset);

  return {
    tasks: taskList as Task[],
    total,
    page,
    limit
  };
}