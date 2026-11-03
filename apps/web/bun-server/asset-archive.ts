import { copyFile, mkdir, readdir, stat, unlink, utimes } from "node:fs/promises";
import path from "node:path";

import { CLIENT_DIRECTORY, ASSET_ARCHIVE_MAX_AGE_MS, log } from "./config";
import { isHashedAsset } from "./static-routes";

/**
 * Copies this build's assets into the archive and drops archived ones no deploy has shipped within
 * the max age. A file's mtime is the last startup whose build carried it.
 */
export async function archiveAssets(archiveDir: string): Promise<void> {
  const assetsDir = path.join(CLIENT_DIRECTORY, "assets");
  try {
    await mkdir(archiveDir, { recursive: true });
    const now = new Date();
    const names = await readdir(assetsDir);
    const current = new Set(names.filter((name) => isHashedAsset(`assets/${name}`)));
    for (const name of current) {
      const target = path.join(archiveDir, name);
      if (!(await Bun.file(target).exists())) await copyFile(path.join(assetsDir, name), target);
      await utimes(target, now, now);
    }

    let pruned = 0;
    for (const name of await readdir(archiveDir)) {
      if (current.has(name)) continue;
      const target = path.join(archiveDir, name);
      if (now.getTime() - (await stat(target)).mtimeMs > ASSET_ARCHIVE_MAX_AGE_MS) {
        await unlink(target);
        pruned++;
      }
    }
    log.success(`Archived ${String(current.size)} assets, pruned ${String(pruned)}`);
  } catch (error) {
    log.error(`Failed to archive assets in ${archiveDir}: ${String(error)}`);
  }
}

// route chunks take their file's name: `(container)-….js` for a group, `@__handle_-….js` for `@{$handle}`
const ARCHIVED_ASSET = /^\/assets\/([\w.@()-]+)$/;

/** An earlier build's chunk, or null when the path is not one or the archive lacks it. */
export async function serveArchivedAsset(
  archiveDir: string,
  pathname: string,
): Promise<Response | null> {
  const name = ARCHIVED_ASSET.exec(pathname)?.[1];
  if (!name || !isHashedAsset(`assets/${name}`)) return null;
  const file = Bun.file(path.join(archiveDir, name));
  if (!(await file.exists())) return null;
  return new Response(file, {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
