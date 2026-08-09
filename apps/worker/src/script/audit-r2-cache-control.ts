/**
 * Read-only audit of the R2 bucket ahead of the Cache-Control backfill.
 *
 * Reports object count, total size, a per-extension breakdown and a per-prefix
 * split, then samples HeadObject to see how many objects already carry a
 * Cache-Control header (ListObjectsV2 does not return it).
 *
 * Mutates nothing.
 *
 *   bun run --env-file=../../.env src/script/audit-r2-cache-control.ts
 *   bun run --env-file=../../.env src/script/audit-r2-cache-control.ts --full
 *   bun run --env-file=../../.env src/script/audit-r2-cache-control.ts --sample 500
 */
import { HeadObjectCommand, S3Client as AwsS3Client } from "@aws-sdk/client-s3";
import { chunk } from "@repo/lib";
import { isFolderMarker, mimeTypeFromKey } from "@repo/lib/media";
import { S3Client } from "bun";

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const region = process.env.S3_REGION ?? "auto";
const bucket = process.env.S3_BUCKET ?? "";

if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("[audit] Missing S3_ENDPOINT / S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET");
  process.exit(1);
}

const s3Config = { accessKeyId, secretAccessKey, endpoint, region };

const awsClient = new AwsS3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const full = process.argv.includes("--full");
const sampleFlag = process.argv.indexOf("--sample");
const sampleSize = sampleFlag === -1 ? 200 : Number(process.argv[sampleFlag + 1] ?? 200);

const KNOWN_PREFIXES = ["collection-images/", "profile-banner/", "band-image/"];
const HEAD_CONCURRENCY = 20;

type Entry = { key: string; size: number };

function extensionOf(key: string) {
  const ext = key.split(".").pop()?.toLowerCase();
  if (!ext || ext === key.toLowerCase()) return "(none)";
  return ext;
}

function prefixOf(key: string) {
  return KNOWN_PREFIXES.find((p) => key.startsWith(p)) ?? "(other)";
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(2)} ${units[unit]}`;
}

async function listAll() {
  const entries: Entry[] = [];
  let continuationToken: string | undefined;
  let pages = 0;

  do {
    const result = await S3Client.list(
      { continuationToken, maxKeys: 1000 },
      {
        ...s3Config,
        bucket,
      },
    );
    pages++;

    for (const obj of result?.contents ?? []) {
      entries.push({ key: obj.key, size: obj.size ?? 0 });
    }

    continuationToken = result?.nextContinuationToken;

    if (pages % 20 === 0) {
      console.log(`[audit] Listed ${entries.length} objects...`);
    }
  } while (continuationToken);

  return { entries, pages };
}

/**
 * Take up to `size` keys spread evenly across the whole set rather than the
 * first N, so the sample is not biased toward one prefix's ordering.
 */
function stratify(entries: Entry[], size: number) {
  if (entries.length <= size) return entries;
  const step = entries.length / size;
  const picked: Entry[] = [];
  for (let i = 0; i < size; i++) {
    const entry = entries[Math.floor(i * step)];
    if (entry) picked.push(entry);
  }
  return picked;
}

async function headSample(entries: Entry[]) {
  let withHeader = 0;
  let withoutHeader = 0;
  let errored = 0;
  const values = new Map<string, number>();

  await chunk(entries, HEAD_CONCURRENCY, async (batch) => {
    await Promise.all(
      batch.map(async ({ key }) => {
        try {
          const head = await awsClient.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
          if (head.CacheControl) {
            withHeader++;
            values.set(head.CacheControl, (values.get(head.CacheControl) ?? 0) + 1);
          } else {
            withoutHeader++;
          }
        } catch (err) {
          errored++;
          console.error(`[audit] HEAD failed for ${key}:`, err);
        }
      }),
    );
  });

  return { withHeader, withoutHeader, errored, values };
}

function tally(entries: Entry[], keyOf: (key: string) => string) {
  const counts = new Map<string, { count: number; bytes: number }>();
  for (const { key, size } of entries) {
    const group = keyOf(key);
    const current = counts.get(group) ?? { count: 0, bytes: 0 };
    current.count++;
    current.bytes += size;
    counts.set(group, current);
  }
  return [...counts.entries()].sort((a, b) => b[1].count - a[1].count);
}

console.log(`[audit] Listing bucket ${bucket}...`);
const { entries, pages } = await listAll();
const totalBytes = entries.reduce((sum, e) => sum + e.size, 0);

console.log("");
console.log(`Objects:    ${entries.length}`);
console.log(`Total size: ${formatBytes(totalBytes)}`);

console.log("");
console.log("By prefix:");
for (const [prefix, { count, bytes }] of tally(entries, prefixOf)) {
  console.log(`  ${prefix.padEnd(20)} ${String(count).padStart(8)}  ${formatBytes(bytes)}`);
}

console.log("");
console.log("By extension:");
const unknown: string[] = [];
for (const [ext, { count, bytes }] of tally(entries, extensionOf)) {
  const mime = mimeTypeFromKey(`x.${ext}`);
  if (!mime) unknown.push(ext);
  const label = mime ?? "UNKNOWN — backfill will skip";
  console.log(
    `  .${ext.padEnd(10)} ${String(count).padStart(8)}  ${formatBytes(bytes).padEnd(12)} ${label}`,
  );
}

const sample = full ? entries : stratify(entries, sampleSize);
console.log("");
console.log(
  full
    ? `Checking Cache-Control on all ${sample.length} objects...`
    : `Checking Cache-Control on a ${sample.length}-object sample (--full for all)...`,
);
const { withHeader, withoutHeader, errored, values } = await headSample(sample);

console.log("");
console.log(`  with Cache-Control:    ${withHeader}`);
console.log(`  without Cache-Control: ${withoutHeader}`);
if (errored > 0) console.log(`  HEAD errors:           ${errored}`);
for (const [value, count] of values) {
  console.log(`    "${value}" x${count}`);
}

const copyOps = entries.filter((e) => !isFolderMarker(e.key) && mimeTypeFromKey(e.key)).length;
const listOps = pages;
console.log("");
console.log("Projected backfill cost (Class A):");
console.log(`  CopyObject:     ${copyOps}`);
console.log(`  ListObjectsV2:  ${listOps}`);
console.log(`  total:          ${copyOps + listOps}`);

if (unknown.length > 0) {
  console.log("");
  console.log(
    `WARNING: ${unknown.length} unrecognised extension(s) — the backfill will skip these rather than guess a Content-Type: ${unknown.join(", ")}`,
  );
}

console.log("");
console.log("[audit] Read-only. Nothing was modified.");
