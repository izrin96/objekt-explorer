import type { ActivityItem, ActivityParams } from "@repo/api/schemas/activity";
import { Addresses } from "@repo/lib";
import { pairSpins, type SpinEvent } from "@repo/lib/spin-pairing";

import { getEventKind, type LiveFeed } from "./live-feed";

/** A spin from the socket carries no outcome yet; until its reward is seen it is pending. */
export function withPendingSpin(item: ActivityItem): ActivityItem {
  return getEventKind(item.transfer.from, item.transfer.to) === "spin" && !item.spin
    ? { ...item, spin: { outcome: "pending" } }
    : item;
}

const asSpinEvent = (item: ActivityItem, address: string): SpinEvent => ({
  id: item.transfer.id,
  address,
  at: Date.parse(item.transfer.timestamp),
  artist: item.objekt.artist,
});

/**
 * Offer a socket batch's mints to the spins still pending in the feed, before
 * any filter runs: a Spin-only feed never lists the mint that rewards its row.
 * `loaded` is every paged row; a mint the server already paired stays its spin's.
 */
export function pairLiveRewards(
  prev: LiveFeed,
  key: ActivityParams,
  batch: ActivityItem[],
  loaded: ActivityItem[],
): LiveFeed {
  if (prev.key !== key) return prev;

  const known = [...prev.rows, ...prev.queued, ...loaded, ...batch];
  const claimed = new Set<string>();
  for (const item of known) {
    if (item.spin?.reward) claimed.add(item.spin.reward.transfer.id);
    if (item.rewardOf) claimed.add(item.transfer.id);
  }
  for (const reward of prev.rewards.values()) claimed.add(reward.transfer.id);

  const mints = new Map<string, ActivityItem>();
  for (const item of batch) {
    if (
      getEventKind(item.transfer.from, item.transfer.to) === "mint" &&
      item.transfer.to !== Addresses.SPIN &&
      !claimed.has(item.transfer.id)
    )
      mints.set(item.transfer.id, item);
  }
  if (mints.size === 0) return prev;

  // a spin can sit here twice, pending from the socket and settled in a refetched page:
  // the settled copy wins, or the pending one would take the spinner's next reward
  const settled = new Set(prev.rewards.keys());
  for (const item of known) {
    if (item.spin && item.spin.outcome !== "pending") settled.add(item.transfer.id);
  }
  const pending = new Map<string, ActivityItem>();
  for (const item of known) {
    if (
      getEventKind(item.transfer.from, item.transfer.to) === "spin" &&
      !settled.has(item.transfer.id)
    )
      pending.set(item.transfer.id, item);
  }
  if (pending.size === 0) return prev;

  const pairs = pairSpins(
    [...pending.values()].map((item) => asSpinEvent(item, item.transfer.from)),
    [...mints.values()].map((item) => asSpinEvent(item, item.transfer.to)),
  );
  if (pairs.size === 0) return prev;

  const rewards = new Map(prev.rewards);
  for (const [spinId, mintId] of pairs) {
    const mint = mints.get(mintId)!;
    rewards.set(spinId, { transfer: mint.transfer, objekt: mint.objekt });
  }
  return { ...prev, rewards };
}
