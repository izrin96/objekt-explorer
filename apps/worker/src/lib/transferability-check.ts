export const MULTICALL3 = "0xca11bde05977b3631167028862be2a173976ca11";

const AGGREGATE3 = "0x82ad56cb";
const IS_OBJEKT_TRANSFERABLE = "b2c03a50";
const BOOL_WORD = /^0{63}[01]$/;

const word = (value: bigint | number) => value.toString(16).padStart(64, "0");

/** Calldata for Multicall3 `aggregate3`, one `isObjektTransferable(tokenId)` per token, each allowed to fail. */
export function encodeAggregate3(target: string, tokenIds: readonly string[]) {
  const address = word(BigInt(target));
  // each Call3 is 6 words: target, allowFailure, bytes offset, length, then 36 bytes padded to 2 words
  const callWords = 6;
  const offsets = tokenIds.map((_, i) => word((tokenIds.length + i * callWords) * 32));
  const calls = tokenIds.map((tokenId) => {
    const callData = `${IS_OBJEKT_TRANSFERABLE}${word(BigInt(tokenId))}`.padEnd(2 * 64, "0");
    return `${address}${word(1)}${word(0x60)}${word(36)}${callData}`;
  });
  return `${AGGREGATE3}${word(32)}${word(tokenIds.length)}${offsets.join("")}${calls.join("")}`;
}

/**
 * Each entry of an `aggregate3` return as the token's transferability, or `null` when the call
 * failed or returned anything but one bool word (an empty return reads as no answer, not `true`).
 */
export function decodeAggregate3(result: string, count: number): (boolean | null)[] {
  const hex = result.startsWith("0x") ? result.slice(2) : result;
  const readWord = (byte: number) => {
    const slice = hex.slice(byte * 2, byte * 2 + 64);
    if (slice.length !== 64) throw new Error(`aggregate3 result ends at byte ${byte}`);
    return slice;
  };
  const readNumber = (byte: number) => Number.parseInt(readWord(byte), 16);

  const array = readNumber(0);
  const length = readNumber(array);
  if (length !== count) {
    throw new Error(`aggregate3 returned ${length} entries for ${count} calls`);
  }
  const values: (boolean | null)[] = [];
  for (let i = 0; i < length; i++) {
    const entry = array + 32 + readNumber(array + 32 + i * 32);
    const success = readNumber(entry) === 1;
    const data = entry + readNumber(entry + 32);
    const dataLength = readNumber(data);
    if (!success || dataLength !== 32) {
      values.push(null);
      continue;
    }
    const value = readWord(data + 32);
    values.push(BOOL_WORD.test(value) ? value.endsWith("1") : null);
  }
  return values;
}

export type CheckedObjekt = { id: string; class: string | null; transferable: boolean };

type Direction = "true-in-db" | "false-in-db";

export type Mismatch<T extends CheckedObjekt = CheckedObjekt> = T & {
  chain: boolean;
  direction: Direction;
};

/** Splits a page into the rows the chain disagrees with and the ids it gave no answer for. */
export function compareWithChain<T extends CheckedObjekt>(
  rows: readonly T[],
  chain: readonly (boolean | null)[],
) {
  if (chain.length !== rows.length) {
    throw new Error(`${chain.length} chain values for ${rows.length} objekts`);
  }
  const mismatches: Mismatch<T>[] = [];
  const skipped: string[] = [];
  for (const [i, row] of rows.entries()) {
    const value = chain[i];
    if (value === null || value === undefined) {
      skipped.push(row.id);
    } else if (value !== row.transferable) {
      mismatches.push({
        ...row,
        chain: value,
        direction: row.transferable ? "true-in-db" : "false-in-db",
      });
    }
  }
  return { mismatches, skipped };
}

export type Tally = Map<string, { checked: number; "true-in-db": number; "false-in-db": number }>;

/** Adds a page's counts per class. */
export function addToTally(
  tally: Tally,
  rows: readonly CheckedObjekt[],
  mismatches: readonly Mismatch[],
) {
  const entry = (name: string | null) => {
    const key = name ?? "(no collection)";
    let counts = tally.get(key);
    if (!counts) {
      counts = { checked: 0, "true-in-db": 0, "false-in-db": 0 };
      tally.set(key, counts);
    }
    return counts;
  };
  for (const row of rows) entry(row.class).checked += 1;
  for (const mismatch of mismatches) entry(mismatch.class)[mismatch.direction] += 1;
  return tally;
}
