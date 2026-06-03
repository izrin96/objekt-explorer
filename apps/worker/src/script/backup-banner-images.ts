import { mkdir } from "node:fs/promises";

import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { isNotNull } from "drizzle-orm";

const BACKUP_DIR = "./backup-banners";

async function backupBannerImages() {
  console.log("[backup-banners] Starting backup...");

  // Create backup directory if it doesn't exist
  await mkdir(BACKUP_DIR, { recursive: true });

  // Query all addresses with banner images
  const rows = await db
    .select({
      address: userAddress.address,
      bannerImgUrl: userAddress.bannerImgUrl,
    })
    .from(userAddress)
    .where(isNotNull(userAddress.bannerImgUrl));

  console.log(`[backup-banners] Found ${rows.length} addresses with banner images`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.bannerImgUrl) continue;

    try {
      const url = new URL(row.bannerImgUrl);
      const ext = url.pathname.split(".").pop() ?? "";
      const filename = ext ? `${row.address}.${ext}` : row.address;
      const filePath = `${BACKUP_DIR}/${filename}`;

      // Skip if already downloaded
      const existingFile = Bun.file(filePath);
      if (await existingFile.exists()) {
        console.log(`[backup-banners] ⏭️  ${filename} (already exists)`);
        skipped++;
        continue;
      }

      // Download the image
      const response = await fetch(row.bannerImgUrl);
      if (!response.ok) {
        console.error(`[backup-banners] ✗ ${filename} — HTTP ${response.status}`);
        failed++;
        continue;
      }

      const buffer = await response.arrayBuffer();
      await Bun.write(filePath, buffer);

      console.log(`[backup-banners] ✓ ${filename}`);
      downloaded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[backup-banners] ✗ ${row.address} — ${message}`);
      failed++;
    }
  }

  console.log(
    `\n[backup-banners] Done. Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`,
  );
}

await backupBannerImages();
