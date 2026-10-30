# Proposal

## Why

Profile banners are uploaded close to the size they are picked at. A cropped still is re-encoded in its own format at full resolution, with no quality setting, so a phone photo or a PNG stays several megabytes. GIFs and videos are uploaded untouched. Every profile visit downloads that file, and the blurred backdrop plays it a second time. Three smaller faults live in the same path: a BMP comes back from the canvas as PNG bytes but is stored as `image/bmp` with a `.bmp` key; SVG is accepted, so opening the object's URL directly runs any script inside it; and AVI, MKV and MOV are accepted although many browsers cannot play them.

## What Changes

- **Stills** (JPEG, PNG, WebP, BMP): the crop is scaled down to at most 2400×1000 (the 2.4:1 banner ratio) and encoded as WebP at about 0.85 quality. Where the browser cannot encode WebP (Safari), it is encoded as JPEG, or kept as PNG when the crop has transparent pixels. The uploaded type and key extension always match the bytes. Save waits for the cropper to load, so a still is never uploaded uncropped.
- **GIF and video**: converted in the browser to a muted H.264 MP4, cropped to 2.4:1 around the centre, at most 1920 px wide, with its index at the front of the file so it starts playing before it has fully downloaded. GIF animation is kept. Where the browser cannot convert the file, a GIF, MP4, M4V or WebM is uploaded as it is today, provided it is within the size limit; a MOV, MKV or Ogg is refused with a message to pick an MP4, since many browsers cannot play those as they are.
- **Size limit**: the 10 MB limit applies to the file that is uploaded. A still picked at up to 25 MB, and a GIF or video picked at up to 100 MB, is accepted because it is re-encoded first; the result is refused before upload if it is still over 10 MB.
- **Progress**: while a GIF or video converts, the dialog shows its progress and Save stays busy; closing the dialog cancels the conversion.
- **Backfill**: a one-off worker script re-encodes the banners already in R2 to the same targets (stills, SVG included, to WebP; GIF and video to MP4) and points each profile at the new object. The original objects stay in R2. A banner is replaced only when the new file is smaller, or when its type is one that misbehaves (SVG, BMP, MOV, MKV, Ogg, AVI).
- **BREAKING (uploads only)**: SVG and AVI banners can no longer be uploaded (Mediabunny cannot read AVI, so it could only ever be uploaded raw, and browsers do not play it). Existing SVG and AVI banners keep showing.

Route covered: the Edit profile dialog on `/account/profiles` (`features/link/edit-cosmo-dialog.tsx`). The banner display on `/@{nickname}` and in the hover card is unchanged.

## Non-goals

- Server-side transcoding of new uploads (ffmpeg in the running worker), a processing queue, or a "processing" state on the profile. The backfill runs ffmpeg once, by hand.
- Deleting the original objects the backfill replaces. They stay in R2, so an old SVG remains reachable at its old URL; a cleanup is a separate change.
- A user-chosen crop for GIF and video; they are centre-cropped.
- Poster frames, multiple renditions or responsive `srcset` for banners.
- Changing how banners are displayed, blurred or hidden.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-cosmo-link`: the Edit profile requirement changes. Stills are resized and re-encoded, GIFs and videos are converted to MP4 when the browser can, the size limit applies to the re-encoded file, and SVG and AVI are no longer accepted. Banners uploaded before the change are re-encoded once by the backfill.

## Impact

- `apps/web/src/features/link/banner-upload.ts`: still encoding, file checks, size rules.
- `apps/web/src/features/link/edit-cosmo-dialog.tsx`: conversion step, progress, cancel, Save waits for the cropper.
- New lazily loaded module in `apps/web/src/features/link/` for the GIF/video conversion. Mediabunny is a new `apps/web` dependency, added through the catalog and loaded only when a GIF or video is picked.
- `packages/lib/src/banner.ts` (new): the banner's output targets and crop geometry, shared by the browser and the backfill.
- `apps/worker/src/script/backfill-banner-compression.ts` (new), with its pure decisions in `apps/worker/src/lib/banner-backfill.ts`. `sharp` is a new worker dev dependency, through the catalog; ffmpeg must be installed where the script runs. It writes to the production bucket and the `user_address` banner columns, and runs only with the user's approval.
- `packages/lib/src/media.ts`: `image/svg+xml` and `video/x-msvideo` are removed from `acceptedFileMimeTypes`, but `.svg` and `.avi` keep mapping to their MIME types for existing objects.
- `packages/api`: `presignedPostInputSchema` follows the shared list; `MAX_FILE_SIZE` stays 10 MB. No database or migration change.
- Paraglide messages (en, ko, ja) for converting, progress, the converted-file-too-large error and the cannot-convert error, plus the updated recommendation text.
