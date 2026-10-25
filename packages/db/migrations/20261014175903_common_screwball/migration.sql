CREATE TABLE "worker_progress" (
	"name" text PRIMARY KEY,
	"cursor" bigint NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
