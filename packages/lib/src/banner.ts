/**
 * Targets for a profile banner, shared by the browser upload and the worker's
 * backfill so both produce the same file.
 */
export const BANNER_ASPECT_RATIO = 2.4;

export const STILL_MAX = { width: 2400, height: 1000 } as const;

export const MOVING_MAX_WIDTH = 1920;

export type Size = { width: number; height: number };

export type BannerGeometry = {
  crop: { left: number; top: number; width: number; height: number };
  output: Size;
};

/** H.264 needs even dimensions. */
const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);

function centreCrop(source: Size): BannerGeometry["crop"] {
  const wide = source.width / source.height > BANNER_ASPECT_RATIO;
  const width = Math.floor(wide ? source.height * BANNER_ASPECT_RATIO : source.width);
  const height = Math.floor(wide ? source.height : source.width / BANNER_ASPECT_RATIO);
  return {
    left: Math.floor((source.width - width) / 2),
    top: Math.floor((source.height - height) / 2),
    width,
    height,
  };
}

/**
 * The 2.4:1 centre of a frame, scaled down to at most `MOVING_MAX_WIDTH` and
 * never up. `source` is the upright (display) size, after rotation metadata.
 */
export function movingGeometry(source: Size): BannerGeometry {
  const crop = centreCrop(source);
  const width = even(Math.min(crop.width, MOVING_MAX_WIDTH));
  return { crop, output: { width, height: even(width / BANNER_ASPECT_RATIO) } };
}

/** The 2.4:1 centre of an upright image, scaled down to at most `STILL_MAX` and never up. */
export function stillGeometry(source: Size): BannerGeometry {
  const crop = centreCrop(source);
  const width = Math.min(crop.width, STILL_MAX.width);
  return {
    crop,
    output: { width, height: Math.max(1, Math.round(width / BANNER_ASPECT_RATIO)) },
  };
}
