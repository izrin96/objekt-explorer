CREATE TABLE "cosmo_objekt" (
	"token_id" varchar(20) PRIMARY KEY,
	"slug" varchar(255) NOT NULL,
	"objekt_no" integer NOT NULL,
	"transferable" boolean NOT NULL,
	"non_transferable_reason" varchar(64),
	"used_for_grid" boolean NOT NULL,
	"chain_height" integer NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone,
	"serial_eligible" boolean,
	"serial_due" boolean DEFAULT true NOT NULL,
	"serial_checked_at" timestamp with time zone,
	"transferable_due" boolean DEFAULT true NOT NULL,
	"transferable_outcome" text,
	"transferable_checked_at" timestamp with time zone,
	CONSTRAINT "cosmo_objekt_token_id_check" CHECK ("token_id" ~ '^[0-9]+$'),
	CONSTRAINT "cosmo_objekt_objekt_no_check" CHECK ("objekt_no" > 0),
	CONSTRAINT "cosmo_objekt_reason_check" CHECK ("non_transferable_reason" IS NULL OR "non_transferable_reason" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "cosmo_objekt_outcome_check" CHECK ("transferable_outcome" IS NULL OR "transferable_outcome" IN ('matched','moved','chain_newer','spin','missing','report_untransferable','report_transferable','written_untransferable','written_transferable','raced'))
);
--> statement-breakpoint
CREATE TABLE "cosmo_transferable" (
	"token_id" varchar(20) PRIMARY KEY,
	"transferable" boolean NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"chain_height" integer NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	"superseded_at" timestamp with time zone,
	"superseded_block" integer,
	CONSTRAINT "cosmo_transferable_token_id_check" CHECK ("token_id" ~ '^[0-9]+$'),
	CONSTRAINT "cosmo_transferable_superseded_check" CHECK (("superseded_at" IS NULL) = ("superseded_block" IS NULL))
);
--> statement-breakpoint
CREATE INDEX "cosmo_objekt_confirmed_idx" ON "cosmo_objekt" ("slug") WHERE "serial_eligible";--> statement-breakpoint
CREATE INDEX "cosmo_objekt_serial_due_idx" ON "cosmo_objekt" ("slug") WHERE "serial_due";--> statement-breakpoint
CREATE INDEX "cosmo_objekt_transferable_due_idx" ON "cosmo_objekt" ("observed_at") WHERE "transferable_due";