import { handleName } from "@repo/api/schemas/trade-person";
import type { QueryClient } from "@tanstack/react-query";

import { threadOptions } from "@/features/chat/queries";
import { threadPartner } from "@/features/chat/thread-cache";
import { hasForeignList, hasOtherOwner } from "@/features/offers/offer-ownership";
import { orpc } from "@/lib/orpc";
import { isBadRequest, isClientError, isNotFound } from "@/lib/orpc-error";
import { isRefusalError, refusalText } from "@/lib/refusal";

import { readPersonRow } from "./browse-loader";
import { tradePersonOptions } from "./queries";

/**
 * The offer page's loader: works out whether the counter, conversation and lists the search names
 * are the viewer's with `person`. A refusal comes back as `refused`, a server error throws.
 */
export async function loadOfferPage({
  queryClient,
  person,
  deps,
}: {
  queryClient: QueryClient;
  person: { userId: string; handle: string } | null | undefined;
  deps: { counter: number | undefined; conversation: number | undefined; lists: string[] };
}) {
  const none = {
    counter: null,
    unavailable: null,
    foreign: false,
    refused: false,
    refusal: null as string | null,
  };
  if (!person) return { ...none, name: null };
  const name = handleName(person.handle);
  try {
    // the thread is usually cached by the page Make offer was chosen on
    const partnerOf = async (conversationId: number) => {
      const thread = await queryClient
        .infiniteQuery({ ...threadOptions(conversationId), staleTime: "static" })
        .catch((error: unknown) => {
          if (isClientError(error)) return null;
          throw error;
        });
      return thread ? threadPartner(thread)?.userId : undefined;
    };
    if (deps.counter !== undefined) {
      // read fresh: whether it can still be countered is the point
      const views = await queryClient.query({
        ...orpc.offer.views.queryOptions({ input: { ids: [deps.counter] } }),
        staleTime: 0,
      });
      const offer = views.offers[0];
      if (
        offer?.actions.includes("counter") &&
        (await partnerOf(offer.conversationId)) === person.userId
      ) {
        return { ...none, name, counter: { offer, collections: views.collections } };
      }
      return { ...none, name, unavailable: "counter" as const };
    }
    if (deps.conversation !== undefined && (await partnerOf(deps.conversation)) !== person.userId) {
      return { ...none, name, unavailable: "conversation" as const };
    }
    // a not found or bad slug says the list or its profile names no one; any other refusal
    // offers a retry below, and a server error shows the error page, rather than quietly
    // dropping the matches
    const nullIfNotFoundOrBadRequest = (error: unknown) => {
      if (isNotFound(error) || isBadRequest(error)) return null;
      throw error;
    };
    // a bound list's owner is the account behind its profile
    const boundOwner = async (slug: string) => {
      const list = await queryClient
        .query({ ...orpc.list.findPublic.queryOptions({ input: { slug } }), staleTime: 60_000 })
        .catch(nullIfNotFoundOrBadRequest);
      if (!list?.profileAddress) return null;
      const owner = await queryClient
        .query(tradePersonOptions({ handle: list.profileAddress }))
        .catch(nullIfNotFoundOrBadRequest);
      return owner?.userId ?? null;
    };
    const owners = await Promise.all(deps.lists.map(boundOwner));
    let foreign = hasOtherOwner(owners, person.userId);
    // a want list has no profile: it is theirs when one of their posts on Trade holds it
    if (foreign) {
      const { row } = await readPersonRow({ queryClient, userId: person.userId });
      const theirs = new Set(
        (row?.posts ?? []).flatMap((post) => post.sides.map((side) => side.list.slug)),
      );
      foreign = hasForeignList(deps.lists, owners, person.userId, theirs);
    }
    return { ...none, name, foreign };
  } catch (error) {
    // a refusal (the rate limit) offers the person page's retry under the plain Trade title,
    // never the error page
    if (isClientError(error)) {
      return {
        ...none,
        name: null,
        refused: true,
        refusal: isRefusalError(error) ? refusalText(error) : null,
      };
    }
    throw error;
  }
}
