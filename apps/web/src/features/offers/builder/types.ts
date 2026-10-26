import type { TopupPayer } from "@repo/api/schemas/offer";

import type { Collections, OfferPick } from "@/features/offers/pick";
import type { OfferAddress } from "@/features/offers/queries";

type TopupDraft = { amount: number; currency: string; payer: TopupPayer };

type OfferPrefill = {
  give?: OfferPick[];
  get?: OfferPick[];
  topup?: TopupDraft;
  note?: string;
  collections?: Collections;
};

export type OfferRequest = {
  to: OfferAddress;
  /** the partner, as the title names them */
  name: string;
  counter?: boolean;
  prefill?: OfferPrefill;
  /** a list of theirs You get's List choice opens on, as a Market listing's sale list */
  startList?: string;
};
