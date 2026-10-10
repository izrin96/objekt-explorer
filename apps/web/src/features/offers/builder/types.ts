import type { TopupPayer } from "@repo/api/schemas/offer";

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

export type OfferRequest = {
  to: OfferAddress;
  /** the partner, as the title names them */
  name: string;
  counter?: boolean;
  prefill?: OfferPrefill;
  /** prefills with the For you overlap with this partner, read through `offer.suggest` */
  suggestFor?: string;
  /** a list of theirs whose entries are laid out under You get, ready to add */
  focusList?: string;
  /** a want list of theirs: what the viewer holds from it is laid out under You give */
  focusWantList?: string;
};
