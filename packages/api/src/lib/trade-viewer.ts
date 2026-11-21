import { pickByOpenTo } from "../schemas/open-to";
import type { BrowseMatchMode, NearVerb, PickerTag } from "../schemas/trade";
import type { FeedEntry, ListState } from "./trade-posts";

/** A collection slug to the viewer's lists that have it on. */
export type SlugIndex = ReadonlyMap<string, readonly number[]>;

/** The collections the sides' indexes hold between them, and the viewer's lists they are on. */
export function matchCollections(sides: { entries: { slug: string }[]; index: SlugIndex }[]) {
  const slugs = new Set<string>();
  const listIds = new Set<number>();
  for (const { entries, index } of sides) {
    for (const entry of entries) {
      const ids = index.get(entry.slug);
      if (!ids) continue;
      slugs.add(entry.slug);
      for (const id of ids) listIds.add(id);
    }
  }
  return { count: slugs.size, slugs: [...slugs], listIds: [...listIds] };
}

/** Whether a post's match line shows anything, so Only matches keeps it. */
export function matchesViewer(match: { youHave: number; youWant: number } | undefined) {
  return !!match && (match.youHave > 0 || match.youWant > 0);
}

/**
 * The viewer's have and sale lists (still-owned entries only) and want lists, by collection.
 * A have list matches a want list only when the want list takes swaps, and a sale list only
 * when it takes buying. So `tradeHave` drops the sale lists, `saleHave` keeps only them,
 * `tradeWant` drops the want lists that match buying only, and `saleWant` the want lists that
 * match swaps only.
 */
export type Viewer = {
  have: SlugIndex;
  want: SlugIndex;
  tradeHave: SlugIndex;
  saleHave: SlugIndex;
  tradeWant: SlugIndex;
  saleWant: SlugIndex;
  /** the collections the viewer wants only through a rule, none by hand: the rule and its list */
  ruleWant?: ReadonlyMap<string, readonly RuleWant[]>;
  /** every rule match, wanted by hand too, so a narrowed viewer can work `ruleWant` out again */
  ruleRows?: ReadonlyMap<string, readonly RuleWant[]>;
  /** the collections wanted by hand, by the lists that hold them */
  handWant?: SlugIndex;
};

/** `rules` less the collections wanted by hand: what is wanted only through a rule. */
export function ruleOnlyWant(
  rules: ReadonlyMap<string, readonly RuleWant[]>,
  hand: SlugIndex,
): Map<string, readonly RuleWant[]> {
  return new Map([...rules].filter(([slug]) => !hand.has(slug)));
}

export type RuleWant = { ruleId: number; listId: number };

/** The mode a feed input asks for; none is Off. */
export function browseMode({ match }: { match?: BrowseMatchMode }): BrowseMatchMode {
  return match ?? "off";
}

/** `index` keeping only the lists `keep` passes, and only the collections left on one. */
export function narrowIndex(index: SlugIndex, keep: (listId: number) => boolean) {
  const narrowed = new Map<string, number[]>();
  for (const [slug, listIds] of index) {
    const kept = listIds.filter(keep);
    if (kept.length > 0) narrowed.set(slug, kept);
  }
  return narrowed;
}

/** The viewer's slugs by the post side they match. */
export type MatchIndex = {
  tradeWant: string[];
  saleWant: string[];
  have: string[];
  tradeHave: string[];
  saleHave: string[];
};

export function matchIndexOf(viewer: Viewer): MatchIndex {
  return {
    tradeWant: [...viewer.tradeWant.keys()],
    saleWant: [...viewer.saleWant.keys()],
    have: [...viewer.have.keys()],
    tradeHave: [...viewer.tradeHave.keys()],
    saleHave: [...viewer.saleHave.keys()],
  };
}

/** The viewer as Compare with sees it: only the compared have and sale lists, and want lists. */
function narrowRuleWant(
  ruleWant: ReadonlyMap<string, readonly RuleWant[]>,
  keep: (listId: number) => boolean,
) {
  const narrowed = new Map<string, RuleWant[]>();
  for (const [slug, rules] of ruleWant) {
    const kept = rules.filter((rule) => keep(rule.listId));
    if (kept.length > 0) narrowed.set(slug, kept);
  }
  return narrowed;
}

export function narrowViewer(
  viewer: Viewer,
  sides: { haveListIds: readonly number[]; wantListIds: readonly number[] },
): Viewer {
  const haveIds = new Set(sides.haveListIds);
  const wantIds = new Set(sides.wantListIds);
  const keepHave = (id: number) => haveIds.has(id);
  const keepWant = (id: number) => wantIds.has(id);
  return {
    have: narrowIndex(viewer.have, keepHave),
    tradeHave: narrowIndex(viewer.tradeHave, keepHave),
    saleHave: narrowIndex(viewer.saleHave, keepHave),
    want: narrowIndex(viewer.want, keepWant),
    tradeWant: narrowIndex(viewer.tradeWant, keepWant),
    saleWant: narrowIndex(viewer.saleWant, keepWant),
    // wanted by hand means on a compared list: a hand entry elsewhere no longer hides the rule
    ...(viewer.ruleRows && viewer.handWant
      ? (() => {
          const ruleRows = narrowRuleWant(viewer.ruleRows, keepWant);
          const handWant = narrowIndex(viewer.handWant, keepWant);
          return { ruleRows, handWant, ruleWant: ruleOnlyWant(ruleRows, handWant) };
        })()
      : { ruleWant: viewer.ruleWant && narrowRuleWant(viewer.ruleWant, keepWant) }),
  };
}

/**
 * The poster's collections the viewer wants only through a rule, once per want list that matched,
 * in the sides' order: For you names them under the strips, and a list's popover its own. `swap`
 * is a have list's, which counts toward Can swap.
 */
export function ruleMatchesOf(
  sides: {
    role: "have" | "want" | "sale";
    /** the side's list offers swaps: a have list, or a sale list that takes them */
    swaps?: boolean;
    entries: FeedEntry[];
    index: SlugIndex;
  }[],
  ruleWant: ReadonlyMap<string, readonly RuleWant[]> | undefined,
) {
  if (!ruleWant || ruleWant.size === 0) return [];
  const found = new Map<string, RuleWant & { slug: string; swap: boolean }>();
  for (const { role, swaps = role === "have", entries, index } of sides) {
    for (const entry of entries) {
      // each want list this side actually matched names its rule, so a list outside the counted
      // pair never hides the one inside it
      const matchedLists = index.get(entry.slug);
      if (!matchedLists) continue;
      for (const rule of ruleWant.get(entry.slug) ?? []) {
        if (!matchedLists.includes(rule.listId)) continue;
        const key = `${entry.slug}:${rule.listId}`;
        const seen = found.get(key);
        if (!seen) found.set(key, { slug: entry.slug, ...rule, swap: swaps });
        else if (swaps) seen.swap = true;
      }
    }
  }
  return [...found.values()];
}

/** `index` less the collections `minus` holds. */
function withoutIndex(index: SlugIndex, minus: SlugIndex, ruled?: ReadonlyMap<string, unknown>) {
  const left = new Map<string, readonly number[]>();
  for (const [slug, listIds] of index) {
    if (!minus.has(slug) && !ruled?.has(slug)) left.set(slug, listIds);
  }
  return left;
}

type NearIndexes = Record<"sell" | "swapWant" | "swapHave" | "buy", SlugIndex>;

const nearIndexCache = new WeakMap<Viewer, NearIndexes>();

function nearIndexes(viewer: Viewer): NearIndexes {
  let found = nearIndexCache.get(viewer);
  if (!found) {
    found = {
      sell: withoutIndex(viewer.tradeHave, viewer.saleHave),
      swapWant: withoutIndex(viewer.saleHave, viewer.tradeHave),
      // a collection wanted only through a rule is never near
      swapHave: withoutIndex(viewer.saleWant, viewer.tradeWant, viewer.ruleWant),
      buy: withoutIndex(viewer.tradeWant, viewer.saleWant, viewer.ruleWant),
    };
    nearIndexCache.set(viewer, found);
  }
  return found;
}

/**
 * A side's near matches: the viewer's collections that would match it if one side's Open to
 * allowed it, and what the viewer would do. Each is what `indexFor` leaves out of a wider set, so
 * a match is never near. Null when the side is open both ways.
 */
export function nearFor(
  role: "have" | "want" | "sale",
  list: ListState,
  viewer: Viewer,
): { verb: NearVerb; index: SlugIndex } | null {
  const near = nearIndexes(viewer);
  if (role === "have") return { verb: "swap", index: near.swapHave };
  if (role === "sale") return list.takesSwaps ? null : { verb: "buy", index: near.buy };
  return pickByOpenTo<{ verb: NearVerb; index: SlugIndex } | null>(list, {
    buying: { verb: "sell", index: near.sell },
    both: null,
    swaps: { verb: "swap", index: near.swapWant },
  });
}

/** A side's near collections, a rule's entries left out, and the viewer's lists they are on. */
export function nearOf(
  role: "have" | "want" | "sale",
  list: ListState,
  entries: FeedEntry[],
  viewer: Viewer,
) {
  const near = nearFor(role, list, viewer);
  if (!near) return null;
  const { slugs, listIds } = matchCollections([
    { entries: entries.filter((entry) => entry.ruleId === undefined), index: near.index },
  ]);
  return slugs.length > 0 ? { verb: near.verb, slugs, listIds, index: near.index } : null;
}

/**
 * The offer picker's tags for copies on `slugs`, against a person's lists as their strips ring
 * them: none for a match, the verb for a near match. Giving, a copy whose collection is on none of
 * the viewer's have or sale lists is "loose"; asking, every shown copy is one the viewer wants.
 */
export function pickerTags(
  slugs: readonly string[],
  sides: readonly { role: "have" | "want" | "sale"; list: ListState; entries: FeedEntry[] }[],
  viewer: Viewer,
  direction: "give" | "get",
) {
  const tags: Record<string, PickerTag> = {};
  const held = sides.map((side) => ({
    side,
    slugs: new Set(side.entries.map((entry) => entry.slug)),
    index: indexFor(side.role, side.list, viewer),
    near: nearFor(side.role, side.list, viewer),
  }));
  for (const slug of new Set(slugs)) {
    const on = held.filter((side) => side.slugs.has(slug));
    if (on.some((side) => side.index.has(slug))) continue;
    const near = on.find((side) => side.near?.index.has(slug))?.near;
    if (near) tags[slug] = near.verb;
    else if (direction === "give" && !viewer.have.has(slug)) tags[slug] = "loose";
  }
  return tags;
}

/** What a post's side is matched and ringed against: the viewer's lists it can match. */
export function indexFor(role: "have" | "want" | "sale", list: ListState, viewer: Viewer) {
  if (role === "have") return viewer.tradeWant;
  // a Sell or swap list answers my want lists open to swaps and those open to buying: all of them
  if (role === "sale") return list.takesSwaps ? viewer.want : viewer.saleWant;
  return pickByOpenTo(list, {
    buying: viewer.saleHave,
    both: viewer.have,
    swaps: viewer.tradeHave,
  });
}
