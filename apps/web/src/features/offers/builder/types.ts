import type { TopupPayer } from "@repo/api/schemas/offer";

import type { NearGroup } from "@/features/offers/near-picks";
import type { Collections, OfferPick } from "@/features/offers/pick";
import type { OfferAddress } from "@/features/offers/queries";

type TopupDraft = { amount: number; currency: string; payer: TopupPayer };

export type OfferPrefill = {
  give?: OfferPick[];
  get?: OfferPick[];
  topup?: TopupDraft;
  note?: string;
  collections?: Collections;
};

/** Ask for the swap matches with the partner, as their Trade row counts them, or one post's. */
export type OfferMatches = { partnerId: string; list?: string; mutual?: boolean; post?: string };

/** What the matches added when the builder opened, fixed from then on. */
export type AddedMatches = {
  keys: { give: string[]; get: string[] };
  /** the matches before the side limit, so the line can say what didn't fit */
  matched: { give: number; get: number };
  /** the post's own list, when the matches are one post's */
  postName: string | null;
  /** near matches still waiting on their lines, never added on their own */
  near: NearGroup[];
  /** near picks added at open, by Make offer with it: Remove matches takes them out too */
  nearKeys: { give: string[]; get: string[] };
  /** a near sale or buy added at open, whose top-up opens with its payer set */
  nearTopup?: Pick<NearGroup, "verb" | "picks">;
};

export type OfferRequest = {
  to: OfferAddress;
  /** the partner, as the title names them */
  name: string;
  counter?: boolean;
  prefill?: OfferPrefill;
  /** a list of theirs You get's List choice opens on, as a Market listing's sale list */
  startList?: string;
  /** read the matches before the sides show, and add them */
  matches?: OfferMatches;
  /** Make offer with it: this collection's near match is added at open, beside the matches */
  addNear?: string;
};
