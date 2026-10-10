// Cosmo's v1 metadata, which carried the serial, shut down at this instant. Serials of objekts
// minted at or after it are populate-serial's estimate.
export const V1_CUTOFF_MS = Date.parse("2026-06-04T08:07:02Z");

export function isSerialEstimated(mintedAt: Date | string) {
  return new Date(mintedAt).getTime() >= V1_CUTOFF_MS;
}

/** Serial 0 means not numbered yet. */
export function shownSerial(serial: number) {
  return serial > 0 ? serial : null;
}
