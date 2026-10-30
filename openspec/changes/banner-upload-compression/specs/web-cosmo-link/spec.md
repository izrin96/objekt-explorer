# Spec Delta

## MODIFIED Requirements

### Requirement: Edit profile
The edit dialog SHALL load the profile's current settings and offer no privacy toggles (hiding the Cosmo ID, serials, activity history or the whole profile is no longer possible), let the user choose a grid
column count between 2 and 18 or unset, and set, replace or remove a banner. Images SHALL
be cropped to the banner ratio and compressed before upload; GIFs and videos SHALL be converted
before upload where the browser can (see Moving banner conversion and Moving banner fallback).
Files of an unsupported type, and files that would upload over the size limit, SHALL be refused
before upload. Saving SHALL persist through the server.

#### Scenario: Banner upload
- **WHEN** the user picks a JPEG, crops it and saves
- **THEN** the profile's banner URL points at the uploaded object and the dialog closes

#### Scenario: Oversized file
- **WHEN** the user picks a file larger than the limit
- **THEN** a message explains the limit and nothing is uploaded

#### Scenario: No privacy toggles
- **WHEN** the user opens the edit dialog of a profile that had Private Profile on before this change
- **THEN** the dialog shows the banner and grid settings only, and saving changes nothing else

## ADDED Requirements

### Requirement: Still banner compression
A picked JPEG, PNG, WebP or BMP SHALL be uploaded as the user's crop at the 2.4:1 banner ratio, scaled down to at most 2400×1000 pixels (never scaled up), encoded as WebP. Where the browser cannot encode WebP, it SHALL be encoded as JPEG when every pixel is opaque, and as PNG when the crop has transparent pixels. The stored type and the object's file extension SHALL match the uploaded bytes. Save SHALL stay unavailable until the crop area has loaded.

#### Scenario: Large photo is reduced
- **WHEN** the user picks a 4000×3000 JPEG of 6 MB, crops it and saves
- **THEN** the uploaded banner is 2400×1000 pixels, WebP or JPEG, and well under the original size

#### Scenario: Small image is not enlarged
- **WHEN** the user picks a 1200×800 PNG and crops the full width
- **THEN** the uploaded banner is 1200×500 pixels

#### Scenario: BMP is stored as what it is
- **WHEN** the user picks a BMP and saves
- **THEN** the banner's stored type and file extension are WebP or JPEG, not BMP

#### Scenario: Transparent PNG without WebP encoding
- **WHEN** the user picks a PNG with transparent areas and saves in a browser that cannot encode WebP
- **THEN** the uploaded banner is a PNG that keeps its transparency

#### Scenario: Save before the crop area loads
- **WHEN** the user picks a PNG and the crop area has not loaded yet
- **THEN** Save cannot be pressed until it has

### Requirement: Moving banner conversion
A picked GIF or video SHALL be converted before upload, where the browser can, to a silent MP4 cropped to 2.4:1 around its centre, at most 1920 pixels wide and never scaled up, that starts playing before it has fully downloaded, keeping the animation. While it converts, the dialog SHALL show its progress and keep Save busy. Closing the dialog or picking another file SHALL stop the conversion and upload nothing.

#### Scenario: GIF keeps its animation
- **WHEN** the user picks an animated GIF and saves in a browser that can convert it
- **THEN** the banner is an MP4 that plays the same animation, looping and muted on the profile

#### Scenario: Video loses its sound
- **WHEN** the user picks a 1080p MOV with an audio track
- **THEN** the uploaded banner is an MP4 at 2.4:1, at most 1920 pixels wide, with no audio track

#### Scenario: Portrait phone video
- **WHEN** the user picks a video recorded in portrait on a phone
- **THEN** the banner is cropped from the upright picture, a 2.4:1 band across its middle, not from the sideways frame stored in the file

#### Scenario: Progress while converting
- **WHEN** a 40 MB video is converting
- **THEN** the dialog shows how far the conversion has got and Save shows it is busy

#### Scenario: Closing cancels
- **WHEN** the user closes the dialog while a video is converting
- **THEN** the conversion stops and nothing is uploaded or saved

### Requirement: Moving banner fallback
Where the browser cannot convert a GIF, MP4, M4V or WebM file, and for a GIF with transparent areas, which an MP4 cannot keep, the original SHALL be uploaded as picked, as long as it is within the size limit. Where it cannot convert a QuickTime, Matroska or Ogg video, the file SHALL be refused with a message asking for an MP4, since many browsers cannot play those as they are. A file that would be refused for size SHALL be refused before any upload, with a message saying why.

#### Scenario: Browser cannot convert
- **WHEN** the user picks a 6 MB GIF in a browser that cannot convert it
- **THEN** the GIF is uploaded as picked and becomes the banner

#### Scenario: Browser cannot convert a large file
- **WHEN** the user picks a 30 MB MP4 in a browser that cannot convert it
- **THEN** a message explains the 10 MB limit and nothing is uploaded

#### Scenario: Transparent GIF
- **WHEN** the user picks a 3 MB GIF with a transparent background
- **THEN** the GIF is uploaded as picked and keeps its transparency

#### Scenario: Browser cannot convert a MOV
- **WHEN** the user picks a 6 MB MOV in a browser that cannot convert it
- **THEN** a message asks for an MP4 and nothing is uploaded

### Requirement: Banner size limit
The 10 MB limit SHALL apply to the file that is uploaded. A still SHALL be accepted at up to 25 MB as picked, and a GIF or video at up to 100 MB; each SHALL be refused before upload when the file it would upload is still over 10 MB. The server SHALL keep refusing any upload over 10 MB.

#### Scenario: Large still that compresses small enough
- **WHEN** the user picks a 15 MB PNG, crops it and saves
- **THEN** the compressed banner, under 10 MB, is uploaded and becomes the banner

#### Scenario: Still over the pick limit
- **WHEN** the user picks a 30 MB PNG
- **THEN** a message explains the limit and the crop area does not open

#### Scenario: Large video that converts small enough
- **WHEN** the user picks a 60 MB video that converts to 5 MB
- **THEN** the 5 MB MP4 is uploaded and becomes the banner

#### Scenario: Converted file still too large
- **WHEN** a picked video converts to 14 MB
- **THEN** a message says the converted banner is over 10 MB and nothing is uploaded

#### Scenario: Pick over 100 MB
- **WHEN** the user picks a 150 MB video
- **THEN** a message explains the limit and no conversion starts

### Requirement: Accepted banner types
The dialog and the server SHALL accept JPEG, PNG, WebP, BMP and GIF images and MP4, WebM, Ogg, QuickTime, Matroska and M4V videos, and SHALL refuse SVG and AVI. Banners already stored as SVG or AVI SHALL keep displaying as they do today.

#### Scenario: SVG is refused
- **WHEN** the user picks an SVG file
- **THEN** a message says the file type is not supported and nothing is uploaded

#### Scenario: AVI is refused
- **WHEN** the user picks an AVI file
- **THEN** a message says the file type is not supported and nothing is uploaded

#### Scenario: Existing SVG banner
- **WHEN** a profile whose banner was uploaded as SVG before this change is opened
- **THEN** the banner still shows

### Requirement: Existing banner backfill
Banners set before the web deploy that compresses uploads SHALL be re-encoded once: stills, SVG included, to a WebP of the 2.4:1 centre at most 2400×1000 pixels, and GIFs and videos to a silent MP4 of the 2.4:1 centre at most 1920 pixels wide. The original object SHALL be kept. A banner the user changes while the backfill runs SHALL keep the user's change. A banner the backfill already wrote SHALL never be re-encoded by a later or resumed run.

#### Scenario: Large banner is replaced
- **WHEN** the backfill reaches a profile whose banner is a 6 MB PNG
- **THEN** the profile shows a smaller WebP of the same centre region, and the PNG is still in the bucket

#### Scenario: SVG banner is rasterised
- **WHEN** the backfill reaches a profile whose banner is an SVG
- **THEN** the profile shows a WebP of it

#### Scenario: Second run
- **WHEN** the backfill runs again after replacing a profile's banner
- **THEN** it leaves the replaced banner as it is

#### Scenario: User changes the banner during the run
- **WHEN** a user saves a new banner after the backfill read their row and before it wrote
- **THEN** the profile keeps the user's new banner

### Requirement: Backfill replace rule
The backfill SHALL point a profile at the re-encoded banner only when it is within 10 MB and is either at least 10% smaller than the original or replaces an SVG, BMP, QuickTime, Matroska, Ogg or AVI original. A GIF with transparent areas and an animated WebP SHALL be left as they are.

#### Scenario: Small banner is kept
- **WHEN** the backfill reaches a JPEG banner that re-encodes to a larger file
- **THEN** the profile keeps its JPEG
