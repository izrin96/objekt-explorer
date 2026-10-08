import { ArrowClockwiseIcon, ArrowLeftIcon, WarningIcon } from "@phosphor-icons/react";
import { isStaffRole, roleList } from "@repo/api/schemas/moderation";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
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

export function ModAccount({ userId, viewerIsAdmin }: { userId: string; viewerIsAdmin: boolean }) {
  const query = useQuery(accountOptions(userId));

  if (query.isPending) return <ModAccountSkeleton />;

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

  const data = query.data;
  const { account } = data;
  const name = account.identity.name;
  const staff = isStaffRole(account.role);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="-ms-2 self-start"
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
          <PageHeader title={name} />
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

      <Signals data={data} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_--spacing(96)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Reports reports={data.reports} collections={data.tradeCollections} targetName={name} />
          <AttachedTrades
            trades={data.trades}
            collections={data.tradeCollections}
            targetName={name}
          />
          <Sanctions sanctions={data.sanctions} staffTarget={staff && !viewerIsAdmin} />
          <Audit audit={data.audit} />
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
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
        </aside>
      </div>
    </>
  );
}

/** Also the route's pending view. */
export function ModAccountSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PendingStatus />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}
