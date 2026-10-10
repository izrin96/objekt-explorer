import { ArrowClockwiseIcon, ArrowLeftIcon, WarningIcon } from "@phosphor-icons/react";
import { isStaffRole, roleList } from "@repo/api/schemas/moderation";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { roleLabel } from "@/features/moderation/labels";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { m } from "@/paraglide/messages";

import { ActForm } from "./act-form";
import { Audit } from "./audit";
import { accountOptions } from "./queries";
import { Reports } from "./reports";
import { RoleControl } from "./role-control";
import { Sanctions } from "./sanctions";
import { Signals } from "./signals";
import { AttachedTrades } from "./trades";

const accountFrame =
  "flex flex-col gap-6 xl:col-span-2 xl:grid xl:grid-cols-subgrid xl:items-start";

// below `lg` a pane's children join one column, ordered by `order-*`: signals, reports, actions,
// sanctions, audit. From `lg` each pane is its own column.
const pane = "contents xl:flex xl:min-w-0 xl:flex-col xl:gap-6";

export function ModAccount({
  userId,
  selectedReport,
  viewerIsAdmin,
}: {
  userId: string;
  selectedReport: number | undefined;
  viewerIsAdmin: boolean;
}) {
  const query = useQuery(accountOptions(userId));

  if (query.isPending) return <ModAccountSkeleton />;

  if (query.isError) {
    return (
      <div className="xl:col-span-2">
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
      </div>
    );
  }

  const data = query.data;
  const { account } = data;
  const name = account.identity.name;
  const staff = isStaffRole(account.role);

  return (
    <div className={accountFrame}>
      <div className={pane}>
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 self-start xl:hidden"
          render={<Link to="/mod/reports" />}
        >
          <ArrowLeftIcon />
          {m.mod_back_to_queue()}
        </Button>

        <div className="flex items-center gap-3">
          <Avatar className="size-12 shrink-0">
            {account.user.image ? <AvatarImage src={account.user.image} alt="" /> : null}
            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-display text-xl font-semibold tracking-tight text-balance">
              {name}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {roleList(account.role)
                .filter((role) => role !== "user")
                .map((role) => (
                  <Badge key={role} variant="outline" size="sm">
                    {roleLabel(role)}
                  </Badge>
                ))}
              {account.banned ? (
                <Badge variant="destructive" size="sm">
                  {m.mod_banned()}
                </Badge>
              ) : null}
              {account.identity.address ? (
                <ProfileLink
                  address={account.identity.address}
                  nickname={account.identity.nickname}
                  className="text-sm underline-offset-2 hover:underline"
                >
                  {m.mod_view_profile()}
                </ProfileLink>
              ) : null}
            </div>
          </div>
        </div>

        <div className="order-2 min-w-0">
          <Reports
            reports={data.reports}
            collections={data.tradeCollections}
            targetName={name}
            userId={userId}
            selectedReport={selectedReport}
          />
        </div>
        {data.trades.length > 0 ? (
          <div className="order-2 min-w-0">
            <AttachedTrades
              trades={data.trades}
              collections={data.tradeCollections}
              targetName={name}
            />
          </div>
        ) : null}
      </div>

      <div className={pane}>
        <div className="order-1 min-w-0">
          <Signals data={data} />
        </div>
        <div className="order-3 flex min-w-0 flex-col gap-6">
          {staff && !viewerIsAdmin ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm text-pretty">
              {m.mod_staff_target()}
            </p>
          ) : (
            <ActForm userId={account.userId} name={name} />
          )}
          {viewerIsAdmin && !roleList(account.role).includes("admin") ? (
            <RoleControl userId={account.userId} name={name} isModerator={staff} />
          ) : null}
        </div>
        <div className="order-4 min-w-0">
          <Sanctions sanctions={data.sanctions} staffTarget={staff && !viewerIsAdmin} />
        </div>
        <div className="order-5 min-w-0">
          <Audit audit={data.audit} />
        </div>
      </div>
    </div>
  );
}

/** Also the route's pending view. */
export function ModAccountSkeleton() {
  return (
    <div className="flex flex-col gap-4 xl:col-span-2">
      <PendingStatus />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}
