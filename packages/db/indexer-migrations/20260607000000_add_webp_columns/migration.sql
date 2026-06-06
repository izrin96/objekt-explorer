ALTER TABLE "collection" ADD COLUMN "processed_thumbnail_image" varchar(512);
ALTER TABLE "collection" ADD COLUMN "processed_front_image" varchar(512);
ALTER TABLE "collection" ADD COLUMN "processed_back_image" varchar(512);
ALTER TABLE "collection" ADD COLUMN "image_sync_hash" varchar(32);
