import { appendFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Re-encode profile banners uploaded before the browser compressed them:
 * stills (SVG included) to WebP, GIF and video to a muted H.264 MP4, both the
 * 2.4:1 centre the profile already shows. A profile moves to the new object
 * only when `backfillDecision` says so. Originals are never deleted.
 *
 * Needs ffmpeg with libx264 on PATH. Runs by hand, never in the container.
 *
 * A dry run unless APPLY=1: it encodes into --out and prints each decision,
 * reading the database and writing nothing remote.
 *
 *   bun run --env-file=../../.env src/script/backfill-banner-compression.ts
 *
 *   # one profile for real, then check its page
 *   APPLY=1 bun run --env-file=../../.env src/script/backfill-banner-compression.ts --before <deploy time> --address <0x…>
 *
 *   # full run (resumable through the done-log)
 *   APPLY=1 bun run --env-file=../../.env src/script/backfill-banner-compression.ts --before <deploy time>
 *
 *   # options
 *   --before <iso>     only banners set before this time (the web deploy that
 *                      compresses uploads); required with APPLY=1
 *   --address <0x…>    one profile only
 *   --out <dir>        dry-run output folder (default ./banner-backfill-out)
 *   --concurrency <n>  banners at once (default 2)
 *   --done-log <path>  default .banner-backfill-done.log, one JSON line per decision
 *
 * Rollback of one replaced banner, from its done-log line (only while the user
 * has not changed it since):
 *   UPDATE user_address SET banner_img_url = <old>, banner_img_type = <oldType>
 *   WHERE banner_img_url = <new>;
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ownBannerKey } from "@repo/api/lib/banner-key";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { STILL_MAX, stillGeometry } from "@repo/lib/banner";
import { CACHE_CONTROL, mimeTypeFromKey } from "@repo/lib/media";
import { and, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import sharp from "sharp";

import {
  backfillDecision,
  bannerKey,
  demuxerFor,
  displaySize,
  type DoneEntry,
  doneUrls,
  ffmpegArgs,
  isMovingType,
} from "../lib/banner-backfill";

function flag(name: string) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const dryRun = process.env.APPLY !== "1";
const onlyAddress = flag("--address");
const outDir = flag("--out") ?? "./banner-backfill-out";
const concurrency = Number(flag("--concurrency") ?? 2);
const donePath = flag("--done-log") ?? ".banner-backfill-done.log";
const before = flag("--before");

if (!Number.isInteger(concurrency) || concurrency < 1) {
  console.error("[banner-backfill] --concurrency must be a whole number above 0");
  process.exit(1);
}
if (before !== undefined && Number.isNaN(Date.parse(before))) {
  console.error(`[banner-backfill] --before is not a date: ${before}`);
  process.exit(1);
}
if (!dryRun && before === undefined) {
  console.error("[banner-backfill] APPLY=1 needs --before <deploy time>");
  process.exit(1);
}

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const bucket = process.env.S3_BUCKET ?? "";
const publicUrl = process.env.S3_PUBLIC_URL ?? endpoint;

if (!publicUrl) {
  console.error("[banner-backfill] Missing S3_PUBLIC_URL / S3_ENDPOINT");
  process.exit(1);
}
if (!dryRun && (!endpoint || !accessKeyId || !secretAccessKey || !bucket)) {
  console.error(
    "[banner-backfill] Missing S3_ENDPOINT / S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET",
  );
  process.exit(1);
}

const s3 =
  dryRun || !accessKeyId || !secretAccessKey
    ? null
    : new S3Client({
        region: process.env.S3_REGION ?? "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });

type Encoded = { bytes: Uint8Array; type: string; ext: string };

/** An SVG renders at its own size at 72 dpi; raise the density so it fills the banner. */
async function svgDensity(bytes: Uint8Array) {
  const { width } = await sharp(bytes).metadata();
  return width ? Math.min(2400, Math.ceil((72 * STILL_MAX.width) / width)) : 72;
}

async function encodeStill(bytes: Uint8Array, type: string): Promise<Encoded | "animated"> {
  const options = {
    autoOrient: true,
    density: type === "image/svg+xml" ? await svgDensity(bytes) : undefined,
  };
  const meta = await sharp(bytes, options).metadata();
  // an animated WebP would lose its animation through a still encode
  if ((meta.pages ?? 1) > 1) return "animated";

  const upright = meta.autoOrient ?? { width: meta.width ?? 0, height: meta.height ?? 0 };
  const { crop, output } = stillGeometry(upright);
  const out = await sharp(bytes, options)
    .extract(crop)
    .resize(output.width, output.height)
    .webp({ quality: 85 })
    .toBuffer();
  return { bytes: out, type: "image/webp", ext: "webp" };
}

async function run(cmd: string[], timeout: number) {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", timeout });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`${cmd[0]} exited ${code}: ${stderr.trim()}`);
  return stdout;
}

/** H.264 has no alpha: a transparent GIF would show black behind it. */
async function gifHasTransparency(bytes: Uint8Array) {
  const { data, info } = await sharp(bytes, { animated: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] !== 255) return true;
  }
  return false;
}

async function encodeMoving(bytes: Uint8Array, type: string): Promise<Encoded | "transparent"> {
  const demuxer = demuxerFor(type);
  if (!demuxer) throw new Error(`no demuxer for ${type}`);
  if (type === "image/gif" && (await gifHasTransparency(bytes))) return "transparent";

  const dir = await mkdtemp(join(tmpdir(), "banner-"));
  try {
    const input = join(dir, "in");
    const output = join(dir, "out.mp4");
    await Bun.write(input, bytes);

    const probe = JSON.parse(
      await run(
        [
          "ffprobe",
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=width,height:stream_side_data=rotation",
          "-of",
          "json",
          "-f",
          demuxer,
          input,
        ],
        60_000,
      ),
    ) as {
      streams?: {
        width: number;
        height: number;
        side_data_list?: { rotation?: number }[];
      }[];
    };
    const stream = probe.streams?.[0];
    if (!stream) throw new Error("no video stream");
    const rotation = stream.side_data_list?.find((d) => d.rotation !== undefined)?.rotation;

    await run(
      ["ffmpeg", ...ffmpegArgs(input, output, displaySize({ ...stream, rotation }), demuxer)],
      10 * 60_000,
    );
    return { bytes: await Bun.file(output).bytes(), type: "video/mp4", ext: "mp4" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

type Banner = { address: string; url: string; type: string | null };

async function loadDone() {
  const file = Bun.file(donePath);
  if (!(await file.exists())) return new Set<string>();
  const lines = (await file.text()).split("\n").filter((line) => line.length > 0);
  return doneUrls(lines.map((line) => JSON.parse(line) as DoneEntry));
}

const counts = { replaced: 0, kept: 0, skipped: 0, orphaned: 0, failed: 0 };

async function record(entry: Record<string, unknown>) {
  if (!dryRun) await appendFile(donePath, `${JSON.stringify(entry)}\n`);
}

async function backfill({ address, url, type: storedType }: Banner) {
  const key = ownBannerKey(url, publicUrl as string, address);
  if (!key) {
    counts.skipped++;
    console.log(`[banner-backfill] skip  ${address} — not our object (${url})`);
    return;
  }
  const type = storedType ?? mimeTypeFromKey(key);
  if (!type) {
    counts.skipped++;
    console.log(`[banner-backfill] skip  ${address} — unknown type (${key})`);
    return;
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`download HTTP ${response.status}`);
  const original = new Uint8Array(await response.arrayBuffer());

  const encoded = isMovingType(type)
    ? await encodeMoving(original, type)
    : await encodeStill(original, type);
  if (encoded === "animated" || encoded === "transparent") {
    counts.skipped++;
    console.log(`[banner-backfill] skip  ${address} — ${encoded} ${type}`);
    await record({ address, old: url, decision: encoded });
    return;
  }

  const decision = backfillDecision({
    type,
    originalSize: original.length,
    newSize: encoded.bytes.length,
  });
  const sizes = `${type} ${kb(original.length)} → ${encoded.type} ${kb(encoded.bytes.length)}`;

  if (dryRun) {
    await Bun.write(join(outDir, `${address}.${encoded.ext}`), encoded.bytes);
    if (decision === "replace") counts.replaced++;
    else counts.kept++;
    console.log(`[banner-backfill] ${decision.padEnd(9)} ${address}  ${sizes}`);
    return;
  }

  if (decision !== "replace") {
    counts.kept++;
    console.log(`[banner-backfill] ${decision.padEnd(9)} ${address}  ${sizes}`);
    await record({ address, old: url, decision });
    return;
  }

  const newKey = bannerKey(address, Date.now(), encoded.ext);
  await s3?.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: newKey,
      Body: encoded.bytes,
      ContentType: encoded.type,
      CacheControl: CACHE_CONTROL,
    }),
  );
  const newUrl = `${publicUrl}/${newKey}`;
  // before the UPDATE, so a crash after it still leaves the rollback and keeps
  // the new object from being re-encoded
  await record({ address, old: url, new: newUrl, oldType: storedType, decision: "pending" });

  // compare-and-set: a banner the user changed meanwhile wins
  const updated = await db
    .update(userAddress)
    .set({ bannerImgUrl: newUrl, bannerImgType: encoded.type })
    .where(and(eq(userAddress.address, address), eq(userAddress.bannerImgUrl, url)))
    .returning({ id: userAddress.id });

  if (updated.length === 0) {
    counts.orphaned++;
    console.log(`[banner-backfill] orphan    ${address}  changed meanwhile, ${newKey} unused`);
    await record({ address, old: url, orphan: newUrl, decision: "orphan" });
    return;
  }

  counts.replaced++;
  console.log(`[banner-backfill] replace   ${address}  ${sizes}`);
  await record({ address, old: url, new: newUrl, oldType: storedType, decision });
}

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

const rows = await db
  .selectDistinct({
    address: userAddress.address,
    url: userAddress.bannerImgUrl,
    type: userAddress.bannerImgType,
  })
  .from(userAddress)
  .where(
    and(
      isNotNull(userAddress.bannerImgUrl),
      onlyAddress ? eq(userAddress.address, onlyAddress) : undefined,
      // a banner older than the column has no time, and is from before the deploy
      before
        ? or(isNull(userAddress.bannerUpdatedAt), lt(userAddress.bannerUpdatedAt, before))
        : undefined,
    ),
  );

const done = await loadDone();
const seen = new Set<string>();
const todo: Banner[] = [];
for (const row of rows) {
  if (!row.url || done.has(row.url) || seen.has(row.url)) continue;
  seen.add(row.url);
  todo.push({ address: row.address, url: row.url, type: row.type });
}

console.log(
  `[banner-backfill] ${dryRun ? "DRY RUN, " : ""}${rows.length} rows, ${done.size} done before, ${todo.length} to do`,
);
if (dryRun) await mkdir(outDir, { recursive: true });

let next = 0;
async function worker() {
  while (next < todo.length) {
    const banner = todo[next++];
    if (!banner) return;
    try {
      await backfill(banner);
    } catch (error) {
      counts.failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[banner-backfill] failed    ${banner.address} — ${message}`);
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

console.log(`\n[banner-backfill] Done.`, counts);
if (dryRun) console.log(`[banner-backfill] Outputs in ${outDir}`);
else console.log(`[banner-backfill] Log in ${donePath}`);
process.exit(counts.failed > 0 ? 1 : 0);
