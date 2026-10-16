import { m } from "@/paraglide/messages";

import type { OfferSide } from "./pick";

/** Where You get draws from: the partner's lists, or their collection when they have none. */
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

export const addLabel = (side: OfferSide, source: GetSource, name: string) =>
  side === "give" ? m.offer_add_mine() : THEIR_TEXT[source].add(name);

export const pickerDescription = (side: OfferSide, source: GetSource, name: string) =>
  side === "give" ? m.offer_picker_mine_desc() : THEIR_TEXT[source].desc(name);
