// Which of an online collection's confirmed serials anchor its post-cutoff numbering
// (online-confirmed-serials design Decision 3). No database or Cosmo access, so it can be tested
// on its own.

import { V1_CUTOFF_MS } from "@repo/lib/serial";

import type { AnchorConflict, AnchorRefusal, ConfirmedSerial } from "./cosmo-anchors";

type OnlineAnchor = { tokenId: string; serial: number };

/**
 * `rows` are every objekt of the collection, `headSkip` as `computeOnlineSerials` takes it. A
 * confirmed serial outside the post-cutoff rows is refused. When any confirmed serial is lower than
 * one at a lower token id, none anchors and each is a conflict: mint order cannot run backwards, so
 * one of the reads is wrong and the code cannot tell which. Equal serials agree, since Cosmo mints
 * one serial twice now and then.
 */
export function onlineAnchors(
  confirmed: ConfirmedSerial[],
  rows: { id: string; mintedAt: string }[],
  headSkip: boolean,
) {
  const sorted = rows.toSorted((a, b) => Number(a.id) - Number(b.id));
  const headId = headSkip ? sorted[0]?.id : undefined;
  const postCutoff = new Set(
    sorted
      .filter((r) => r.id !== headId && Date.parse(r.mintedAt) >= V1_CUTOFF_MS)
      .map((r) => r.id),
  );

  const refused: AnchorRefusal[] = [];
  const kept: { tokenId: number; objektNo: number }[] = [];
  for (const c of confirmed) {
    const tokenId = Number(c.tokenId);
    if (postCutoff.has(String(tokenId))) kept.push({ tokenId, objektNo: c.objektNo });
    else refused.push({ tokenId, objektNo: c.objektNo, reason: "not found in the collection" });
  }
  kept.sort((a, b) => a.tokenId - b.tokenId);

  let highest = 0;
  const backwards = kept.some((k) => {
    if (k.objektNo < highest) return true;
    highest = k.objektNo;
    return false;
  });
  if (backwards) {
    const conflicts: AnchorConflict[] = kept.map((k) => ({ ...k, pinnedSerial: null }));
    return { anchors: [] as OnlineAnchor[], conflicts, refused };
  }
  const anchors: OnlineAnchor[] = kept.map((k) => ({
    tokenId: String(k.tokenId),
    serial: k.objektNo,
  }));
  return { anchors, conflicts: [] as AnchorConflict[], refused };
}
