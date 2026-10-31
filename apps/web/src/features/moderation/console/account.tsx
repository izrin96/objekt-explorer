import { ArrowClockwiseIcon, ArrowLeftIcon, WarningIcon } from "@phosphor-icons/react";
import { isStaffRole, roleList, staffTargetRefused } from "@repo/api/schemas/moderation";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { SANCTION_LABEL, roleLabel } from "@/features/moderation/labels";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { ActForm } from "./act-form";
import { History } from "./history";
import { LinkHistory } from "./link-history";
import { accountOptions } from "./queries";
import { Reports } from "./reports";
import { RoleControl } from "./role-control";
import type { Account } from "./shared";
import { AccountStats, LinkedProfiles } from "./signals";
import { AttachedTrades } from "./trades";
import { When } from "./when";

// from `xl` the header spans both columns: the evidence, then the decision beside it
const accountFrame =
  "flex flex-col gap-6 xl:col-span-2 xl:grid xl:grid-cols-subgrid xl:items-start";

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
  const openReports = data.reports.filter((report) => report.status === "open").length;
  const refused = staffTargetRefused(account.role, viewerIsAdmin, "dismiss");
  const actForm = (props: { framed?: boolean; onDone?: () => void }) => (
    <ActForm
      userId={account.userId}
      name={name}
      openReports={openReports}
      deleted={account.deletedAt !== null}
      adminTarget={staffTargetRefused(account.role, viewerIsAdmin, "sanction")}
      {...props}
    />
  );

  return (
    <div className={accountFrame}>
      <Button
        variant="ghost"
        size="sm"
        className="-ms-2 self-start xl:hidden"
        render={<Link to="/mod/reports" />}
      >
        <ArrowLeftIcon />
        {m.mod_back_to_queue()}
      </Button>

      <AccountHeader data={data} />

      <div className="flex min-w-0 flex-col gap-6">
        {/* keyed, so another account or a linked report opens on the tab that holds it */}
        <Reports
          key={`${userId}:${selectedReport ?? ""}`}
          reports={data.reports}
          collections={data.tradeCollections}
          targetName={name}
          userId={userId}
          selectedReport={selectedReport}
        />
        <AttachedTrades
          trades={data.trades}
          collections={data.tradeCollections}
          targetName={name}
        />
        <History
          sanctions={data.sanctions}
          audit={data.audit}
          staffTarget={staffTargetRefused(account.role, viewerIsAdmin, "revoke")}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        {refused ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm text-pretty">
            {m.mod_staff_target()}
          </p>
        ) : (
          // below `xl` the form lives in the phone bar's drawer
          <div className="max-xl:hidden">{actForm({})}</div>
        )}
        <LinkedProfiles data={data} viewerIsAdmin={viewerIsAdmin} />
        <LinkHistory userId={userId} history={data.linkHistory} />
        {viewerIsAdmin && !roleList(account.role).includes("admin") ? (
          <RoleControl
            userId={account.userId}
            name={name}
            isModerator={isStaffRole(account.role)}
          />
        ) : null}
      </div>

      {refused ? null : (
        <ActionBar openReports={openReports} name={name}>
          {actForm}
        </ActionBar>
      )}
    </div>
  );
}

/** Who this is and what holds on them now: roles, state and active sanctions, then the figures. */
function AccountHeader({ data }: { data: Account }) {
  const { account } = data;
  const name = account.identity.name;
  const active = data.sanctions.filter((sanction) => sanction.active);
  const warnings = data.sanctions.filter((sanction) => sanction.type === "warn").length;
  // an active ban already says it
  const bannedBadge = account.banned && !active.some((sanction) => sanction.type === "ban");

  return (
    <section
      aria-labelledby="mod-account-name"
      className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:p-5 xl:col-span-2"
    >
      <div className="flex items-center gap-3">
        <PersonAvatar name={name} image={account.user.image} className="size-12 shrink-0" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              id="mod-account-name"
              className="font-display text-xl font-semibold tracking-tight text-balance break-words"
            >
              {name}
            </h2>
            {account.identity.address ? (
              <ProfileLink
                address={account.identity.address}
                nickname={account.identity.nickname}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
              >
                {m.mod_view_profile()}
              </ProfileLink>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {roleList(account.role)
              .filter((role) => role !== "user")
              .map((role) => (
                <Badge key={role} variant="outline" size="sm">
                  {roleLabel(role)}
                </Badge>
              ))}
            {account.deletedAt ? (
              <Badge variant="outline" size="sm">
                {m.mod_account_deleted()}
                <When iso={account.deletedAt} className="text-muted-foreground tabular-nums" />
              </Badge>
            ) : null}
            {bannedBadge ? (
              <Badge variant="destructive" size="sm">
                {m.mod_banned()}
              </Badge>
            ) : null}
            {active.map((sanction) => (
              <Badge
                key={sanction.id}
                variant={sanction.type === "ban" ? "destructive" : "warning"}
                size="sm"
              >
                {SANCTION_LABEL[sanction.type]()}
                {sanction.expiresAt ? (
                  <>
                    {" · "}
                    {m.mod_sanction_ends()}{" "}
                    <When iso={sanction.expiresAt} className="tabular-nums" />
                  </>
                ) : null}
              </Badge>
            ))}
            {warnings > 0 ? (
              <Badge variant="outline" size="sm" className="text-muted-foreground tabular-nums">
                {m.mod_warnings_before({ count: warnings.toLocaleString(getLocale()) })}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
      <div className="border-t pt-4">
        <AccountStats data={data} />
      </div>
    </section>
  );
}

/**
 * Below `xl` the form would sit under every report, so the phone keeps Take action in a bar
 * at the bottom and opens the form in a drawer.
 */
function ActionBar({
  openReports,
  name,
  children,
}: {
  openReports: number;
  name: string;
  children: (props: { framed: boolean; onDone: () => void }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* -mx-5 -mb-10 undo PageMain's px-5 pb-10, so the bar spans the screen and sits flush */}
      <div className="bg-background sticky bottom-0 -mx-5 -mb-10 flex items-center gap-3 border-t px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(4))] xl:hidden">
        <span className="text-muted-foreground min-w-0 flex-1 text-sm tabular-nums">
          {m.mod_queue_open({ count: openReports.toLocaleString(getLocale()) })}
        </span>
        <Button size="lg" onClick={() => setOpen(true)}>
          {m.mod_act_heading()}
        </Button>
      </div>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerPopup showCloseButton>
          <DrawerHeader className="pe-13">
            <DrawerTitle className="font-display">{m.mod_act_heading()}</DrawerTitle>
            <DrawerDescription>
              {name} · {m.mod_act_resolves({ count: openReports.toLocaleString(getLocale()) })}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerPanel>{children({ framed: false, onDone: () => setOpen(false) })}</DrawerPanel>
        </DrawerPopup>
      </Drawer>
    </>
  );
}

/** Also the route's pending view. */
export function ModAccountSkeleton() {
  return (
    <div className="flex flex-col gap-4 xl:col-span-2">
      <PendingStatus />
      <Skeleton className="h-36 rounded-lg" />
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_--spacing(80)]">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}
