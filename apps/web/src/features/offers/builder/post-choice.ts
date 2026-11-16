import type { OfferPick } from "@/features/offers/pick";

type Post = { slug: string; want?: string | null; buy?: boolean };

/**
 * The partner's Buy posts as Offer on choices: the want lists that lead their own post, in order.
 */
export function buyPostsOf(wantLists: readonly { slug: string; name: string; buy: boolean }[]) {
  return wantLists.flatMap((list) =>
    list.buy
      ? [{ slug: list.slug, name: list.name, type: "want" as const, want: null, buy: true }]
      : [],
  );
}

/**
 * Where Offer on opens: the first of these that is one of the partner's posts, else their first
 * that is not a Buy post; a want list names the post it pairs with. A Buy post is found only from
 * the start, the matches' post and the added matches' post: a row's lead post and the first get
 * pick's list never open on one.
 */
export function openPostOf(
  posts: readonly Post[],
  from: {
    startList?: string;
    matchesPost?: string;
    addedPost?: string | null;
    /** the list the builder is addressed to: a row's lead post, which may be a want list */
    lead?: string;
    get?: readonly Pick<OfferPick, "listSlug">[];
  },
): string | undefined {
  const asPost = (slug: string | null | undefined, buy: boolean) =>
    slug == null
      ? undefined
      : posts.find(
          (post) =>
            (buy || post.buy !== true) &&
            (post.slug === slug || (post.want != null && post.want === slug)),
        )?.slug;
  return (
    asPost(from.startList, true) ??
    asPost(from.matchesPost, true) ??
    asPost(from.addedPost, true) ??
    asPost(from.lead, false) ??
    asPost(from.get?.find((pick) => pick.listSlug !== null)?.listSlug, false) ??
    posts.find((post) => post.buy !== true)?.slug
  );
}

/**
 * The post the offer is on: the sender's choice (`undefined` not chosen yet), else where it
 * opened; none while the partner has no posts.
 */
export function chosenPostOf(
  posts: readonly Post[],
  chosen: string | undefined,
  open: string | undefined,
): string | null {
  if (posts.length === 0) return null;
  return posts.some((post) => post.slug === chosen) ? chosen! : (open ?? null);
}

/** Why a You get pick can't be sent on that post, or null. A kept objekt is the partner's own offer. */
export function postProblem(
  pick: Pick<OfferPick, "listSlug" | "kept">,
  hasPosts: boolean,
  post: string | null,
): "other_post" | null {
  if (!hasPosts || pick.kept) return null;
  return pick.listSlug !== null && pick.listSlug !== post ? "other_post" : null;
}

/**
 * The want list a start names, when it is one of the partner's Buy posts. The matches' post, else
 * the added matches' want list, decides alone when set: a paired one is no start, and the target
 * is read only without either.
 */
export function startWantOf(
  wantLists: readonly { slug: string; buy: boolean }[],
  from: { matchesPost?: string; addedWant?: string | null; target?: string },
): string | undefined {
  const slug = from.matchesPost ?? from.addedWant ?? from.target;
  return slug != null && wantLists.some((list) => list.slug === slug && list.buy)
    ? slug
    : undefined;
}

/**
 * What You give keeps to and what the request names, by `web-trade-offers` Recipients who take
 * only what they want: a Buy post under Offer on to its want list, whatever You get asks; else a
 * new ask goes to the post's want list, a counter asking nothing new to every one, else a start
 * (only with no Offer on choices) to its want list, else the post's.
 */
export function offerOnOf(i: {
  postSlug: string | null;
  posts: readonly { slug: string; want: string | null; buy?: boolean }[];
  startWant: string | undefined;
  newAsk: boolean;
  counter: boolean;
}): {
  gives: { want: string; buy: boolean } | "none" | "every";
  input: { post?: string; wantList?: string };
} {
  const post = i.posts.find((p) => p.slug === i.postSlug) ?? null;
  if (post?.buy === true) {
    return { gives: { want: post.slug, buy: true }, input: { wantList: post.slug } };
  }
  const onPost = (): ReturnType<typeof offerOnOf> =>
    post === null
      ? { gives: "every", input: {} }
      : post.want === null
        ? { gives: "none", input: { post: post.slug } }
        : { gives: { want: post.want, buy: false }, input: { post: post.slug } };
  if (i.newAsk) return onPost();
  if (i.counter) return { gives: "every", input: {} };
  if (i.startWant !== undefined && i.posts.length === 0) {
    return { gives: { want: i.startWant, buy: true }, input: { wantList: i.startWant } };
  }
  return onPost();
}

/**
 * Which want list Only offers with what I want holds You give to: one list, none on a post
 * without one, every want list on Trade; null where nothing is filtered.
 */
export function giveRule(
  rules: { wantedOnly: boolean; wantsOnTrade: boolean } | undefined,
  gives: ReturnType<typeof offerOnOf>["gives"],
): { want: string } | "all" | "none" | null {
  if (!rules?.wantedOnly) return null;
  if (gives === "none") return "none";
  if (gives === "every") return rules.wantsOnTrade ? "all" : null;
  return { want: gives.want };
}
