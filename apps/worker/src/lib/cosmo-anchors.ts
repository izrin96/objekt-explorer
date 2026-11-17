// The pure merge of manual anchors with the serials connected accounts confirmed (design Decision
// 5): which confirmed serials become anchors, which disagree with what already pins a batch, and
// which cannot be used. No database or Cosmo access, so it can be tested on its own.

import { V1_CUTOFF_MS } from "@repo/lib/serial";

import { checkManualAnchor, computeOfflineSerials } from "./serial-math";

export const COSMO_ANCHOR_NOTE = "Cosmo objektNo from a connected account";

export type Anchor = { tokenId: number; serial: number; note: string; addedAt: string };
export type ConfirmedSerial = { tokenId: string | number; objektNo: number; observedAt: string };
/** `pinnedSerial` is null when the conflict is with another confirmed serial of the same batch. */
export type AnchorConflict = { tokenId: number; objektNo: number; pinnedSerial: number | null };
export type AnchorRefusal = { tokenId: number; objektNo: number; reason: string };

/**
 * Whether confirmed serials of one batch agree with each other: `computeOfflineSerials` numbers a
 * batch by token id from its nearest anchor (`serial = anchor.serial + (tid - anchor.tid)`), with
 * no regard to gaps or foreign tokens inside the range, so they agree exactly when every one has
 * the same `objektNo - tokenId`.
 */
export function consistentInBatch(confirmed: { tokenId: number; objektNo: number }[]) {
  return new Set(confirmed.map((c) => c.objektNo - c.tokenId)).size <= 1;
}

/**
 * `confirmed` are one collection's confirmed serials, `rows` every objekt of it. Walked in token
 * order, a confirmed serial is kept only where nothing else pins its batch: a manual anchor or a v1
 * serial always wins, and a disagreement is a conflict, never resolved here. Several confirmed
 * serials in one unpinned batch all stay while they agree with each other; when any two disagree,
 * none of that batch's stays and each is a conflict. `anchors` is every manual anchor unchanged,
 * then the kept.
 */
export function mergeAnchors(input: {
  manual: Anchor[];
  confirmed: ConfirmedSerial[];
  rows: { id: string; serial: number; mintedAt: string }[];
  batches: { start: number; end: number }[];
}) {
  const { manual, rows, batches } = input;
  const conflicts: AnchorConflict[] = [];
  const refused: AnchorRefusal[] = [];
  const kept: Anchor[] = [];
  const confirmed = input.confirmed
    .map((c) => ({ tokenId: Number(c.tokenId), objektNo: c.objektNo, observedAt: c.observedAt }))
    .sort((a, b) => a.tokenId - b.tokenId);

  // per batch, the serials its manual and v1 anchors give each row; null when nothing pins it
  const pinned = new Map<number, Map<string, number> | null>();
  const pinOf = (bi: number) => {
    if (pinned.has(bi)) return pinned.get(bi)!;
    const batch = batches[bi]!;
    const inBatch = rows.filter((o) => {
      const tid = Number.parseInt(o.id);
      return tid >= batch.start && tid <= batch.end;
    });
    const hasV1 = inBatch.some((o) => o.serial > 0 && Date.parse(o.mintedAt) < V1_CUTOFF_MS);
    const hasManual = manual.some((a) => a.tokenId >= batch.start && a.tokenId <= batch.end);
    const serials =
      hasV1 || hasManual
        ? new Map(
            computeOfflineSerials(inBatch, [batch], V1_CUTOFF_MS, manual).map(
              (c) => [c.id, c.serial] as const,
            ),
          )
        : null;
    pinned.set(bi, serials);
    return serials;
  };

  // the confirmed serials that would pin an unpinned batch, by batch
  const candidates: { c: (typeof confirmed)[number]; bi: number }[] = [];
  for (const c of confirmed) {
    const onToken = manual.find((a) => a.tokenId === c.tokenId);
    if (onToken) {
      if (onToken.serial !== c.objektNo) {
        conflicts.push({ tokenId: c.tokenId, objektNo: c.objektNo, pinnedSerial: onToken.serial });
      }
      continue;
    }
    const bi = batches.findIndex((b) => c.tokenId >= b.start && c.tokenId <= b.end);
    if (bi === -1) {
      refused.push({
        tokenId: c.tokenId,
        objektNo: c.objektNo,
        reason: "outside every stored batch",
      });
      continue;
    }
    const batchPin = pinOf(bi);
    const own = rows.find((o) => Number.parseInt(o.id) === c.tokenId);
    if (batchPin && own) {
      const pinnedSerial = batchPin.get(own.id);
      if (pinnedSerial === undefined) {
        refused.push({
          tokenId: c.tokenId,
          objektNo: c.objektNo,
          reason: "its pinned batch gives it no serial",
        });
      } else if (pinnedSerial !== c.objektNo) {
        conflicts.push({ tokenId: c.tokenId, objektNo: c.objektNo, pinnedSerial });
      }
      continue;
    }
    candidates.push({ c, bi });
  }

  // a candidate whose token is not among the rows is refused below, so it never disagrees
  const present = new Set(rows.map((o) => Number.parseInt(o.id)));
  const inconsistent = new Set<number>();
  for (const bi of new Set(candidates.map((x) => x.bi))) {
    const inBatch = candidates.filter((x) => x.bi === bi && present.has(x.c.tokenId));
    if (!consistentInBatch(inBatch.map((x) => x.c))) inconsistent.add(bi);
  }

  for (const { c, bi } of candidates) {
    if (inconsistent.has(bi) && present.has(c.tokenId)) {
      conflicts.push({ tokenId: c.tokenId, objektNo: c.objektNo, pinnedSerial: null });
      continue;
    }
    const anchor = { tokenId: c.tokenId, serial: c.objektNo };
    const reason = checkManualAnchor(rows, batches, anchor, [...manual, ...kept]);
    if (reason) {
      refused.push({ tokenId: c.tokenId, objektNo: c.objektNo, reason });
      continue;
    }
    kept.push({ ...anchor, note: COSMO_ANCHOR_NOTE, addedAt: c.observedAt });
  }

  return { anchors: kept.length === 0 ? manual : [...manual, ...kept], conflicts, refused };
}
