import { ChatsCircleIcon, HandshakeIcon } from "@phosphor-icons/react";
import { handleName } from "@repo/api/schemas/trade-person";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { counterRequest } from "@/features/offers/counter-request";
import { OfferPage } from "@/features/offers/offer-builder";
import {
  backPath,
  listSlugsOf,
  offerSearchSchema,
  requestOf,
  withoutLists,
} from "@/features/offers/offer-link";
import { useLeaveOffer } from "@/features/offers/use-leave-offer";
import { loadOfferPage } from "@/features/trade/offer-loader";
import { PersonPageRefused } from "@/features/trade/person-page-view";
import { requireSignedIn } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
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
  loader: ({ context: { queryClient, person }, deps }) =>
    loadOfferPage({ queryClient, person, deps }),
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
  const { counter, unavailable, counterBlock, foreign, refused, refusal } = Route.useLoaderData();
  if (!person || refused) return <PersonPageRefused refusal={refusal ?? lookupRefusal} />;
  const name = handleName(person.handle);
  const back = backPath(search.from, person.handle);
  if (unavailable) {
    return (
      <EmptyState
        bordered={false}
        icon={unavailable === "counter" ? HandshakeIcon : ChatsCircleIcon}
        title={unavailable === "counter" ? m.offer_page_cant_counter() : m.chat_not_found()}
        hint={
          unavailable !== "counter"
            ? undefined
            : counterBlock === "muted"
              ? m.offer_page_cant_counter_muted()
              : counterBlock === "trade_blocked"
                ? m.offer_page_cant_counter_trade_blocked()
                : m.offer_page_cant_counter_hint()
        }
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
