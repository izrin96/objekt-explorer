/**
 * Profile banner fixtures. Nothing is fetched: the still banner is a canvas
 * gradient + noise encoded as a data URL, the video banner is the same canvas
 * animated and captured with `MediaRecorder` into a blob URL.
 */
export type BannerKind = "image" | "video";

export type LabBanner = {
  url: string;
  /** mirrors the app's `bannerImgType`: `image/*` or `video/*` */
  type: string;
};

const WIDTH = 1200;
const HEIGHT = Math.round(WIDTH / 2.4);

function paint(ctx: CanvasRenderingContext2D, seed: number, t: number) {
  const hue = seed % 360;
  const drift = Math.sin(t * Math.PI * 2) * 60;
  const gradient = ctx.createLinearGradient(drift, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, `hsl(${hue} 42% 62%)`);
  gradient.addColorStop(0.45, `hsl(${(hue + 40) % 360} 38% 38%)`);
  gradient.addColorStop(1, `hsl(${(hue + 200) % 360} 30% 18%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // soft moving blob so the video has something to animate
  const blob = ctx.createRadialGradient(
    WIDTH * (0.3 + 0.4 * t),
    HEIGHT * 0.4,
    0,
    WIDTH * (0.3 + 0.4 * t),
    HEIGHT * 0.4,
    HEIGHT,
  );
  blob.addColorStop(0, `hsl(${(hue + 90) % 360} 60% 70% / 0.45)`);
  blob.addColorStop(1, "transparent");
  ctx.fillStyle = blob;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function addNoise(ctx: CanvasRenderingContext2D, seed: number) {
  let state = seed || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = next() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(next() * WIDTH, next() * HEIGHT, 2, 2);
  }
  ctx.globalAlpha = 1;
}

const imageCache = new Map<number, string>();

/** still banner, `image/png` data URL */
export function bannerImage(seed: number): string {
  const cached = imageCache.get(seed);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  paint(ctx, seed, 0.35);
  addNoise(ctx, seed);
  const url = canvas.toDataURL("image/png");
  imageCache.set(seed, url);
  return url;
}

const VIDEO_MS = 1400;
const MIME_CANDIDATES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

function record(seed: number): Promise<LabBanner | null> {
  if (typeof MediaRecorder === "undefined") return Promise.resolve(null);
  const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
  if (!mimeType) return Promise.resolve(null);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<LabBanner | null>((resolve) => {
    recorder.onstop = () => {
      for (const track of stream.getTracks()) track.stop();
      if (chunks.length === 0) return resolve(null);
      const blob = new Blob(chunks, { type: "video/webm" });
      resolve({ url: URL.createObjectURL(blob), type: "video/webm" });
    };

    const started = performance.now();
    const frame = () => {
      const elapsed = performance.now() - started;
      // ping-pong so the loop point is seamless
      const phase = (elapsed / VIDEO_MS) * 2;
      paint(ctx, seed, phase <= 1 ? phase : 2 - phase);
      addNoise(ctx, seed + Math.floor(elapsed));
      if (elapsed < VIDEO_MS) requestAnimationFrame(frame);
      else recorder.stop();
    };

    recorder.start();
    requestAnimationFrame(frame);
  });
}

const videoCache = new Map<number, Promise<LabBanner | null>>();

/** animated banner, `video/webm` blob URL; resolves to null when unsupported */
export function bannerVideo(seed: number): Promise<LabBanner | null> {
  let pending = videoCache.get(seed);
  if (!pending) {
    pending = record(seed);
    videoCache.set(seed, pending);
  }
  return pending;
}
