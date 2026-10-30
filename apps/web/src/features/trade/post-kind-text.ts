import {
  choiceTags,
  type PostKind,
  type PostTag,
  type RowBlock,
} from "@repo/api/schemas/trade-post";

import { m } from "@/paraglide/messages";

export type Slot = "have" | "want" | "sale";

export const KIND_LABEL: Record<PostKind, () => string> = {
  swap: m.trade_kind_swap,
  sell: m.trade_kind_sell,
  buy: m.trade_kind_buy,
};

export const KIND_DESC: Record<PostKind, () => string> = {
  swap: m.trade_kind_swap_desc,
  sell: m.trade_kind_sell_desc,
  buy: m.trade_kind_buy_desc,
};

export const KIND_TITLE: Record<PostKind, () => string> = {
  swap: m.trade_composer_swap_title,
  sell: m.trade_composer_sell_title,
  buy: m.trade_composer_buy_title,
};

export const KIND_TAG = { swap: "wtt", sell: "wts", buy: "wtb" } as const;

export const IN_POST: Record<PostKind, () => string> = {
  swap: m.trade_in_swap_post,
  sell: m.trade_in_sell_post,
  buy: m.trade_in_buy_post,
};

export const SLOT_HEADING: Record<Slot, () => string> = {
  have: m.trade_composer_have_heading,
  want: m.trade_composer_want_heading,
  sale: m.trade_composer_sale_heading,
};

function blockText(block: RowBlock) {
  return block.reason === "needs_profile"
    ? m.trade_composer_needs_profile()
    : IN_POST[block.kind]();
}

/** The note under a list row: why it can't be picked, else who it is paired with. */
export function rowNote(block: RowBlock | null, partnerName: string | null) {
  return block
    ? blockText(block)
    : partnerName !== null
      ? m.trade_paired_with({ name: partnerName })
      : null;
}

export function unpairText(kind: PostKind, name: string) {
  return kind === "buy"
    ? m.trade_composer_unpair_buy({ name })
    : kind === "sell"
      ? m.trade_composer_unpair_sell({ name })
      : m.trade_composer_unpair_swap({ name });
}

type Picks = {
  kind: PostKind;
  have: boolean;
  want: boolean;
  sale: boolean;
  alsoPay: boolean;
  alsoSwap: boolean;
};

/** The sentences the composer's preview shows. They keep the booleans: a Sell post with swaps on
 * and no sale list picked still reads its WTT line, while `choiceTags` gives no tags. */
export function matchLines({ kind, have, want, alsoPay, alsoSwap }: Picks) {
  return kind === "sell"
    ? [
        m.trade_composer_match_sell(),
        ...(alsoSwap ? [m.trade_composer_match_sell_swap()] : []),
        ...(want && alsoPay ? [m.trade_composer_match_also_pay()] : []),
      ]
    : kind === "buy"
      ? [m.trade_composer_match_buy()]
      : [
          have && want
            ? m.trade_composer_match_both()
            : have
              ? m.trade_composer_match_have()
              : want
                ? m.trade_composer_match_want()
                : m.trade_composer_pick_list(),
          ...(want && alsoPay ? [m.trade_composer_match_also_pay()] : []),
        ];
}

/** The tags the preview shows: the choice's own, or its kind's while nothing is picked. */
export function previewTags(picks: Picks): PostTag[] {
  const tags = choiceTags(picks);
  return tags.length > 0 ? tags : [KIND_TAG[picks.kind]];
}
