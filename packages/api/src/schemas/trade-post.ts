import { canBeOnTrade, type ListType } from "./list";
import { flagsOf, offersSwaps, type OpenToFlags, openToOf } from "./open-to";
import type { PostType, TradePostRefusal } from "./trade";

/**
 * What a Trade post is, in one place: its kind, its tags, and what posting one writes. A post is
 * still its lists (`discoverable`, the link, a want list's Open to), so every rule here reads
 * and writes those columns. The server validates `trade.savePost` with `planPost`, and the web
 * composer draws its rows and prompts from the same functions.
 */

export type PostTag = Exclude<PostType, "all">;

export const POST_KINDS = ["swap", "sell", "buy"] as const;
export type PostKind = (typeof POST_KINDS)[number];

type PostSides = {
  have: unknown;
  want: OpenToFlags | null;
  /** the sale list, or any truthy stand-in; an object with `takesSwaps: true` takes swaps */
  sale: unknown;
};

const saleTakesSwaps = (sale: unknown) =>
  typeof sale === "object" && sale !== null && "takesSwaps" in sale && sale.takesSwaps === true;

/**
 * WTT for a have list, a want list open to swaps or a sale list that takes swaps, WTB for a want
 * side open to buying, WTS for a sale list. WTT before WTB, and a sale post leads with WTS.
 */
export function tagsOf(post: PostSides): PostTag[] {
  const openTo = post.want ? openToOf(post.want) : null;
  if (post.sale) {
    const tags: PostTag[] = ["wts"];
    if (saleTakesSwaps(post.sale)) tags.push("wtt");
    if (openTo !== null && openTo !== "swaps") tags.push("wtb");
    return tags;
  }
  const tags: PostTag[] = [];
  if (post.have || (openTo !== null && openTo !== "buying")) tags.push("wtt");
  if (openTo !== null && openTo !== "swaps") tags.push("wtb");
  return tags;
}

/**
 * An existing post read as the composer's choice. A pair whose want list is Buying only, saved
 * before a pair had to take swaps, reads as Swap that would also pay.
 */
export function postKindOf(post: PostSides): {
  kind: PostKind;
  alsoPay: boolean;
  alsoSwap: boolean;
} {
  const openTo = post.want ? openToOf(post.want) : null;
  if (post.sale) {
    return {
      kind: "sell",
      alsoPay: openTo !== null && openTo !== "swaps",
      alsoSwap: saleTakesSwaps(post.sale),
    };
  }
  if (!post.have && openTo === "buying") return { kind: "buy", alsoPay: false, alsoSwap: false };
  return { kind: "swap", alsoPay: openTo !== null && openTo !== "swaps", alsoSwap: false };
}

type Picked = { have: boolean; want: boolean; sale: boolean };

export type ComposerWrites =
  | { ok: false; reason: Extract<TradePostRefusal, "trade_post_empty" | "trade_post_wrong_type"> }
  | {
      ok: true;
      wantFlags: OpenToFlags | null;
      link: boolean;
      /** a Sell post's `takes_swaps`; null on the other kinds */
      saleSwaps: boolean | null;
    };

type ComposerChoice = Picked & { kind: PostKind; alsoPay?: boolean; alsoSwap?: boolean };

/** Which lists a kind takes, and the Open to its want or sale list saves. */
export function composerWrites(choice: ComposerChoice) {
  const { kind, have, want, sale } = choice;
  const refuse = (reason: "trade_post_empty" | "trade_post_wrong_type"): ComposerWrites => ({
    ok: false,
    reason,
  });
  switch (kind) {
    case "swap":
      if (sale) return refuse("trade_post_wrong_type");
      if (!have && !want) return refuse("trade_post_empty");
      return {
        ok: true,
        wantFlags: want ? flagsOf(choice.alsoPay ? "both" : "swaps") : null,
        link: have && want,
        saleSwaps: null,
      } satisfies ComposerWrites;
    case "sell": {
      const alsoSwap = choice.alsoSwap ?? false;
      // a want list says what the seller would swap for, so it needs the swaps
      if (have || (want && !alsoSwap)) return refuse("trade_post_wrong_type");
      if (!sale) return refuse("trade_post_empty");
      return {
        ok: true,
        wantFlags: want ? flagsOf(choice.alsoPay ? "both" : "swaps") : null,
        link: want,
        saleSwaps: alsoSwap,
      } satisfies ComposerWrites;
    }
    case "buy":
      if (have || sale) return refuse("trade_post_wrong_type");
      if (!want) return refuse("trade_post_empty");
      return {
        ok: true,
        wantFlags: flagsOf("buying"),
        link: false,
        saleSwaps: null,
      } satisfies ComposerWrites;
  }
}

/** The tags a composer choice would carry, before it is posted. */
export function choiceTags(choice: ComposerChoice): PostTag[] {
  const writes = composerWrites(choice);
  if (!writes.ok) return [];
  return tagsOf({
    have: choice.have,
    want: writes.wantFlags,
    sale: choice.sale ? { takesSwaps: writes.saleSwaps } : null,
  });
}

type ListRef = {
  id: number;
  listType: ListType;
  linkedListId: number | null;
  takesSwaps?: boolean | null;
};

export type PostGroup<L> = { anchor: L; have: L | null; want: L | null; sale: L | null };

/**
 * One post per list in `lists`, except that a list offering swaps (a have list, or a sale list
 * that takes swaps) and the want list it links to form one post when both are in `lists`. Pass
 * only lists on Trade.
 */
export function groupPosts<L extends ListRef & { userId?: string }>(lists: L[]): PostGroup<L>[] {
  const byId = new Map(lists.map((list) => [list.id, list]));
  const partnerOf = (list: L) => {
    if (!offersSwaps(list) || list.linkedListId === null) return null;
    const partner = byId.get(list.linkedListId);
    return partner?.listType === "want" && partner.userId === list.userId ? partner : null;
  };
  const absorbed = new Set(lists.flatMap((list) => partnerOf(list)?.id ?? []));

  return lists
    .filter((list) => !absorbed.has(list.id) && ["have", "want", "sale"].includes(list.listType))
    .map((anchor) => ({
      anchor,
      have: anchor.listType === "have" ? anchor : null,
      want: anchor.listType === "want" ? anchor : partnerOf(anchor),
      sale: anchor.listType === "sale" ? anchor : null,
    }));
}

/** A list of the poster's own, as the composer and `trade.savePost` read it. */
export type PlanList = OpenToFlags &
  ListRef & {
    takesSwaps: boolean;
    slug: string;
    name: string;
    discoverable: boolean;
    isProfileBind: boolean;
  };

export const membersOf = <L>(post: PostGroup<L>) =>
  [post.have, post.want, post.sale].filter((list): list is NonNullable<L> => list !== null);

const isOnTrade = (list: PlanList) =>
  list.discoverable && canBeOnTrade(list.listType, list.isProfileBind);

/** The poster's posts on Trade, each list in one. */
export function postsOf(lists: PlanList[]) {
  return groupPosts(lists.filter(isOnTrade));
}

/** The other half of a pair: a want list and the have or sale list it links to. */
export function partnerOf(lists: PlanList[], list: PlanList): PlanList | null {
  if (list.linkedListId === null || list.listType === "general") return null;
  const others: ListType[] = list.listType === "want" ? ["have", "sale"] : ["want"];
  return lists.find((x) => x.id === list.linkedListId && others.includes(x.listType)) ?? null;
}

export function postHolding(posts: PostGroup<PlanList>[], id: number) {
  return posts.find((post) => membersOf(post).some((list) => list.id === id)) ?? null;
}

export type PostChoice = {
  kind: PostKind;
  have?: string | null;
  want?: string | null;
  sale?: string | null;
  alsoPay?: boolean;
  /** Sell: whether the sale list takes swaps */
  alsoSwap?: boolean;
  unpair?: boolean;
  /** the post being edited, by its anchor list's slug */
  replaces?: string | null;
};

export type PostPlan =
  | {
      ok: false;
      reason: TradePostRefusal | "not_found";
      /** the list the refusal is about */
      slug?: string;
      /** its partner, for `trade_post_list_paired` */
      partner?: string;
    }
  | {
      ok: true;
      /** lists to put or keep on Trade, a want list with the Open to it saves */
      on: { id: number; flags: OpenToFlags | null }[];
      /** a Sell post's sale list and whether it takes swaps */
      saleSwaps: { id: number; takesSwaps: boolean } | null;
      /** lists the edit drops from the post, which leave Trade */
      off: number[];
      /** a pair to link, the have or sale list first */
      link: [number, number] | null;
      /** lists whose link to their partner is cleared, both halves listed */
      unlink: number[];
    };

const SLOTS = ["have", "want", "sale"] as const;

/**
 * What `trade.savePost` writes for a choice over the poster's lists, or why it refuses. A list is
 * in one post at a time. A Swap post with one list keeps that list's pair, its partner staying
 * where it is; any other choice that would split a pair needs `unpair`, except that a list the
 * edit drops from the post is unlinked from the half that stays.
 */
export function planPost(lists: PlanList[], choice: PostChoice): PostPlan {
  const bySlug = new Map(lists.map((list) => [list.slug, list]));
  const picked: { slot: (typeof SLOTS)[number]; list: PlanList }[] = [];
  for (const slot of SLOTS) {
    const slug = choice[slot];
    if (!slug) continue;
    const list = bySlug.get(slug);
    if (!list) return { ok: false, reason: "not_found", slug };
    picked.push({ slot, list });
  }

  const saleList = choice.sale ? bySlug.get(choice.sale) : undefined;
  const alsoSwap = choice.alsoSwap ?? false;
  const writes = composerWrites({
    kind: choice.kind,
    alsoPay: choice.alsoPay,
    alsoSwap,
    have: Boolean(choice.have),
    want: Boolean(choice.want),
    sale: Boolean(choice.sale),
  });
  if (!writes.ok) return writes;

  for (const { slot, list } of picked) {
    if (list.listType !== slot) {
      return { ok: false, reason: "trade_post_wrong_type", slug: list.slug };
    }
    if (!canBeOnTrade(list.listType, list.isProfileBind)) {
      return { ok: false, reason: "trade_post_needs_profile", slug: list.slug };
    }
  }

  const posts = postsOf(lists);
  const old = choice.replaces
    ? (posts.find((post) => post.anchor.slug === choice.replaces) ?? null)
    : null;
  const pickedIds = new Set(picked.map(({ list }) => list.id));
  const dropped = old ? membersOf(old).filter((list) => !pickedIds.has(list.id)) : [];
  const inOther = (list: PlanList) => {
    const post = postHolding(posts, list.id);
    return post !== null && post !== old ? post : null;
  };

  for (const { list } of picked) {
    if (inOther(list)) return { ok: false, reason: "trade_post_list_in_post", slug: list.slug };
  }

  const unlink: number[] = [];
  for (const { slot, list } of picked) {
    const partner = partnerOf(lists, list);
    if (!partner || pickedIds.has(partner.id)) continue;
    if (dropped.some((d) => d.id === partner.id)) {
      unlink.push(list.id, partner.id);
      continue;
    }
    const otherSlot = slot === "want" ? (choice.have ?? choice.sale) : choice.want;
    // a post that keeps a pair: a Swap, or a Sell that takes swaps, with one half picked
    const keepsPair = choice.kind === "swap" || (choice.kind === "sell" && alsoSwap);
    if (keepsPair && !otherSlot) {
      // both halves on Trade make one post, so a partner in another post would absorb this list
      if (inOther(partner)) {
        return { ok: false, reason: "trade_post_list_in_post", slug: partner.slug };
      }
      continue;
    }
    if (!choice.unpair) {
      return {
        ok: false,
        reason: "trade_post_list_paired",
        slug: list.slug,
        partner: partner.slug,
      };
    }
    unlink.push(list.id, partner.id);
  }

  const offer =
    picked.find(({ slot }) => slot === "have")?.list ??
    picked.find(({ slot }) => slot === "sale")?.list;
  const want = picked.find(({ slot }) => slot === "want")?.list;
  return {
    ok: true,
    on: picked.map(({ list }) => ({
      id: list.id,
      flags: list.listType === "want" ? writes.wantFlags : null,
    })),
    saleSwaps:
      saleList && writes.saleSwaps !== null
        ? { id: saleList.id, takesSwaps: writes.saleSwaps }
        : null,
    off: dropped.map((list) => list.id),
    link: writes.link && offer && want ? [offer.id, want.id] : null,
    unlink,
  };
}

export type RowBlock =
  | { reason: "needs_profile" }
  | { reason: "in_post"; kind: PostKind; slug: string };

/**
 * Why the composer can't take a list for this kind of post: it isn't bound, or it is in another
 * post. On a Swap post with the other side still empty, the list brings its partner along, so a
 * partner in another post blocks it too, as `planPost` refuses; with the other side picked, the
 * pair is split by unpairing instead.
 */
export function rowBlock(
  lists: PlanList[],
  list: PlanList,
  kind: PostKind,
  replaces: string | null,
  otherPicked = false,
): RowBlock | null {
  if (!canBeOnTrade(list.listType, list.isProfileBind)) return { reason: "needs_profile" };
  const posts = postsOf(lists);
  const blocking = (id: number) => {
    const post = postHolding(posts, id);
    return post && post.anchor.slug !== replaces ? post : null;
  };
  const partner = kind !== "buy" && !otherPicked ? partnerOf(lists, list) : null;
  const post = blocking(list.id) ?? (partner ? blocking(partner.id) : null);
  if (!post) return null;
  return { reason: "in_post", kind: postKindOf(post).kind, slug: post.anchor.slug };
}

export type ComposerStart = {
  kind: PostKind | null;
  have: string | null;
  want: string | null;
  sale: string | null;
  alsoPay: boolean;
  alsoSwap: boolean;
  replaces: string | null;
};

const EMPTY_START: ComposerStart = {
  kind: null,
  have: null,
  want: null,
  sale: null,
  alsoPay: false,
  alsoSwap: false,
  replaces: null,
};

function editStart(post: PostGroup<PlanList>, extra?: PlanList): ComposerStart {
  const { kind, alsoPay, alsoSwap } = postKindOf(post);
  // a sale list in the post, or the one being added, makes it a Sell that takes swaps
  const selling = post.sale !== null || extra?.listType === "sale";
  const slot = (type: "have" | "want" | "sale") =>
    post[type]?.slug ?? (extra?.listType === type ? extra.slug : null);
  return {
    // an added list joins a pair with a sale list as a Sell, any other as a Swap
    kind: extra ? (selling ? "sell" : "swap") : kind,
    have: slot("have"),
    want: slot("want"),
    sale: slot("sale"),
    // a have or sale list posted alone has no want side to read; the added want list keeps its own Open to
    alsoPay: extra?.listType === "want" ? openToOf(extra) !== "swaps" : alsoPay,
    alsoSwap: extra && selling ? true : alsoSwap,
    replaces: post.anchor.slug,
  };
}

/** Where the composer opens for one post: on its kind and lists. */
export function startForPost(lists: PlanList[], anchorSlug: string): ComposerStart {
  const post = postsOf(lists).find((p) => p.anchor.slug === anchorSlug);
  return post ? editStart(post) : EMPTY_START;
}

/**
 * Where the composer opens from a list's Edit post or Post it: the post holding it, or the post
 * holding its partner with the list added, or a new Swap post with its pair. A have list alone
 * can only swap; a want list alone starts on the kind step with it picked.
 */
export function startForList(lists: PlanList[], slug: string): ComposerStart {
  const list = lists.find((x) => x.slug === slug);
  if (!list) return EMPTY_START;
  const posts = postsOf(lists);
  const own = postHolding(posts, list.id);
  if (own) return editStart(own);
  const partner = partnerOf(lists, list);
  const partnerPost = partner ? postHolding(posts, partner.id) : null;
  if (partnerPost) return editStart(partnerPost, list);
  if (partner) {
    const [offer, want] = list.listType === "want" ? [partner, list] : [list, partner];
    if (offer.listType === "sale") {
      return {
        ...EMPTY_START,
        kind: "sell",
        sale: offer.slug,
        want: want.slug,
        alsoPay: openToOf(want) !== "swaps",
        alsoSwap: true,
      };
    }
    return {
      ...EMPTY_START,
      kind: "swap",
      have: offer.slug,
      want: want.slug,
      alsoPay: openToOf(want) !== "swaps",
    };
  }
  switch (list.listType) {
    case "have":
      return { ...EMPTY_START, kind: "swap", have: list.slug };
    case "sale":
      return { ...EMPTY_START, kind: "sell", sale: list.slug, alsoSwap: list.takesSwaps };
    case "want":
      return { ...EMPTY_START, want: list.slug, alsoPay: openToOf(list) === "both" };
    default:
      return EMPTY_START;
  }
}

export type TradeLine =
  | {
      state: "in_post";
      kind: PostKind;
      tags: PostTag[];
      alsoPay: boolean;
      alsoSwap: boolean;
      partner: PlanList | null;
    }
  | { state: "paired_off"; partner: PlanList }
  | { state: "needs_profile" }
  | { state: "off" };

/** What a list's form says about Trade: its post, or that it is off Trade and why. */
export function tradeLineOf(lists: PlanList[], list: PlanList): TradeLine {
  const post = postHolding(postsOf(lists), list.id);
  if (post) {
    const { kind, alsoPay, alsoSwap } = postKindOf(post);
    const partner =
      membersOf(post).find((member) => member.id !== list.id) ?? partnerOf(lists, list);
    return { state: "in_post", kind, tags: tagsOf(post), alsoPay, alsoSwap, partner };
  }
  if (!canBeOnTrade(list.listType, list.isProfileBind)) return { state: "needs_profile" };
  const partner = partnerOf(lists, list);
  return partner ? { state: "paired_off", partner } : { state: "off" };
}
