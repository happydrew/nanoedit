import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { db } from "@/db";
import { creditUsageRecords } from "@/db/schema";

export interface CreditUsageRecord {
  id: number;
  record_no: string;
  user_uuid: string;
  task_type: string;
  task_description?: string;
  credits_consumed: number;
  credits_remaining: number;
  task_status: string;
  external_task_id?: string;
  external_provider?: string;
  task_input?: string;
  task_output?: string;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateCreditUsageRecordData {
  record_no: string;
  user_uuid: string;
  task_type: string;
  task_description?: string;
  credits_consumed: number;
  credits_remaining: number;
  task_status: string;
  external_task_id?: string;
  external_provider?: string;
  task_input?: string;
  task_output?: string;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
}

export interface UpdateCreditUsageRecordData {
  task_status?: string;
  task_output?: string;
  error_message?: string;
  completed_at?: Date;
  updated_at?: Date;
}

export interface CreditUsageQuery {
  user_uuid?: string;
  task_type?: string;
  task_status?: string;
  date_from?: Date;
  date_to?: Date;
  page?: number;
  limit?: number;
}

// 创建积分使用记录
export async function createCreditUsageRecord(data: CreateCreditUsageRecordData): Promise<CreditUsageRecord> {
  const now = new Date();
  const recordData = {
    ...data,
    created_at: now,
    updated_at: now,
  };

  const [record] = await db.insert(creditUsageRecords).values(recordData).returning();
  return record as CreditUsageRecord;
}

// 更新积分使用记录
export async function updateCreditUsageRecord(
  recordNo: string,
  data: UpdateCreditUsageRecordData
): Promise<CreditUsageRecord | null> {
  const updateData = {
    ...data,
    updated_at: new Date(),
  };

  const [record] = await db
    .update(creditUsageRecords)
    .set(updateData)
    .where(eq(creditUsageRecords.record_no, recordNo))
    .returning();

  return record ? (record as CreditUsageRecord) : null;
}

// 根据记录编号获取记录
export async function getCreditUsageRecordByNo(recordNo: string): Promise<CreditUsageRecord | null> {
  const [record] = await db
    .select()
    .from(creditUsageRecords)
    .where(eq(creditUsageRecords.record_no, recordNo))
    .limit(1);

  return record ? (record as CreditUsageRecord) : null;
}

// 获取用户的积分使用记录列表
export async function getUserCreditUsageRecords(query: CreditUsageQuery): Promise<{
  records: CreditUsageRecord[];
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
    conditions.push(eq(creditUsageRecords.user_uuid, user_uuid));
  }

  if (task_type) {
    conditions.push(eq(creditUsageRecords.task_type, task_type));
  }

  if (task_status) {
    conditions.push(eq(creditUsageRecords.task_status, task_status));
  }

  if (date_from) {
    conditions.push(gte(creditUsageRecords.created_at, date_from));
  }

  if (date_to) {
    conditions.push(lte(creditUsageRecords.created_at, date_to));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 获取总数
  const [totalResult] = await db
    .select({ count: count() })
    .from(creditUsageRecords)
    .where(whereClause);

  const total = totalResult.count;

  // 获取分页数据
  const offset = (page - 1) * limit;
  const records = await db
    .select()
    .from(creditUsageRecords)
    .where(whereClause)
    .orderBy(desc(creditUsageRecords.created_at))
    .limit(limit)
    .offset(offset);

  return {
    records: records as CreditUsageRecord[],
    total,
    page,
    limit
  };
}