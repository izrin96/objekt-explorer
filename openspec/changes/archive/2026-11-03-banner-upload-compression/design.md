# Design

## Context

The upload path lives in `apps/web/src/features/link/`:

- `banner-upload.ts`: `bannerFileError` (type and 10 MB checks), `isCroppable` (still images other than GIF), `cropToBanner`, which calls `cropper.getCanvas()` and then `canvas.toBlob(resolve, file.type)` with no size or quality, and `putBanner`, which PUTs the file to the presigned URL.
- `edit-cosmo-dialog.tsx`: the Save mutation crops a still, asks `profile.getPresignedPost` for a URL with `mimeType` and `fileSize`, uploads, then calls `profile.edit` with the public URL and type. GIFs and videos skip the cropper. When the lazily loaded cropper has not mounted, `cropToBanner` uploads the picked file untouched.
- `banner-cropper.tsx`: a lazy `react-advanced-cropper` at `BANNER_ASPECT_RATIO` (2.4).

The server (`packages/api/src/routers/profile.ts`, `schemas/profile.ts`) checks `mimeType` against `acceptedFileMimeTypes` from `@repo/lib/media` and `fileSize` against `MAX_FILE_SIZE` (10 MB), and signs both into the presigned PUT. The key's extension comes from `mimeTypeToExtension`. The worker's R2 scripts read `extensionToMimeType` to label existing objects.

## Goals / Non-Goals

**Goals:**
- All compression happens in the browser, before `getPresignedPost`, so the server contract (type, size, key) is unchanged apart from dropping SVG and AVI.
- Conversion code and its dependency load only when a GIF or video is picked.
- The size and type decisions live in a pure module with tests.

**Non-Goals:**
- Choosing codecs or bitrates per device, or running a second pass when a file comes out too large.

## Decisions

### 1. Stills: the cropper scales, the canvas encodes

`cropper.getCanvas({ maxWidth: 2400, maxHeight: 1000 })`. `advanced-cropper`'s `DrawOptions` accepts these and only ever shrinks the crop. Encode with `canvas.toBlob(cb, "image/webp", 0.85)`. Browsers that cannot encode WebP (Safari) return PNG instead. When `blob.type !== "image/webp"`, read the canvas's alpha channel (`getImageData`, at most 2400×1000): if every pixel is opaque, encode again with `"image/jpeg", 0.85`; otherwise keep the PNG blob. A stored banner is shown in both light and dark mode, so no background colour is right for flattening transparency, and a 2400×1000 PNG still lands well under 10 MB. The returned `File` takes its type, and its name's extension, from the final blob's type, which fixes the BMP mislabel.

- *Alternative:* a library such as `browser-image-compression`. Rejected: the cropper already produces the canvas, and the only things missing are a size cap and a quality setting.
- *Alternative:* AVIF. Rejected: canvas encoding support for it is patchy and the saving over WebP is small at this size.

Save is disabled while a still is picked and `cropperRef.current` is empty, so the uncropped path is gone.

### 2. GIF and video: Mediabunny over WebCodecs, in a lazy module

A new `banner-convert.ts`, loaded with `import()` from the Save mutation, exports `convertMovingBanner(file, { signal, onProgress })`, which returns a `Blob` or `null` (`null` means the browser cannot convert it, so use the fallback in Decision 3). Only an abort rejects. Any other thrown error goes to `reportError` (`lib/error-tracking.tsx`) before the fallback, so a bug does not hide as "this browser cannot convert".

API names below were checked against the Mediabunny docs (ctx7 `/vanilagy/mediabunny`, v1.63) and the installed 1.62.1 types on 2026-10-30.

- **Video:** `Input` over a `BlobSource`, with the MP4/QuickTime, WebM/Matroska and Ogg demuxers only, not `ALL_FORMATS`, to keep the chunk small. `Output` uses `Mp4OutputFormat({ fastStart: "in-memory" })` and a `BufferTarget` (`"in-memory"` is already the default with a `BufferTarget`; it is spelled out because the spec depends on it). `Conversion.init` is given `video: { crop, width, height, fit: "fill", codec: "avc", quality: QUALITY_MEDIUM }` and `audio: { discard: true }`. Mediabunny requires `fit` when both `width` and `height` are set; `"fill"` is right because the crop already has the output's ratio. If `conversion.isValid` is false (an undecodable source such as HEVC, or no H.264 encoder), or the primary video track is among `conversion.discardedTracks` (valid only means some track survives), return `null`. `onProgress` (0 to 1) drives the progress bar, and the abort signal calls `conversion.cancel()`.
- **Rotation:** Mediabunny applies the file's rotation metadata before `crop`, and `crop` is in display pixels. So `movingGeometry` is given the track's rotated display size, not its coded size, or a portrait phone video is cropped on the wrong axis.
- **GIF:** Mediabunny cannot read GIF. Decode it with WebCodecs `ImageDecoder({ type: "image/gif" })`, draw each frame onto an `OffscreenCanvas` (cropped and scaled), and feed a `CanvasSource(canvas, { codec: "avc", quality: QUALITY_MEDIUM })` through `add(timestamp, duration)` in seconds, with each frame's own timing. Clamp delays under 20 ms to 100 ms, as browsers do when playing GIFs. If `ImageDecoder` is missing, return `null`. A frame with any pixel below full opacity also returns `null`, since H.264 has no alpha and the transparent areas would turn black; the GIF then uploads as picked. `canEncodeVideo` runs after the first frame is decoded, since that is where the GIF's size comes from.
- **Geometry** (pure, see 3): centre-crop to 2.4:1, width `min(source, 1920)`, and both sides rounded down to even numbers, as H.264 requires.
- Check `canEncodeVideo("avc", { width, height })` before decoding, so an unsupported browser falls back straight away.

*Alternative:* ffmpeg.wasm. Rejected: about 25 MB of WASM and slow single-threaded encoding. *Alternative:* ffmpeg in the worker (see proposal, Non-goals). Rejected for now because it needs a queue and a processing state on the profile; it remains the route if browser results turn out uneven.

### 3. One pure module decides

The targets the browser and the backfill share live in `packages/lib/src/banner.ts` (with `banner.test.ts`): `BANNER_ASPECT_RATIO` (2.4, moved from `banner-upload.ts`), `STILL_MAX` (2400×1000), `MOVING_MAX_WIDTH` (1920), and `movingGeometry` and `stillGeometry`, the crop rectangle and output size from Decisions 2 and 7, given upright (display) dimensions. The browser's own rules sit in `apps/web/src/features/link/banner-rules.ts` (with `banner-rules.test.ts`), since they read `MAX_FILE_SIZE` from `@repo/api`, which `@repo/lib` cannot import:

- `bannerPlan(file)`: returns `{ kind: "still" } | { kind: "moving", rawFallback: boolean } | { kind: "refuse", reason: "type" | "size" }`. Stills are refused over 25 MB (`MAX_STILL_PICK_SIZE`), moving files over 100 MB (`MAX_MOVING_PICK_SIZE`), both web only, and SVG, AVI and unknown types by type. `rawFallback` is true for GIF, MP4, M4V and WebM, the types that play as they are in current browsers, and false for MOV, MKV and Ogg.
- `uploadCheck(file)`: the 10 MB check on the file that is about to be uploaded, used for an encoded still, a converted file and a fallback original.

When `convertMovingBanner` returns `null`, the dialog uploads the original only if `rawFallback` is true; otherwise it refuses with the cannot-convert message, which asks for an MP4. A still's pick limit is 25 MB rather than 100 MB because the browser decodes the whole image before the cropper scales it, and a larger file risks the canvas memory limits of phones.

`bannerFileError` in `banner-upload.ts` becomes a thin mapping from `bannerPlan`'s refusal to the `m.*` message.

### 4. When conversion runs

Conversion runs inside the Save mutation, not when the file is picked, so nothing is spent on a file the user abandons. The dialog holds an `AbortController` in a ref. A new pick, Clear, or unmounting the dialog aborts it. Progress is local `useState` in the dialog. No store is needed: progress is read nowhere else.

### 5. Types list

Remove `image/svg+xml` and `video/x-msvideo` from `acceptedFileMimeTypes`. `mimeTypeToExtension` is typed by that list, so add `svg: "image/svg+xml"` and `avi: "video/x-msvideo"` to `extensionToMimeType` by hand, as `jpeg` and `jfif` already are, so the worker's R2 scripts still label old objects. Display code reads the stored `bannerImgType` and is unaffected.

### 6. Dependency

Add `mediabunny` to the root catalog and use `"catalog:"` in `apps/web`. It is imported only from `banner-convert.ts`, which nothing imports statically.

### 7. Backfill of existing banners

`apps/worker/src/script/backfill-banner-compression.ts`, run by hand with `bun run --env-file=../../.env` from `apps/worker` on a machine with ffmpeg (libx264), like the other R2 scripts. It never runs in the worker's container.

- **Rows:** `user_address` rows with a `banner_img_url` set before `--before` (the web deploy; required with `APPLY=1`, and a null `banner_updated_at` counts as before) that `ownBannerKey` (`packages/api/src/lib/banner-key.ts`) recognises as our own object; any other URL is skipped and logged.
- **Stills** (JPEG, PNG, WebP, BMP, SVG): `sharp`, which renders SVG through librsvg. `stillGeometry` crops the 2.4:1 centre (`extract`), the region the profile already shows, since every banner display is `object-cover object-center`, then scales down to at most 2400×1000, never up; WebP at quality 85. An animated WebP is skipped, since a still encode would drop its animation. WebP keeps alpha, so transparency survives. The local ffmpeg build has no WebP encoder, hence `sharp`.
- **GIF and video:** ffmpeg, which applies rotation metadata before filters, so the crop sees the upright frame. One filter chain built from the shared constants: crop to the 2.4:1 centre, scale to at most 1920 wide, both sides even; `-c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -an -movflags +faststart`.
- **Replace rule** (`backfillDecision`, pure, in `apps/worker/src/lib/banner-backfill.ts` with tests): replace when the type is SVG, BMP, MOV, MKV, Ogg or AVI, or when the new file is at least 10% smaller (`MIN_SAVING`) than the original; otherwise keep the original and log it. A result over 10 MB is never uploaded. A GIF with transparency and an animated WebP are skipped.
- **Untrusted input:** ffmpeg and ffprobe are told the demuxer (`demuxerFor`, from the stored type), never left to guess it from uploaded bytes, and run under a timeout, as does each download.
- **Write:** upload to a new key in the server's format (`profile-banner/{address}-{Date.now()}.{ext}`) with its Content-Type and `CACHE_CONTROL`, then `UPDATE user_address SET banner_img_url, banner_img_type WHERE address = $1 AND banner_img_url = $old`. The `WHERE` on the old URL is a compare-and-set: a user who changes their banner meanwhile wins, and the new object is logged as an orphan rather than deleted. `banner_updated_at` is left alone, since the user did not change their banner. The original object is never deleted.
- **Done-log:** a `pending` line with the old and new URL is written before the `UPDATE`, and a final line after it. `doneUrls` skips every old URL decided on and every object the backfill wrote, so neither a second run nor a resume re-encodes a banner it replaced; a `pending` line with no final line leaves its old URL open for a retry. Rollback per line is `UPDATE … SET banner_img_url = old WHERE banner_img_url = new`, so it never overwrites a banner the user changed since.
- **Runs:** a dry run unless `APPLY=1`, as the worker's other writing scripts are: it writes outputs to a local folder (`--out`) and prints each decision, touching neither R2 nor the database. `--address <a>` limits a run to one profile. A done-log makes the full run resumable, and `--concurrency` defaults to 2, since ffmpeg is the bottleneck.

*Alternative:* re-encoding in the browser of the next visitor, or asking users to re-upload. Rejected: most banners would never be touched.

## Risks / Trade-offs

- [The output depends on the browser: Safari and Firefox WebCodecs support has gaps, especially `ImageDecoder` and the H.264 encoder] → Every gap returns `null`. A GIF, MP4, M4V or WebM then uploads as it does today; a MOV, MKV or Ogg is refused with a message to pick an MP4. Verify in Chrome and Safari, and note Firefox.
- [A user on a browser that cannot convert loses MOV uploads they have today] → Accepted: a raw MOV is often HEVC, which Chrome and Firefox on Windows cannot play, so today's upload is a banner many visitors never see. The message names MP4 as the fix.
- [Conversion is slow on long or high-resolution videos and on weak phones] → Show progress and allow cancel. The 100 MB pick limit bounds the worst case.
- [A long clip at medium quality can still come out over 10 MB] → The spec refuses it with a clear message. A duration cap or a second pass is left out on purpose (Non-Goals).
- [Without WebP encoding, a transparent still stays PNG and is larger than a JPEG would be] → It is at most 2400×1000, so it stays under 10 MB; `uploadCheck` catches the rare file that does not.
- [Existing SVG banners still run any script inside when their URL is opened directly] → Out of scope (proposal, Non-goals); this change only stops new ones.
- [The backfill writes to the production bucket and database] → A dry run first, then one profile with `--address`, checked on its profile page, then the full run, each with the user's approval. Originals stay in R2, so rollback is an `UPDATE` back to the logged old URL.
- [A user later replaces a backfilled banner] → `profile.edit` deletes the backfilled object, and the original stays in R2 as an orphan. Accepted: keeping originals was the user's call.
- [Holding the whole converted file in memory (`BufferTarget`, `fastStart: "in-memory"`)] → It is at most about 10 MB of output, which is acceptable.

## Migration Plan

No schema migration. Deploying web and API together keeps the SVG and AVI refusal consistent; if the API deploys first, an old client's SVG or AVI pick is refused by the server with the existing error toast. Run the backfill after that deploy, so no uncompressed upload lands behind it. Rollback of the code is a revert; rollback of the backfill is an `UPDATE` from its done-log, which records each old and new URL.
