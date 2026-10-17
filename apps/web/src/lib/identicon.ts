const COLUMNS = 5;
const HALF = 3;

/**
 * A 5x5 grid mirrored left to right, read from an address's hex digits (case-insensitive). An
 * address is already uniformly random, so a digit of 8 or more turns its cell on and no hash is
 * needed.
 */
export function identiconGrid(address: string): boolean[][] {
  const digits = address.toLowerCase().replace(/^0x/, "");
  const on = (index: number) => Number.parseInt(digits[index] ?? "0", 16) >= 8;
  return Array.from({ length: COLUMNS }, (_, row) => {
    const left = Array.from({ length: HALF }, (_, column) => on(row * HALF + column));
    return [...left, ...left.slice(0, COLUMNS - HALF).toReversed()];
  });
}
