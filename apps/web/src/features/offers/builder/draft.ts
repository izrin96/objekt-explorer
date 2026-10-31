import {
  type CandidateItem,
  type CreateOfferInput,
  OFFER_NOTE_MAX_LENGTH,
  OFFER_SIDE_LIMIT,
  TOPUP_MAX,
  type TopupPayer,
} from "@repo/api/schemas/offer";
import type { NearVerb } from "@repo/api/schemas/trade";

import type { OfferAddress } from "@/features/offers/queries";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { GetSource } from "../get-source";
import { nearPayer } from "../near-picks";
import { blockedReason, type OfferPick, type OfferSide, toPick } from "../pick";
import { copiesLeft, countOf, totalOf } from "../quantity";
import type { AddedMatches, OfferPrefill } from "./types";

type Draft = {
  /** the side as shown: an ask already resolved into the copies it stands for */
  give: readonly OfferPick[];
  get: readonly OfferPick[];
  topup: { on: boolean; amount: number | null; currency: string; payer: TopupPayer };
  note: string;
};

export type TopupValue = Draft["topup"];

type NearTopup = NonNullable<AddedMatches["nearTopup"]>;

/**
 * The form's top-up. The currency is only a held choice: `null` follows the preferred one, which
 * reads "USD" until the rates load. `near` is set only while `on`; every transition keeps that,
 * and Remove matches relies on it.
 */
export type TopupState = {
  on: boolean;
  amount: number | null;
  chosenCurrency: string | null;
  payer: TopupPayer;
  /** the amount's error waits for a first edit, a blur or a send attempt */
  touched: boolean;
  /** a near sale or buy that opened the top-up with its payer, and no amount */
  near: NearTopup | null;
};

export function initialTopup(
  prefill: OfferPrefill["topup"],
  near: NearTopup | undefined,
): TopupState {
  const nearNow = near ?? null;
  return {
    on: prefill !== undefined || nearNow !== null,
    amount: prefill?.amount ?? null,
    chosenCurrency: prefill?.currency ?? null,
    payer: prefill?.payer ?? (nearNow ? nearPayer(nearNow.verb) : null) ?? "from",
    touched: false,
    near: nearNow,
  };
}

export function topupValue(t: TopupState, preferred: string): TopupValue {
  return {
    on: t.on,
    amount: t.amount,
    currency: t.chosenCurrency ?? preferred,
    payer: t.payer,
  };
}

/** Adding a near sale or buy opens a closed top-up with its payer, and no amount. */
export function topupForNear(t: TopupState, verb: NearVerb, fresh: OfferPick[]): TopupState {
  const preset = nearPayer(verb);
  if (!preset || t.on || fresh.length === 0) return t;
  return {
    ...t,
    on: true,
    payer: preset,
    amount: null,
    touched: false,
    near: { verb, picks: fresh },
  };
}

/** Remove matches takes a top-up the near picks opened, still with no amount, with them. */
export function topupWithoutNear(t: TopupState): { topup: TopupState; taken: NearTopup | null } {
  if (t.near === null || t.amount !== null) return { topup: t, taken: null };
  return { topup: { ...t, on: false, near: null }, taken: t.near };
}

/** Undo puts the taken top-up back unless the sender has opened one since. */
export function topupRestored(t: TopupState, near: NearTopup | null): TopupState {
  if (!near || t.on) return t;
  return { ...t, on: true, payer: nearPayer(near.verb) ?? t.payer, near };
}

export function toggleTopup(t: TopupState, on: boolean): TopupState {
  return { ...t, on, touched: false, near: on ? t.near : null };
}

export function touchTopup(t: TopupState): TopupState {
  return t.touched ? t : { ...t, touched: true };
}

/** The request that sends the draft to `to`. */
export function offerInput(to: OfferAddress, d: Draft): CreateOfferInput {
  return {
    ...to,
    give: d.give.flatMap((pick) =>
      pick.objektId ? [{ collectionSlug: pick.collectionSlug, objektId: pick.objektId }] : [],
    ),
    // an any-copy pick of several copies asks for each one
    get: d.get.flatMap((pick) =>
      Array.from({ length: countOf(pick) }, () => ({
        collectionSlug: pick.collectionSlug,
        objektId: pick.objektId ?? undefined,
        listSlug: pick.listSlug ?? undefined,
      })),
    ),
    topup:
      d.topup.on && d.topup.amount !== null
        ? { amount: d.topup.amount, currency: d.topup.currency, payer: d.topup.payer }
        : undefined,
    note: d.note.trim() === "" ? undefined : d.note,
  };
}

const sameKeys = (picks: readonly OfferPick[], from: readonly OfferPick[] = []) =>
  picks.length === from.length &&
  picks.every((pick, i) => pick.key === from[i]?.key && countOf(pick) === countOf(from[i]!));

/**
 * What closing would lose: changes to the prefill. An open top-up with no amount holds nothing,
 * and an empty builder holds nothing even when the matches had filled it. The picks are the ones
 * as picked, before an ask resolves into copies.
 */
export function holdsDraft(d: Draft, prefill: OfferPrefill | undefined): boolean {
  const empty = d.give.length + d.get.length === 0;
  const topupHeld = d.topup.on && d.topup.amount !== null;
  if (empty && !topupHeld && d.note.trim() === "") return false;
  return (
    !sameKeys(d.give, prefill?.give) ||
    !sameKeys(d.get, prefill?.get) ||
    (topupHeld &&
      (d.topup.amount !== prefill?.topup?.amount ||
        d.topup.currency !== prefill.topup.currency ||
        d.topup.payer !== prefill.topup.payer)) ||
    d.note.trim() !== (prefill?.note ?? "").trim()
  );
}

/** The viewer's candidates for one ask: what `myCopyOptions` returns. */
type Page = { suggested?: readonly CandidateItem[]; items?: readonly CandidateItem[] };

/** A counter's any-copy asks, in the order their pages are fetched. */
export const asksOf = (give: readonly OfferPick[]) => give.filter((pick) => pick.objektId === null);

/**
 * The give side as shown: each any-copy ask takes free copies of the viewer's own, `pages[i]`
 * being the candidates for `asksOf(give)[i]`. A copy goes to one ask only, and never when the side
 * names it by serial. An ask for several copies keeps what it couldn't fill, still waiting.
 */
export function resolveAsks(
  give: readonly OfferPick[],
  pages: readonly (Page | undefined)[],
): OfferPick[] {
  const taken = new Set(give.flatMap((pick) => (pick.objektId ? [pick.objektId] : [])));
  const resolved = new Map<string, OfferPick[]>();
  for (const [i, ask] of asksOf(give).entries()) {
    const page = pages[i];
    const found: OfferPick[] = [];
    for (const copy of [...(page?.suggested ?? []), ...(page?.items ?? [])]) {
      if (found.length >= countOf(ask)) break;
      if (
        copy.collectionSlug !== ask.collectionSlug ||
        copy.objektId === null ||
        taken.has(copy.objektId) ||
        blockedReason(copy) !== null
      ) {
        continue;
      }
      taken.add(copy.objektId);
      found.push({ ...toPick(copy), replaces: ask.key });
    }
    if (found.length > 0) resolved.set(ask.key, found);
  }
  return give.flatMap((pick) => {
    const found = resolved.get(pick.key);
    if (!found) return [pick];
    const left = countOf(pick) - found.length;
    return left > 0 ? [...found, { ...pick, count: left }] : found;
  });
}

type Live = ReadonlyMap<string, CandidateItem>;

/** The pick's own flags, else their lists' live ones. */
export function pickFlags(pick: OfferPick, live: Live) {
  const found = live.get(pick.key);
  return pick.flags ?? (found ? toPick(found).flags : null);
}

export const pickEstimated = (pick: OfferPick, live: Live) =>
  pick.serialEstimated ?? live.get(pick.key)?.serialEstimated ?? false;

/** Why a pick can't go in the offer, or null. `get` is the side's picks, for the copies they name. */
export function pickProblem(
  side: OfferSide,
  pick: OfferPick,
  ctx: {
    get: readonly OfferPick[];
    live: Live;
    loaded: boolean;
    source: GetSource | undefined;
    nameOf: (pick: OfferPick) => string;
  },
): string | null {
  if (side === "give" && pick.objektId === null) {
    return m.offer_flag_pick_copy({ name: ctx.nameOf(pick) });
  }
  // only what their lists offer can be asked for, bar what the countered offer gave; with no
  // lists, the collection picker's picks are checked when the offer is sent
  if (
    side === "get" &&
    ctx.loaded &&
    ctx.source !== "collection" &&
    !pick.kept &&
    !ctx.live.has(pick.key)
  ) {
    return m.offer_flag_not_listed();
  }
  // the copies they spare now, which may have dropped since the count was set, less those
  // this offer also asks for by serial
  const spare = ctx.live.get(pick.key)?.copies ?? pick.flags?.copies;
  if (side === "get" && pick.objektId === null && spare != null) {
    const left = copiesLeft(ctx.get, pick.collectionSlug, spare);
    if (countOf(pick) > left) return m.offer_flag_too_many({ count: left });
  }
  return blockedReason(pickFlags(pick, ctx.live));
}

/**
 * Whether the draft may be sent, and what the footer and the Send button say about it. `give` is
 * the side as shown; a top-up error leaves Send clickable (`ariaDisabled`) so a send attempt shows
 * it at the field, while any other failure disables it.
 */
export function sendGate(d: {
  give: readonly OfferPick[];
  get: readonly OfferPick[];
  blocked: boolean;
  topup: { on: boolean; amount: number | null; currency: string };
  note: string;
}) {
  const noteLength = Array.from(d.note.trim()).length;
  const noteTooLong = noteLength > OFFER_NOTE_MAX_LENGTH;
  const empty = d.give.length + d.get.length === 0;
  const overLimit = totalOf(d.give) > OFFER_SIDE_LIMIT || totalOf(d.get) > OFFER_SIDE_LIMIT;
  const { on, amount, currency } = d.topup;
  const topupError = !on
    ? null
    : amount === null || amount <= 0
      ? m.offer_topup_amount_required()
      : amount > TOPUP_MAX
        ? m.offer_topup_amount_max({ max: TOPUP_MAX.toLocaleString(getLocale()) })
        : null;
  const noCurrency = on && currency === "" && topupError === null;
  const hint = empty
    ? m.offer_builder_empty_hint()
    : overLimit
      ? m.offer_refused_too_many({ max: OFFER_SIDE_LIMIT })
      : d.blocked
        ? m.offer_builder_blocked_hint()
        : topupError
          ? topupError
          : m.offer_builder_expiry();
  return {
    noteLength,
    noteTooLong,
    topupError,
    hint,
    canSend:
      !empty && !d.blocked && !overLimit && topupError === null && !noCurrency && !noteTooLong,
    disabled: empty || d.blocked || overLimit || noCurrency || noteTooLong,
    ariaDisabled: topupError !== null,
  };
}
