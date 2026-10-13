import { ArrowClockwiseIcon, WarningIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";

import { linkEventLabel } from "./link-history";
import { addressHistoryOptions } from "./queries";
import { personName, sectionTitle } from "./shared";
import { When } from "./when";

export function AddressHistory({ address }: { address: string }) {
  const query = useQuery(addressHistoryOptions(address));

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <EmptyState
        icon={WarningIcon}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }

  const { events, holder } = query.data;
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p className="font-mono text-sm break-all">{address}</p>
      <section aria-labelledby="mod-address-holder" className="flex flex-col gap-1">
        <h2 id="mod-address-holder" className={sectionTitle}>
          {m.mod_address_holder()}
        </h2>
        {holder ? (
          <Link
            to="/mod/reports/$userId"
            params={{ userId: holder.userId }}
            className="text-sm font-medium underline-offset-2 hover:underline"
          >
            {personName(holder)}
          </Link>
        ) : (
          <p className="text-muted-foreground text-sm">{m.mod_address_unheld()}</p>
        )}
      </section>
      <section aria-labelledby="mod-address-events" className="flex flex-col gap-3">
        <h2 id="mod-address-events" className={sectionTitle}>
          {m.mod_links_heading()}
        </h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.mod_address_none()}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {events.map((event) => (
              <li key={event.id} className="flex flex-col gap-0.5 text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    to="/mod/reports/$userId"
                    params={{ userId: event.account.userId }}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {personName(event.account)}
                  </Link>
                  <span className="text-muted-foreground">{linkEventLabel(event)}</span>
                  <When
                    iso={event.at}
                    className="text-muted-foreground font-mono text-xs tabular-nums"
                  />
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
