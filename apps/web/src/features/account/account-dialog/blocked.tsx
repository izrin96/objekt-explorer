import { ArrowClockwiseIcon, ProhibitIcon, WarningIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnblock } from "@/features/moderation/actions";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { displayNickname } from "@/lib/address";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

type BlockedRow = Outputs["moderation"]["blocked"][number];

export function BlockedUsersSection() {
  const query = useQuery(orpc.moderation.blocked.queryOptions({ staleTime: 0 }));
  const unblock = useUnblock();

  return (
    <section aria-labelledby="account-blocked-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 id="account-blocked-title" className="text-sm font-medium">
          {m.mod_blocked_title()}
        </h3>
        <p className="text-muted-foreground text-xs text-pretty">{m.mod_blocked_desc()}</p>
      </div>
      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={WarningIcon}
          bordered={false}
          title={m.common_error_loading_data()}
          action={
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              <ArrowClockwiseIcon />
              {m.common_error_retry()}
            </Button>
          }
        />
      ) : (
        <BlockedUsersList
          rows={query.data}
          unblocking={unblock.isPending ? (unblock.variables?.userId ?? null) : null}
          onUnblock={(userId) => unblock.mutate({ userId })}
        />
      )}
    </section>
  );
}

/** The partner's heading from For you: name, socials, and the other profiles they hold. */
function BlockedIdentity({ row }: { row: BlockedRow }) {
  const { identity, user } = row;
  const also = identity.also.map((ref) => displayNickname(ref.address, ref.nickname));
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 text-sm font-medium break-words">
          {identity.address ? (
            <ProfileLink
              address={identity.address}
              nickname={identity.name}
              className="underline-offset-2 hover:underline"
            >
              {identity.name}
            </ProfileLink>
          ) : (
            identity.name
          )}
        </span>
        {user.discord ? <SocialBadge platform="discord" username={user.discord} /> : null}
        {user.twitter ? <SocialBadge platform="twitter" username={user.twitter} /> : null}
      </span>
      {also.length > 0 ? (
        <span className="text-muted-foreground text-xs break-words">
          {m.trade_also({ names: also.join(", ") })}
        </span>
      ) : null}
    </span>
  );
}

/** Headed as For you heads a partner; Unblock acts at once, since it only restores. */
function BlockedUsersList({
  rows,
  unblocking,
  onUnblock,
}: {
  rows: BlockedRow[];
  unblocking: string | null;
  onUnblock: (userId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ProhibitIcon}
        bordered={false}
        title={m.mod_blocked_empty()}
        hint={m.mod_blocked_empty_hint()}
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {rows.map((row) => (
        <li key={row.userId} className="flex items-center gap-3 px-3 py-2.5">
          <Avatar className="size-8 shrink-0">
            {row.user.image ? <AvatarImage src={row.user.image} alt="" /> : null}
            <AvatarFallback>{row.identity.name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <BlockedIdentity row={row} />
          <Button
            variant="outline"
            size="sm"
            loading={unblocking === row.userId}
            onClick={() => onUnblock(row.userId)}
            aria-label={m.mod_unblock_name({ name: row.identity.name })}
          >
            {m.mod_unblock()}
          </Button>
        </li>
      ))}
    </ul>
  );
}
