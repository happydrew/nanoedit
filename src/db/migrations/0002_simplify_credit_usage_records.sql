-- 简化 credit_usage_records 表
-- 1. 删除 id 字段，使用 record_no 作为主键
-- 2. 删除不需要的字段：task_description, task_input, task_output, started_at, completed_at

-- 先创建临时表保存现有数据
CREATE TABLE "credit_usage_records_temp" AS
SELECT
    record_no,
    user_uuid,
    task_type,
    credits_consumed,
    credits_remaining,
    task_status,
    external_task_id,
    external_provider,
    error_message,
    created_at,
    updated_at
FROM "credit_usage_records";

-- 删除原表
DROP TABLE "credit_usage_records";

-- 创建新的简化表结构
CREATE TABLE "credit_usage_records" (
	"record_no" varchar(255) PRIMARY KEY NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"task_type" varchar(100) NOT NULL,
	"credits_consumed" integer NOT NULL,
	"credits_remaining" integer NOT NULL,
	"task_status" varchar(50) NOT NULL,
	"external_task_id" varchar(255),
	"external_provider" varchar(100),
	"error_message" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);

-- 恢复数据
INSERT INTO "credit_usage_records"
SELECT * FROM "credit_usage_records_temp";

-- 删除临时表
DROP TABLE "credit_usage_records_temp";