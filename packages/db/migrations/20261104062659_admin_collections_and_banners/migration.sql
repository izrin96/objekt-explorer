CREATE TABLE "collection_override" (
	"slug" text PRIMARY KEY,
	"text_color" text,
	"background_color" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_override_text_color" CHECK ("text_color" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "collection_override_background_color" CHECK ("background_color" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "collection_override_some_color" CHECK ("text_color" IS NOT NULL OR "background_color" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX "user_address_banner_feed_idx" ON "user_address" ("banner_updated_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE banner_img_url IS NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_override" ADD CONSTRAINT "collection_override_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
INSERT INTO "collection_override" ("slug", "text_color", "background_color", "updated_by") VALUES
	('divine01-seoyeon-117z', NULL, '#b400ff', NULL),
	('divine01-seoyeon-118z', NULL, '#b400ff', NULL),
	('divine01-seoyeon-119z', NULL, '#b400ff', NULL),
	('divine01-seoyeon-120z', NULL, '#b400ff', NULL),
	('divine01-seoyeon-317z', NULL, '#df2e37', NULL),
	('binary01-choerry-201z', NULL, '#ffffff', NULL),
	('binary01-choerry-202z', NULL, '#ffffff', NULL),
	('atom01-yubin-302z', NULL, '#d300bb', NULL),
	('atom01-nakyoung-302z', NULL, '#d300bb', NULL),
	('atom01-yooyeon-302z', NULL, '#d300bb', NULL),
	('atom01-hyerin-302z', NULL, '#d300bb', NULL),
	('atom01-heejin-322z', '#ffffff', NULL, NULL),
	('atom01-heejin-323z', '#ffffff', NULL, NULL),
	('atom01-heejin-324z', '#ffffff', NULL, NULL),
	('atom01-heejin-325z', '#ffffff', NULL, NULL),
	('ever01-seoyeon-338z', '#07328d', NULL, NULL)
ON CONFLICT ("slug") DO NOTHING;
