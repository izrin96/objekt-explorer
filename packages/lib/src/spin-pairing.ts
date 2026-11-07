import { Addresses } from "./index";

/** How long after a spin its reward may land; past it, a spin with none broke. */
export const SPIN_REWARD_WINDOW_MS = 10 * 60 * 1000;

export type SpinOutcome = "reward" | "broke" | "pending";

/** A spin (sent to the Spin address) or a mint, from the spinner's side. */
export type SpinEvent = {
  id: string;
  /** the spinner: the spin's sender, the mint's receiver */
  address: string;
  /** epoch milliseconds */
  at: number;
  artist: string;
};

/**
 * Pairs each spin with its reward, first in first out per spinner: a mint goes
 * to the oldest unclaimed spin of the same artist at or before it, within the
 * window. Spinners often send the next spin before the last reward lands, so
 * "the nearest mint after the spin" would hand one reward to two spins.
 * Returns spin id → mint id.
 */
export function pairSpins(spins: SpinEvent[], mints: SpinEvent[]): Map<string, string> {
  const byAddress = new Map<string, { spins: SpinEvent[]; mints: SpinEvent[] }>();
  const slot = (address: string) => {
    let entry = byAddress.get(address);
    if (!entry) {
      entry = { spins: [], mints: [] };
      byAddress.set(address, entry);
    }
    return entry;
  };
  for (const spin of spins) slot(spin.address.toLowerCase()).spins.push(spin);
  for (const mint of mints) slot(mint.address.toLowerCase()).mints.push(mint);

  const pairs = new Map<string, string>();
  for (const entry of byAddress.values()) {
    const ordered = [...entry.spins].sort(byTime);
    const open: SpinEvent[] = [];
    let next = 0;
    for (const mint of [...entry.mints].sort(byTime)) {
      while (next < ordered.length && ordered[next]!.at <= mint.at) open.push(ordered[next++]!);
      const artist = mint.artist.toLowerCase();
      const index = open.findIndex(
        (spin) =>
          mint.at - spin.at <= SPIN_REWARD_WINDOW_MS && spin.artist.toLowerCase() === artist,
      );
      if (index === -1) continue;
      pairs.set(open[index]!.id, mint.id);
      open.splice(index, 1);
    }
  }
  return pairs;
}

/** `clock` is the newest indexed time: a lagging indexer must not turn recent spins broke. */
export function spinOutcome(spinAt: number, rewarded: boolean, clock: number): SpinOutcome {
  if (rewarded) return "reward";
  return clock - spinAt > SPIN_REWARD_WINDOW_MS ? "broke" : "pending";
}

/** A transfer from the spinner's side: its kind, or null when it is neither a spin nor a possible reward. */
export function spinRole(from: string, to: string): "spin" | "mint" | null {
  const sender = from.toLowerCase();
  const receiver = to.toLowerCase();
  if (receiver === Addresses.SPIN) return sender === Addresses.NULL ? null : "spin";
  return sender === Addresses.NULL ? "mint" : null;
}

export type SpinWindow = { address: string; from: number; to: number };

/**
 * The spans to read a spinner's spins and mints over, so each spin and mint on a
 * page pairs as it would against the whole chain. A spin's reward lands up to a
 * window after it; a mint's spin sits up to a window before, and that spin's
 * claim hangs on the spins before it, hence two windows back. One span per row,
 * merged where they touch: a span per address would read a filtered page's
 * months of history.
 */
export function spinWindows(rows: { from: string; to: string; at: number }[]): SpinWindow[] {
  const byAddress = new Map<string, SpinWindow[]>();
  for (const row of rows) {
    const role = spinRole(row.from, row.to);
    if (!role) continue;
    const address = (role === "spin" ? row.from : row.to).toLowerCase();
    const span = {
      address,
      from: row.at - 2 * SPIN_REWARD_WINDOW_MS,
      to: row.at + SPIN_REWARD_WINDOW_MS,
    };
    const spans = byAddress.get(address);
    if (spans) spans.push(span);
    else byAddress.set(address, [span]);
  }

  const merged: SpinWindow[] = [];
  for (const spans of byAddress.values()) {
    spans.sort((a, b) => a.from - b.from);
    let current = spans[0]!;
    for (const span of spans.slice(1)) {
      // inclusive: the read is BETWEEN, so spans that only touch would read a transfer twice
      if (span.from <= current.to) current = { ...current, to: Math.max(current.to, span.to) };
      else {
        merged.push(current);
        current = span;
      }
    }
    merged.push(current);
  }
  return merged;
}

/**
 * `pairSpins` within each window on its own: events in two windows of one
 * spinner were read with a gap between them, and pairing across it would let a
 * spin reach past its unread reward to a later mint.
 */
export function pairSpinsInWindows(
  windows: SpinWindow[],
  spins: SpinEvent[],
  mints: SpinEvent[],
): Map<string, string> {
  const groups = windows.map(() => ({ spins: [] as SpinEvent[], mints: [] as SpinEvent[] }));
  const place = (event: SpinEvent, side: "spins" | "mints") => {
    const address = event.address.toLowerCase();
    const index = windows.findIndex(
      (w) => w.address === address && event.at >= w.from && event.at <= w.to,
    );
    if (index !== -1) groups[index]![side].push(event);
  };
  for (const spin of spins) place(spin, "spins");
  for (const mint of mints) place(mint, "mints");

  const pairs = new Map<string, string>();
  for (const group of groups) {
    for (const [spinId, mintId] of pairSpins(group.spins, group.mints)) pairs.set(spinId, mintId);
  }
  return pairs;
}

export type SpinNote =
  | { kind: "spin"; outcome: SpinOutcome; rewardId?: string }
  | { kind: "reward"; spinId: string };

/** What each spin or reward row on a page carries, given the pairs read around it. */
export function spinNotes(
  rows: { id: string; from: string; to: string; at: number }[],
  pairs: Map<string, string>,
  clock: number,
): Map<string, SpinNote> {
  const spinOf = new Map([...pairs].map(([spinId, mintId]) => [mintId, spinId]));
  const notes = new Map<string, SpinNote>();
  for (const row of rows) {
    const role = spinRole(row.from, row.to);
    if (role === "spin") {
      const rewardId = pairs.get(row.id);
      notes.set(row.id, {
        kind: "spin",
        outcome: spinOutcome(row.at, rewardId !== undefined, clock),
        ...(rewardId !== undefined && { rewardId }),
      });
    } else if (role === "mint") {
      const spinId = spinOf.get(row.id);
      if (spinId !== undefined) notes.set(row.id, { kind: "reward", spinId });
    }
  }
  return notes;
}

function byTime(a: SpinEvent, b: SpinEvent) {
  return a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
