import { ChatsCircleIcon, HandshakeIcon } from "@phosphor-icons/react";
import { handleName } from "@repo/api/schemas/trade-person";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { threadOptions } from "@/features/chat/queries";
import { threadPartner } from "@/features/chat/thread-cache";
import { counterRequest } from "@/features/offers/counter-request";
import { OfferPage, useLeaveOffer } from "@/features/offers/offer-builder";
import {
  backPath,
  listSlugsOf,
  offerSearchSchema,
  requestOf,
  withoutLists,
} from "@/features/offers/offer-link";
import { readPersonRow } from "@/features/trade/browse-loader";
import { PersonPageRefused } from "@/features/trade/person-page-view";
import { tradePersonOptions } from "@/features/trade/queries";
import { requireSignedIn } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc";
import { isBadRequest, isClientError, isNotFound } from "@/lib/orpc-error";
import { isRefusalError, refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

/**
 * Make offer and Counter. The search says how the offer starts; the page rebuilds the request from
 * it. A conversation or a countered offer must be the viewer's, with the person the handle names,
 * and every list it names that person's.
 */
export const Route = createFileRoute("/(container)/trade/@{$handle}/offer")({
  validateSearch: offerSearchSchema,
  loaderDeps: ({ search }) => ({
    counter: search.counter,
    conversation: search.conversation,
    lists: listSlugsOf(search),
  }),
  beforeLoad: ({ context, location }) => requireSignedIn({ context, location }),
  loader: async ({ context: { queryClient, person }, deps }) => {
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
      if (
        deps.conversation !== undefined &&
        (await partnerOf(deps.conversation)) !== person.userId
      ) {
        return { ...none, name, unavailable: "conversation" as const };
      }
      // a not found or bad slug says the list or its profile names no one; any other refusal
      // offers a retry below, and a server error shows the error page, rather than quietly
      // dropping the matches
      const unless404 = (error: unknown) => {
        if (isNotFound(error) || isBadRequest(error)) return null;
        throw error;
      };
      // a bound list's owner is the account behind its profile
      const boundOwner = async (slug: string) => {
        const list = await queryClient
          .query({ ...orpc.list.findPublic.queryOptions({ input: { slug } }), staleTime: 60_000 })
          .catch(unless404);
        if (!list?.profileAddress) return null;
        const owner = await queryClient
          .query(tradePersonOptions({ handle: list.profileAddress }))
          .catch(unless404);
        return owner?.userId ?? null;
      };
      const owners = await Promise.all(deps.lists.map(boundOwner));
      let foreign = owners.some((owner) => owner !== person.userId);
      // a want list has no profile: it is theirs when one of their posts on Trade holds it
      if (foreign) {
        const { row } = await readPersonRow({ queryClient, userId: person.userId });
        const theirs = new Set(
          (row?.posts ?? []).flatMap((post) => post.sides.map((side) => side.list.slug)),
        );
        foreign = deps.lists.some((slug, i) => owners[i] !== person.userId && !theirs.has(slug));
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
  },
  head: ({ loaderData, match }) =>
    generateMetadata({
      title: loaderData?.name
        ? match.search.counter !== undefined
          ? m.offer_builder_counter_title({ name: loaderData.name })
          : m.offer_builder_title({ name: loaderData.name })
        : m.page_titles_trade(),
    }),
  component: OfferRoute,
});

function OfferRoute() {
  const { person, refusal: lookupRefusal } = Route.useRouteContext();
  const search = Route.useSearch();
  const { counter, unavailable, foreign, refused, refusal } = Route.useLoaderData();
  if (!person || refused) return <PersonPageRefused refusal={refusal ?? lookupRefusal} />;
  const name = handleName(person.handle);
  const back = backPath(search.from, person.handle);
  if (unavailable) {
    return (
      <EmptyState
        bordered={false}
        icon={unavailable === "counter" ? HandshakeIcon : ChatsCircleIcon}
        title={unavailable === "counter" ? m.offer_page_cant_counter() : m.chat_not_found()}
        hint={unavailable === "counter" ? m.offer_page_cant_counter_hint() : undefined}
        action={<BackButton href={back} label={m.offer_page_back({ name })} />}
      />
    );
  }
  const request = counter
    ? counterRequest(counter.offer, name, counter.collections)
    : requestOf(foreign ? withoutLists(search) : search, { userId: person.userId, name });
  // a new start begins afresh; `from` alone changes nothing on the page
  const { from: _from, ...start } = search;
  return <OfferPage key={JSON.stringify(start)} request={request} backHref={back} />;
}

function BackButton({ href, label }: { href: string; label: string }) {
  const leave = useLeaveOffer(href);
  return (
    <Button
      variant="outline"
      size="sm"
      className="max-w-full"
      render={
        <a
          href={href}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            leave();
          }}
        />
      }
    >
      <span className="truncate">{label}</span>
    </Button>
  );
}
