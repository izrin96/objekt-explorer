import {
  type ComposerStart,
  type PlanList,
  POST_KINDS,
  postsOf,
  startForPost,
} from "@repo/api/schemas/trade-post";
import * as z from "zod";

import { flag } from "@/features/filters/search-schema";
import { isSafeRedirect } from "@/lib/utils";

export const NEW_POST: ComposerStart = {
  kind: null,
  have: null,
  want: null,
  sale: null,
  alsoPay: false,
  alsoSwap: false,
  replaces: null,
};

const slug = z.string().min(1).max(256).optional().catch(undefined);

/** `/trade/new`'s search: the composer's start, with `edit` for `replaces`, and where Post returns. */
export const composerSearchSchema = z.object({
  kind: z.enum(POST_KINDS).optional().catch(undefined),
  have: slug,
  want: slug,
  sale: slug,
  alsoPay: flag(),
  alsoSwap: flag(),
  /** the anchor slug of the post being edited */
  edit: slug,
  from: z.string().max(2048).refine(isSafeRedirect).optional().catch(undefined),
});

export type ComposerSearch = z.infer<typeof composerSearchSchema>;

/** The search a caller links with; empty and false values stay out of the URL. */
export function composerSearch(start: ComposerStart, from?: string): ComposerSearch {
  return {
    ...(start.kind && { kind: start.kind }),
    ...(start.have && { have: start.have }),
    ...(start.want && { want: start.want }),
    ...(start.sale && { sale: start.sale }),
    ...(start.alsoPay && { alsoPay: true }),
    ...(start.alsoSwap && { alsoSwap: true }),
    ...(start.replaces && { edit: start.replaces }),
    ...(from !== undefined && isSafeRedirect(from) && { from }),
  };
}

/**
 * The start the page opens on. A slug counts only for a list of the viewer's of that type, and
 * `edit` only for one of their posts; an `edit` link without picks opens on that post as it stands.
 */
export function resolveStart(search: ComposerSearch, lists: PlanList[]): ComposerStart {
  const own = (slug: string | undefined, type: PlanList["listType"]) =>
    slug !== undefined && lists.some((list) => list.slug === slug && list.listType === type)
      ? slug
      : null;
  const edit =
    search.edit !== undefined && postsOf(lists).some((post) => post.anchor.slug === search.edit)
      ? search.edit
      : null;
  if (edit !== null && search.kind === undefined) return startForPost(lists, edit);
  return {
    kind: search.kind ?? null,
    have: own(search.have, "have"),
    want: own(search.want, "want"),
    sale: own(search.sale, "sale"),
    alsoPay: search.alsoPay ?? false,
    alsoSwap: search.alsoSwap ?? false,
    replaces: edit,
  };
}

/** Where Post returns: `from` when it is a same-origin path, else Browse. */
export function returnPath(from: string | undefined) {
  return from !== undefined && isSafeRedirect(from) ? from : "/trade";
}
