import { ArrowsClockwiseIcon, WarningIcon } from "@phosphor-icons/react";
import type { CosmoSessionRow } from "@repo/api/schemas/cosmo-session";
import { useHydrated } from "@tanstack/react-router";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { formatCount } from "@/lib/number";
import { formatTimestamp, relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { expiryNotice } from "./connect-flow";
import { useSessionActions } from "./use-session-actions";

const ERROR_TEXT: Record<NonNullable<CosmoSessionRow["lastError"]>, () => string> = {
  session_dead: m.cosmo_session_error_session_dead,
  session_expired: m.cosmo_session_error_session_expired,
  cosmo_unavailable: m.cosmo_session_error_cosmo_unavailable,
  unexpected_response: m.cosmo_session_error_unexpected_response,
  key_unreadable: m.cosmo_session_error_key_unreadable,
};

export function SessionsView({
  sessions,
  onReconnect,
}: {
  sessions: CosmoSessionRow[];
  onReconnect: () => void;
}) {
  return (
    <ul
      aria-label={m.cosmo_session_list_label()}
      className="flex flex-col divide-y rounded-lg border"
    >
      {sessions.map((session) => (
        <SessionItem key={session.id} session={session} onReconnect={onReconnect} />
      ))}
    </ul>
  );
}

/** Days left when the session is live and near its end; null before hydration, as the clock is the viewer's. */
function useExpiryNotice(session: CosmoSessionRow) {
  const hydrated = useHydrated();
  const now = useMinuteClock();
  if (!hydrated || session.dead) return null;
  return expiryNotice(new Date(session.expiresAt).getTime(), now);
}

function expiryText(days: number) {
  if (days === 0) return m.cosmo_session_expires_today();
  return days === 1
    ? m.cosmo_session_expires_in_one_day()
    : m.cosmo_session_expires_in_days({ count: formatCount(days) });
}

/** Times are the viewer's, so they print once hydrated: the server renders in UTC. */
function SessionMeta({ session }: { session: CosmoSessionRow }) {
  const hydrated = useHydrated();
  const now = useMinuteClock();
  if (!hydrated) return null;

  const { lastSync } = session;
  const parts = [
    m.cosmo_session_connected_on({ date: formatTimestamp(new Date(session.createdAt)) }),
    session.lastSyncedAt === null
      ? m.cosmo_session_never_synced()
      : m.cosmo_session_synced({
          time: relativeTime(new Date(session.lastSyncedAt).getTime(), now),
        }),
    ...(session.dead
      ? []
      : [m.cosmo_session_expires_on({ date: formatTimestamp(new Date(session.expiresAt)) })]),
    ...(lastSync === null
      ? []
      : [
          m.cosmo_session_sync_counts({
            seen: formatCount(lastSync.seen),
            recorded: formatCount(lastSync.recorded),
            applied: formatCount(lastSync.applied),
            skipped: formatCount(lastSync.skipped),
          }),
        ]),
  ];
  return <p className="text-muted-foreground text-xs">{parts.join(" · ")}</p>;
}

function SessionItem({
  session,
  onReconnect,
}: {
  session: CosmoSessionRow;
  onReconnect: () => void;
}) {
  const { sync, disconnect } = useSessionActions();
  const name = session.nickname;
  const expiring = useExpiryNotice(session);

  return (
    <li className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium break-words">{name}</span>
          {session.dead ? (
            <Badge variant="warning" size="sm">
              {m.cosmo_session_signed_out()}
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              {m.cosmo_session_live()}
            </Badge>
          )}
        </div>
        <p className="font-mono text-xs break-all">{session.address}</p>
        <SessionMeta session={session} />
        {expiring !== null && (
          <p className="text-warning-foreground text-xs font-medium">{expiryText(expiring)}</p>
        )}
        {session.lastError !== null && (
          <p className="text-warning-foreground flex items-start gap-1.5 text-xs text-pretty">
            <WarningIcon className="mt-0.5 size-3.5 shrink-0" />
            {ERROR_TEXT[session.lastError]()}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {session.dead ? (
          <Button
            variant="outline"
            size="sm"
            aria-label={m.cosmo_session_reconnect_label({ name })}
            onClick={onReconnect}
          >
            {m.cosmo_session_reconnect()}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            aria-label={
              session.syncRequested
                ? m.cosmo_session_sync_pending_label({ name })
                : m.cosmo_session_sync_label({ name })
            }
            disabled={session.syncRequested}
            loading={sync.isPending && sync.variables?.id === session.id}
            onClick={() => sync.mutate({ id: session.id })}
          >
            <ArrowsClockwiseIcon />
            {session.syncRequested ? m.cosmo_session_sync_pending() : m.cosmo_session_sync_now()}
          </Button>
        )}
        {expiring !== null && (
          <Button
            variant="outline"
            size="sm"
            aria-label={m.cosmo_session_renew_label({ name })}
            onClick={onReconnect}
          >
            {m.cosmo_session_renew()}
          </Button>
        )}
        <ConfirmDialog
          title={m.cosmo_session_disconnect_title({ name })}
          description={m.cosmo_session_disconnect_desc()}
          confirmLabel={m.cosmo_session_disconnect()}
          destructive
          onConfirm={() => disconnect.mutate({ id: session.id })}
          trigger={
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive-outline"
                  size="sm"
                  aria-label={m.cosmo_session_disconnect_label({ name })}
                />
              }
            >
              {m.cosmo_session_disconnect()}
            </AlertDialogTrigger>
          }
        />
      </div>
    </li>
  );
}
