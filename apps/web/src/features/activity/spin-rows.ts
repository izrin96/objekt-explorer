import { type SpinOutcome, spinOutcome } from "@repo/lib/spin-pairing";

type Transfer = { id: string; from: string; to: string; timestamp: string };

export type SpinRow<O> = {
  transfer: Transfer;
  objekt: O;
  spin?: { outcome: SpinOutcome; reward?: { transfer: Transfer; objekt: O } };
  rewardOf?: string;
};

export type FoldOptions<O> = {
  /** the All view, where a reward shows only inside its spin row */
  all: boolean;
  /** collection facets are set, so a spin may be filtered out while its reward is not */
  faceted: boolean;
  /** rewards paired in the browser after the page loaded, by spin id */
  rewards?: ReadonlyMap<string, { transfer: Transfer; objekt: O }>;
  /** epoch ms; a pending spin older than the window by it reads as broke */
  clock?: number;
};

/**
 * The rows a transfer list draws: spin rows carry their outcome, and the All view
 * folds a reward into the spin row that shows it. A reward stays its own row when
 * its listed spin shows another (two pages can pair a chain differently) and when
 * facets may have dropped its spin; it hides ahead of time only when its spin
 * sits on a page not loaded yet.
 */
export function foldSpinRows<O, T extends SpinRow<O>>(rows: T[], options: FoldOptions<O>): T[] {
  const { all, faceted, rewards, clock } = options;
  const drawn = rows.map((row) => withOutcome(row, rewards?.get(row.transfer.id), clock));
  if (!all) return drawn;

  const spinIds = new Set<string>();
  const shown = new Set<string>();
  for (const row of drawn) {
    if (!row.spin) continue;
    spinIds.add(row.transfer.id);
    if (row.spin.reward) shown.add(row.spin.reward.transfer.id);
  }

  return drawn.filter((row) => {
    if (shown.has(row.transfer.id)) return false;
    return row.rewardOf === undefined || faceted || spinIds.has(row.rewardOf);
  });
}

function withOutcome<O, T extends SpinRow<O>>(
  row: T,
  liveReward: { transfer: Transfer; objekt: O } | undefined,
  clock: number | undefined,
): T {
  if (!row.spin || row.spin.outcome !== "pending") return row;
  if (liveReward) return { ...row, spin: { outcome: "reward", reward: liveReward } };
  if (
    clock !== undefined &&
    spinOutcome(Date.parse(row.transfer.timestamp), false, clock) === "broke"
  )
    return { ...row, spin: { outcome: "broke" } };
  return row;
}
