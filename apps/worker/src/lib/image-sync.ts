// thumbnailImage is deliberately not part of the hash: the thumbnail is derived from frontImage at
// 2x, so thumbnailImage is never a fetch source and a change to it alone would queue a pointless
// reprocess. Must stay in sync with the md5 expression in process-collection-images.ts.
export function imageSyncHash(front: string, back: string) {
  const hasher = new Bun.CryptoHasher("md5");
  hasher.update(`${front}|${back}`);
  return hasher.digest("hex");
}

type ImageRow = {
  frontImage: string;
  backImage: string;
  processedFrontImage: string | null;
  processedThumbnailImage: string | null;
  processedBackImage: string | null;
  imageSyncHash: string | null;
};

/**
 * Only the back image is new: the front and thumbnail were processed from this same front with no
 * back (as when the collection-media job fills an empty `back_image`), so only the back is fetched.
 */
export function backImageOnly(row: ImageRow) {
  return (
    row.backImage !== "" &&
    row.processedBackImage === null &&
    row.processedFrontImage !== null &&
    row.processedThumbnailImage !== null &&
    row.imageSyncHash === imageSyncHash(row.frontImage, "")
  );
}
