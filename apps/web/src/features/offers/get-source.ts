import { m } from "@/paraglide/messages";

import type { OfferSide } from "./pick";

/** Where You get draws from: the partner's lists on Trade, or their collection when they have none. */
export type GetSource = "lists" | "collection";

const THEIR_TEXT = {
  lists: {
    add: (name: string) => m.offer_add_theirs({ name }),
    desc: (name: string) => m.offer_picker_theirs_desc({ name }),
  },
  collection: {
    add: (name: string) => m.offer_add_theirs_collection({ name }),
    desc: (name: string) => m.offer_picker_theirs_collection_desc({ name }),
  },
};

export const sourceOf = (theirs: { partnerLists?: boolean }): GetSource =>
  theirs.partnerLists === false ? "collection" : "lists";

/**
 * `source` is undefined while the partner's lists load, so the label never flips from lists to
 * collection; `post` is the name of the post the offer is on, which You get asks from
 */
export const addLabel = (
  side: OfferSide,
  source: GetSource | undefined,
  name: string,
  post?: string | null,
) =>
  side === "give"
    ? m.offer_add_mine()
    : source === undefined
      ? m.offer_add_theirs_pending({ name })
      : source === "lists" && post
        ? m.offer_add_from_post({ post })
        : THEIR_TEXT[source].add(name);

export const pickerDescription = (side: OfferSide, source: GetSource, name: string) =>
  side === "give" ? m.offer_picker_mine_desc() : THEIR_TEXT[source].desc(name);
