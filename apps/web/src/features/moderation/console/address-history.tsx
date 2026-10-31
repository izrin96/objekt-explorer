import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  LinkBreakIcon,
  LinkSimpleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { useQuery } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";

import { PendingStatus } from "@/components/router/pending";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatRow } from "@/features/objekt/drawer/stat-row";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { formatTimestamp } from "@/lib/time";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { linkEventLabel } from "./link-history";
import { addressHistoryOptions } from "./queries";
import { personName, sectionTitle } from "./shared";
import { When } from "./when";

type AddressData = Outputs["moderation"]["addressHistory"];

const frame = "flex max-w-3xl flex-col gap-6";

export function AddressHistory({ address }: { address: string }) {
  const query = useQuery(addressHistoryOptions(address));

  if (query.isPending) return <AddressHistorySkeleton />;
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
  // the event that gave the holder the address: the newest link to them
  const holding = holder
    ? events.find((event) => event.event === "linked" && event.account.userId === holder.userId)
    : undefined;

  return (
    <div className={frame}>
      <BackToReports />
      <AddressHeader address={address} data={query.data} linkedAt={holding?.at} />
      <section aria-labelledby="mod-address-events" className="flex flex-col gap-3">
        <h2 id="mod-address-events" className={sectionTitle}>
          {m.mod_links_heading()}
        </h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            {m.mod_address_none()}
          </p>
        ) : (
          <ol className="bg-card flex flex-col divide-y rounded-lg border">
            {events.map((event) => {
              const Icon = event.event === "linked" ? LinkSimpleIcon : LinkBreakIcon;
              return (
                <li key={event.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <span
                    aria-hidden
                    className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link
                      to="/mod/reports/$userId"
                      params={{ userId: event.account.userId }}
                      className="font-medium break-words underline-offset-2 hover:underline"
                    >
                      {personName(event.account)}
                    </Link>
                    <span className="text-muted-foreground">{linkEventLabel(event)}</span>
                    {event.id === holding?.id ? (
                      <Badge variant="outline" size="sm">
                        {m.mod_address_current()}
                      </Badge>
                    ) : null}
                    <When
                      iso={event.at}
                      className="text-muted-foreground text-xs tabular-nums sm:ms-auto"
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function BackToReports() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ms-2 -mb-3 self-start"
      render={<Link to="/mod/reports" />}
    >
      <ArrowLeftIcon />
      {m.mod_back_to_queue()}
    </Button>
  );
}

/** The address itself, who holds it now, then its figures. */
function AddressHeader({
  address,
  data,
  linkedAt,
}: {
  address: string;
  data: AddressData;
  linkedAt: string | undefined;
}) {
  const { events, holder } = data;
  const hydrated = useHydrated();
  const accounts = new Set(events.map((event) => event.account.userId)).size;
  const first = events.at(-1);

  return (
    <section
      aria-labelledby="mod-address-name"
      className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-1.5">
          <h2
            id="mod-address-name"
            className="min-w-0 font-mono text-base font-medium break-all sm:text-lg"
          >
            {address}
          </h2>
          <CopyButton
            text={address}
            label={m.offer_copy_address()}
            toastTitle={m.profile_header_address_copied()}
            className="mt-0.5 sm:mt-1"
          />
        </div>
        <ProfileLink
          address={address}
          nickname={null}
          className="text-muted-foreground hover:text-foreground self-start text-sm underline-offset-2 hover:underline"
        >
          {m.mod_view_profile()}
        </ProfileLink>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-muted-foreground text-xs">{m.mod_address_holder()}</h3>
        {holder ? (
          <div className="flex items-center gap-3">
            <PersonAvatar
              name={personName(holder)}
              image={holder.user?.image}
              className="size-9 shrink-0"
            />
            <div className="flex min-w-0 flex-col">
              <Link
                to="/mod/reports/$userId"
                params={{ userId: holder.userId }}
                className="font-medium break-words underline-offset-2 hover:underline"
              >
                {personName(holder)}
              </Link>
              {linkedAt ? (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {m.mod_signal_linked()} <When iso={linkedAt} />
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{m.mod_address_unheld()}</p>
        )}
      </div>

      {events.length > 0 ? (
        <div className="border-t pt-4">
          <StatRow
            className="grid-cols-2 sm:grid-cols-3"
            stats={[
              { label: m.mod_address_accounts(), value: accounts.toLocaleString(getLocale()) },
              { label: m.mod_address_events(), value: events.length.toLocaleString(getLocale()) },
              {
                label: m.mod_address_first(),
                value: first && hydrated ? formatTimestamp(new Date(first.at)).slice(0, 10) : "",
              },
            ]}
          />
        </div>
      ) : null}
    </section>
  );
}

/** Also the route's pending view. */
export function AddressHistorySkeleton() {
  return (
    <div className={frame}>
      <PendingStatus />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-52 rounded-lg" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}
