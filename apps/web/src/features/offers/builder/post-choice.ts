import type { OfferPick } from "@/features/offers/pick";

type Post = { slug: string };

/** Where Offer on opens: the first of these that is one of the partner's posts, else their first. */
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
  const asPost = (slug: string | null | undefined) =>
    slug != null && posts.some((post) => post.slug === slug) ? slug : undefined;
  return (
    asPost(from.startList) ??
    asPost(from.matchesPost) ??
    asPost(from.addedPost) ??
    asPost(from.lead) ??
    asPost(from.get?.find((pick) => pick.listSlug !== null)?.listSlug) ??
    posts[0]?.slug
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
 * The post the server checks gives against: the post while You get holds a pick that is not a
 * kept objekt, else none, so an offer that asks for nothing is held to every want list on Trade.
 */
export function givesPostOf(
  postSlug: string | null,
  get: readonly Pick<OfferPick, "kept">[],
): string | null {
  return get.some((pick) => !pick.kept) ? postSlug : null;
}

/**
 * Which want list Only offers with what I want holds You give to: the post's own, none on a post
 * without one, every want list on Trade with no post; null where nothing is filtered.
 */
export function giveRule(
  rules: { wantedOnly: boolean; wantsOnTrade: boolean } | undefined,
  post: { want: string | null } | null,
): { want: string } | "all" | null {
  if (!rules?.wantedOnly) return null;
  if (post !== null) return post.want === null ? null : { want: post.want };
  return rules.wantsOnTrade ? "all" : null;
}
