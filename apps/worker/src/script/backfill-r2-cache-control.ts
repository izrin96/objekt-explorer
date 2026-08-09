import { appendFile } from "node:fs/promises";

/**
 * Backfill Cache-Control onto existing R2 objects.
 *
 * R2 has no in-place metadata edit, so each object is copied onto itself with
 * MetadataDirective=REPLACE. REPLACE drops every header that is not restated,
 * so Content-Type is re-derived per extension — never one blanket type.
 *
 * Resumable: completed keys are appended to a done-log and skipped on re-run.
 *
 *   # copy exactly one object, then verify it by hand
 *   bun run --env-file=../../.env src/script/backfill-r2-cache-control.ts --dry-run <key>
 *
 *   # full run
 *   bun run --env-file=../../.env src/script/backfill-r2-cache-control.ts
 *
 *   # options
 *   --prefix <p>       only keys under this prefix
 *   --concurrency <n>  parallel copies (default 20)
 *   --done-log <path>  default .r2-backfill-done.log
 *   --fail-log <path>  default .r2-backfill-failed.log
 */
import { CopyObjectCommand, S3Client as AwsS3Client } from "@aws-sdk/client-s3";
import { chunk } from "@repo/lib";
import { CACHE_CONTROL, isFolderMarker, mimeTypeFromKey } from "@repo/lib/media";
import { S3Client } from "bun";

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const region = process.env.S3_REGION ?? "auto";
const bucket = process.env.S3_BUCKET ?? "";
const publicUrl = process.env.S3_PUBLIC_URL ?? endpoint;

if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("[backfill] Missing S3_ENDPOINT / S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET");
  process.exit(1);
}

function flag(name: string) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const dryRunKey = flag("--dry-run");
const prefix = flag("--prefix");
const concurrency = Number(flag("--concurrency") ?? 20);
const donePath = flag("--done-log") ?? ".r2-backfill-done.log";
const failPath = flag("--fail-log") ?? ".r2-backfill-failed.log";

const s3Config = { accessKeyId, secretAccessKey, endpoint, region };

const client = new AwsS3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

/**
 * Self-copy with REPLACE. CopySource must be URL-encoded or keys containing
 * anything exotic resolve to the wrong object.
 */
async function backfill(key: string, contentType: string) {
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: key,
      CopySource: encodeURIComponent(`${bucket}/${key}`),
      MetadataDirective: "REPLACE",
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
    }),
  );
}

if (dryRunKey) {
  const contentType = mimeTypeFromKey(dryRunKey);

  if (!contentType) {
    console.error(`[backfill] No known Content-Type for ${dryRunKey} — refusing to guess`);
    process.exit(1);
  }

  console.log(`[backfill] DRY RUN — copying a single object`);
  console.log(`  key:           ${dryRunKey}`);
  console.log(`  Content-Type:  ${contentType}`);
  console.log(`  Cache-Control: ${CACHE_CONTROL}`);

  await backfill(dryRunKey, contentType);

  console.log("");
  console.log("[backfill] Done. Verify with:");
  console.log(`  curl -sI ${publicUrl}/${dryRunKey}`);
  process.exit(0);
}

async function loadDone() {
  const file = Bun.file(donePath);
  if (!(await file.exists())) return new Set<string>();
  const text = await file.text();
  return new Set(text.split("\n").filter((line) => line.length > 0));
}

async function listAll() {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await S3Client.list(
      { prefix, continuationToken, maxKeys: 1000 },
      { ...s3Config, bucket },
    );

    for (const obj of result?.contents ?? []) {
      keys.push(obj.key);
    }

    continuationToken = result?.nextContinuationToken;
  } while (continuationToken);

  return keys;
}

console.log(`[backfill] Listing bucket ${bucket}${prefix ? ` (prefix ${prefix})` : ""}...`);
const allKeys = await listAll();
const done = await loadDone();

const markers = allKeys.filter(isFolderMarker);
const candidates = allKeys.filter((key) => !isFolderMarker(key));
const unknown = candidates.filter((key) => !mimeTypeFromKey(key));
const todo = candidates.filter((key) => mimeTypeFromKey(key) && !done.has(key));
const skipped = candidates.length - unknown.length - todo.length;

console.log(`[backfill] ${allKeys.length} objects listed`);
console.log(`  folder markers skipped:   ${markers.length}`);
console.log(`  unknown extension:        ${unknown.length}`);
console.log(`  already done (resumed):   ${skipped}`);
console.log(`  to copy:                  ${todo.length}`);

for (const key of unknown) {
  console.log(`  SKIP (no known Content-Type): ${key}`);
}

if (todo.length === 0) {
  console.log("[backfill] Nothing to do");
  process.exit(0);
}

console.log(`[backfill] Class A ops for this run: ${todo.length} CopyObject`);

let completed = 0;
let failed = 0;

await chunk(todo, concurrency, async (batch) => {
  const doneLines: string[] = [];
  const failLines: string[] = [];

  await Promise.all(
    batch.map(async (key) => {
      const contentType = mimeTypeFromKey(key);
      // filtered above, but keeps the type narrow and the guess impossible
      if (!contentType) return;

      try {
        await backfill(key, contentType);
        doneLines.push(key);
        completed++;
      } catch (err) {
        failed++;
        failLines.push(`${key}\t${err instanceof Error ? err.message : String(err)}`);
        console.error(`[backfill] Failed ${key}:`, err);
      }
    }),
  );

  // append per batch so a kill -9 still leaves an accurate resume point.
  // must be append: truncating would destroy the log we resume from
  if (doneLines.length > 0) await appendFile(donePath, `${doneLines.join("\n")}\n`);
  if (failLines.length > 0) await appendFile(failPath, `${failLines.join("\n")}\n`);

  if ((completed + failed) % 500 < concurrency) {
    console.log(`[backfill] Progress: ${completed + failed}/${todo.length} (${failed} failed)`);
  }
});

console.log("");
console.log(`[backfill] Done: ${completed} copied, ${failed} failed`);
if (failed > 0) {
  console.log(`[backfill] Failures logged to ${failPath} — re-run to retry them`);
}
