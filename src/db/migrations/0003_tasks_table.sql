-- 创建新的 tasks 表
CREATE TABLE "tasks" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
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