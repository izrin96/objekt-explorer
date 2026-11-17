import { ArrowClockwiseIcon, QrCodeIcon, WarningIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/account/account-nav";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

import { ConnectDialog } from "./connect-dialog";
import { cosmoSessionsOptions, SYNC_POLL_MS } from "./queries";
import { SessionsView } from "./sessions-view";
import { useConnectFlow } from "./use-connect-flow";

/** What the site stores, reads and shows, before any sign-in; pressing Connect is the consent. */
function Consent() {
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
      <h3 className="font-medium">{m.cosmo_session_title()}</h3>
      <p className="text-pretty">{m.cosmo_session_intro()}</p>
      <ul className="text-muted-foreground flex flex-col gap-1.5 text-pretty">
        <li>{m.cosmo_session_stored()}</li>
        <li>{m.cosmo_session_read()}</li>
        <li>{m.cosmo_session_shown()}</li>
        <li>{m.cosmo_session_stop()}</li>
      </ul>
    </section>
  );
}

export function CollectionDataPanel() {
  const flow = useConnectFlow();
  const query = useQuery({
    ...cosmoSessionsOptions,
    // a row waiting for its sync refetches until the worker has run it
    refetchInterval: (current) =>
      current.state.data?.sessions.some((session) => session.syncRequested) ? SYNC_POLL_MS : false,
  });
  const available = query.data?.available ?? false;
  const sessions = query.data?.sessions ?? [];

  return (
    <AccountSection
      title={m.account_section_collection_data()}
      description={
        query.data === undefined
          ? undefined
          : !query.data.available
            ? m.cosmo_session_not_set_up()
            : sessions.length === 0
              ? m.cosmo_session_none()
              : m.cosmo_session_count({ count: formatCount(sessions.length) })
      }
      aside={
        <Button size="sm" disabled={!available} onClick={flow.start}>
          <QrCodeIcon />
          {m.cosmo_session_connect()}
        </Button>
      }
    >
      <Consent />
      {query.isError ? (
        <EmptyState
          icon={WarningIcon}
          bordered={false}
          title={m.cosmo_session_loading_error()}
          action={
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              <ArrowClockwiseIcon />
              {m.common_error_retry()}
            </Button>
          }
        />
      ) : query.data === undefined ? (
        <Skeleton className="h-20 rounded-lg" />
      ) : sessions.length > 0 ? (
        <SessionsView sessions={sessions} onReconnect={flow.start} />
      ) : null}
      <ConnectDialog flow={flow} />
    </AccountSection>
  );
}

export function CollectionDataPending() {
  return (
    <AccountSection title={m.account_section_collection_data()}>
      <Consent />
      <Skeleton className="h-20 rounded-lg" />
    </AccountSection>
  );
}
