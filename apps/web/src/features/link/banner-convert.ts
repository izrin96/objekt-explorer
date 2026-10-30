import { type BannerGeometry, movingGeometry } from "@repo/lib/banner";
import {
  BlobSource,
  BufferTarget,
  CanvasSource,
  canEncodeVideo,
  Conversion,
  Input,
  MATROSKA,
  MP4,
  Mp4OutputFormat,
  OGG,
  Output,
  QTFF,
  QUALITY_MEDIUM,
  WEBM,
} from "mediabunny";

import { reportError } from "@/lib/error-tracking";

type ConvertOptions = { signal: AbortSignal; onProgress: (progress: number) => void };

/**
 * A GIF or video as a muted 2.4:1 H.264 MP4, or `null` when this browser
 * cannot decode or encode it, or the GIF has transparency H.264 cannot keep.
 * Only an abort rejects; any other failure is reported, then falls back.
 */
export async function convertMovingBanner(
  file: File,
  options: ConvertOptions,
): Promise<Blob | null> {
  try {
    const buffer =
      file.type === "image/gif"
        ? await convertGif(file, options)
        : await convertVideo(file, options);
    return buffer ? new Blob([buffer], { type: "video/mp4" }) : null;
  } catch (error) {
    if (options.signal.aborted) throw options.signal.reason;
    reportError(error);
    return null;
  }
}

const canEncode = (geometry: BannerGeometry) =>
  canEncodeVideo("avc", { ...geometry.output, quality: QUALITY_MEDIUM });

const mp4Output = () =>
  new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

async function convertVideo(file: File, options: ConvertOptions) {
  const input = new Input({
    formats: [MP4, QTFF, WEBM, MATROSKA, OGG],
    source: new BlobSource(file),
  });
  try {
    return await transcode(input, options);
  } finally {
    input.dispose();
  }
}

async function transcode(input: Input, { signal, onProgress }: ConvertOptions) {
  const track = await input.getPrimaryVideoTrack();
  if (!track) return null;

  // crop is applied after rotation metadata, so it needs the upright size
  const geometry = movingGeometry({
    width: await track.getDisplayWidth(),
    height: await track.getDisplayHeight(),
  });
  if (!(await canEncode(geometry))) return null;

  const output = mp4Output();
  const conversion = await Conversion.init({
    input,
    output,
    video: {
      crop: geometry.crop,
      ...geometry.output,
      // the crop already has the output's ratio
      fit: "fill",
      codec: "avc",
      quality: QUALITY_MEDIUM,
    },
    audio: { discard: true },
  });
  // valid only means some track survives; the picture must be one of them
  if (!conversion.isValid || conversion.discardedTracks.some((d) => d.track === track)) {
    return null;
  }

  signal.throwIfAborted();
  const cancel = () => void conversion.cancel();
  signal.addEventListener("abort", cancel, { once: true });
  conversion.onProgress = onProgress;
  try {
    await conversion.execute();
  } finally {
    signal.removeEventListener("abort", cancel);
  }
  return output.target.buffer;
}

function hasTransparency(
  context: OffscreenCanvasRenderingContext2D,
  size: BannerGeometry["output"],
) {
  const { data } = context.getImageData(0, 0, size.width, size.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true;
  }
  return false;
}

/** Browsers play GIF delays under 20 ms at 100 ms. */
function frameSeconds(microseconds: number | null) {
  const ms = (microseconds ?? 100_000) / 1000;
  return (ms < 20 ? 100 : ms) / 1000;
}

async function convertGif(file: File, { signal, onProgress }: ConvertOptions) {
  if (typeof ImageDecoder === "undefined" || !(await ImageDecoder.isTypeSupported("image/gif"))) {
    return null;
  }

  const decoder = new ImageDecoder({ type: "image/gif", data: await file.arrayBuffer() });
  try {
    await decoder.tracks.ready;
    // frameCount can grow while the data is still being parsed
    await decoder.completed;
    const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 0;
    if (frameCount === 0) return null;

    const first = await decoder.decode({ frameIndex: 0 });
    const geometry = movingGeometry({
      width: first.image.displayWidth,
      height: first.image.displayHeight,
    });
    first.image.close();
    if (!(await canEncode(geometry))) return null;

    const { crop, output: size } = geometry;
    const canvas = new OffscreenCanvas(size.width, size.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    const output = mp4Output();
    const source = new CanvasSource(canvas, { codec: "avc", quality: QUALITY_MEDIUM });
    output.addVideoTrack(source);
    await output.start();

    try {
      let timestamp = 0;
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        signal.throwIfAborted();
        const { image } = await decoder.decode({ frameIndex });
        context.clearRect(0, 0, size.width, size.height);
        context.drawImage(
          image,
          crop.left,
          crop.top,
          crop.width,
          crop.height,
          0,
          0,
          size.width,
          size.height,
        );
        if (hasTransparency(context, size)) {
          image.close();
          await output.cancel();
          return null;
        }
        const duration = frameSeconds(image.duration);
        image.close();
        await source.add(timestamp, duration);
        timestamp += duration;
        onProgress((frameIndex + 1) / frameCount);
      }
      await output.finalize();
    } catch (error) {
      await output.cancel();
      throw error;
    }
    return output.target.buffer;
  } finally {
    decoder.close();
  }
}
