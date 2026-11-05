import { UserCircleDashedIcon } from "@phosphor-icons/react";
import { Link, Outlet, createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { withHandle } from "@/features/trade/person-page";
import { tradePersonOptions } from "@/features/trade/queries";
import { generateMetadata } from "@/lib/meta";
import { isBadRequest, isClientError, isNotFound } from "@/lib/orpc-error";
import { isRefusalError, refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

/**
 * Every page under a Trade handle. `beforeLoad`, not a loader, so the pages' loaders get the
 * account and nothing renders before a non-canonical handle redirects. A refused lookup (the rate
 * limit) gives `person: null`: the page offers a retry under the plain Trade title, never an
 * error page, so an over-limit crawler still reads a page.
 */
export const Route = createFileRoute("/(container)/trade/@{$handle}")({
  staticData: { tradeChrome: false },
  beforeLoad: async ({ params, location, context: { queryClient } }) => {
    // worded here, since only a string survives the trip to the page
    let refusal: string | null = null;
    const person = await queryClient
      .query(tradePersonOptions({ handle: params.handle }))
      .catch((error: unknown) => {
        // a handle that can't be one (empty, too long) names no one either
        if (isNotFound(error) || isBadRequest(error)) throw notFound();
        if (isClientError(error)) {
          if (isRefusalError(error)) refusal = refusalText(error);
          return null;
        }
        throw error;
      });
    if (!person) return { person: null, refusal };
    // an account with no linked profile has no page
    if (!person.handle) throw notFound();
    if (person.handle !== params.handle) {
      throw redirect({
        href: withHandle(location.href, person.handle),
        replace: true,
        // the offer page's Back steps back through history only when it was opened in the app
        state: { offerBack: location.state.offerBack },
      });
    }
    return { person: { userId: person.userId, handle: person.handle }, refusal: null };
  },
  // a handle that resolves to no one keeps the plain Trade title; the pages set their own
  head: () => generateMetadata({ title: m.page_titles_trade() }),
  notFoundComponent: PersonNotFound,
  component: Outlet,
});

function PersonNotFound() {
  return (
    <>
      <h1 className="sr-only">{m.nav_trade()}</h1>
      <EmptyState
        bordered={false}
        icon={UserCircleDashedIcon}
        title={m.trade_person_not_found()}
        hint={m.trade_person_not_found_hint()}
        action={
          <Button variant="outline" size="sm" render={<Link to="/trade" />}>
            {m.trade_person_back()}
          </Button>
        }
      />
    </>
  );
}
