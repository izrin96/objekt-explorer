import { ArrowClockwiseIcon, ArrowLeftIcon, WarningIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { FLAG_CATEGORIES } from "@repo/api/schemas/chat";
import { type ExcerptOffer, isStaffRole, roleList } from "@repo/api/schemas/moderation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toastManager } from "@/components/ui/toast";
import { StatRow } from "@/features/objekt/drawer/stat-row";
import { offerNo, tradeNo, tradeStatusText } from "@/features/offers/format";
import { ItemLabel } from "@/features/offers/item-label";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { formatCurrency } from "@/features/settings/use-currency";
import { displayNickname } from "@/lib/address";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { formatTimestamp } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { ActForm } from "./act-form";
import { FLAG_LABEL, REASON_LABEL, SANCTION_LABEL, auditActionLabel, roleLabel } from "./labels";
import { accountOptions } from "./queries";
import { RevokeButton } from "./revoke-dialog";
import { When } from "./when";

type Account = Outputs["moderation"]["account"];
type Person = Account["reports"][number]["reporter"];

const sectionTitle = "text-muted-foreground text-xs font-medium tracking-wide uppercase";

function personName(person: Person) {
  return person?.identity?.name ?? m.mod_person_gone();
}

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
                nickname={name}
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

function Signals({ data }: { data: Account }) {
  // the viewer's zone, as every other time on the page; empty until hydrated
  const hydrated = useHydrated();
  const active = data.sanctions.filter((sanction) => sanction.active);
  return (
    <section aria-labelledby="mod-signals" className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 id="mod-signals" className={sectionTitle}>
        {m.mod_signals()}
      </h2>
      <StatRow
        className="grid-cols-2 sm:grid-cols-4"
        stats={[
          {
            label: m.mod_signal_joined(),
            value: hydrated ? formatTimestamp(new Date(data.account.createdAt)).slice(0, 10) : "",
          },
          { label: m.mod_signal_starts(), value: data.startsLast24h.toLocaleString() },
          ...FLAG_CATEGORIES.map((category) => ({
            label: FLAG_LABEL[category](),
            value: data.flags[category].toLocaleString(),
          })),
        ]}
      />
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">{m.mod_signal_addresses()}</span>
        {data.addresses.length === 0 ? (
          <span className="text-muted-foreground">{m.mod_signal_no_addresses()}</span>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {data.addresses.map((address) => (
              <li key={address.address} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium break-all">
                  {displayNickname(address.address, address.nickname)}
                </span>
                {address.linkedAt ? (
                  <span className="text-muted-foreground text-xs">
                    {m.mod_signal_linked()}{" "}
                    <When iso={address.linkedAt} className="font-mono tabular-nums" />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <span className="text-muted-foreground mt-1 text-xs">
          {active.length > 0
            ? m.mod_signal_active({
                list: active.map((sanction) => SANCTION_LABEL[sanction.type]()).join(", "),
              })
            : m.mod_signal_none_active()}
        </span>
      </div>
    </section>
  );
}

function Reports({
  reports,
  collections,
  targetName,
}: {
  reports: Account["reports"];
  collections: Account["tradeCollections"];
  targetName: string;
}) {
  return (
    <section aria-labelledby="mod-reports" className="flex flex-col gap-3">
      <h2 id="mod-reports" className={sectionTitle}>
        {m.mod_reports_heading({ count: reports.length })}
      </h2>
      {reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_reports_none()}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.id} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold">{REASON_LABEL[report.reason]()}</span>
                <Badge variant={report.status === "open" ? "outline" : "secondary"} size="sm">
                  {report.status === "open"
                    ? m.mod_status_open()
                    : report.status === "dismissed"
                      ? m.mod_status_dismissed()
                      : m.mod_status_actioned()}
                </Badge>
                <span className="text-muted-foreground">
                  {m.mod_report_by({ name: personName(report.reporter) })}
                </span>
                <When
                  iso={report.createdAt}
                  className="text-muted-foreground font-mono text-xs tabular-nums"
                />
              </div>
              {report.note ? (
                <p className="text-sm text-pretty break-words whitespace-pre-wrap">{report.note}</p>
              ) : null}
              {report.excerpt ? (
                <Excerpt
                  entries={report.excerpt}
                  collections={collections}
                  targetName={targetName}
                  reporterName={personName(report.reporter)}
                />
              ) : (
                <p className="text-muted-foreground text-xs">
                  {report.fromConversation ? m.mod_excerpt_not_shared() : m.mod_excerpt_profile()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The only message text moderators ever see: the copy a reporter chose to share. */
function Excerpt({
  entries,
  collections,
  targetName,
  reporterName,
}: {
  entries: NonNullable<Account["reports"][number]["excerpt"]>;
  collections: Account["tradeCollections"];
  targetName: string;
  reporterName: string;
}) {
  return (
    <details className="group rounded-md border">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer px-3 py-2 text-xs font-medium">
        {m.mod_excerpt_summary({ count: entries.length })}
      </summary>
      <ol className="flex flex-col gap-2 border-t px-3 py-3">
        {entries.map((entry, i) => (
          <li key={i} className="flex flex-col gap-0.5 text-sm">
            <span className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className={entry.fromTarget ? "text-foreground font-medium" : undefined}>
                {entry.fromTarget ? targetName : reporterName}
              </span>
              <When iso={entry.at} className="font-mono tabular-nums" />
            </span>
            {entry.body ? <p className="break-words whitespace-pre-wrap">{entry.body}</p> : null}
            {entry.card ? (
              <p className="text-muted-foreground font-mono text-xs break-all">
                {m.mod_excerpt_card({ slug: entry.card.collectionSlug })}
              </p>
            ) : null}
            {entry.offer ? (
              <ExcerptOfferView
                offer={entry.offer}
                collections={collections}
                targetName={targetName}
                reporterName={reporterName}
              />
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}

const OFFER_STATUS_LABEL: Record<ExcerptOffer["status"], () => string> = {
  open: m.mod_excerpt_offer_open,
  accepted: m.offer_status_accepted,
  declined: m.offer_status_declined,
  countered: m.offer_status_countered,
  withdrawn: m.offer_status_withdrawn,
  expired: m.offer_status_expired,
  cancelled: m.offer_status_cancelled,
};

/** The offer as it stood when the report was filed, told from the reported account's side. */
function ExcerptOfferView({
  offer,
  collections,
  targetName,
  reporterName,
}: {
  offer: ExcerptOffer;
  collections: Account["tradeCollections"];
  targetName: string;
  reporterName: string;
}) {
  const sides = [
    { key: "give", label: m.mod_excerpt_offer_gives({ name: targetName }), items: offer.give },
    { key: "get", label: m.mod_excerpt_offer_gets({ name: targetName }), items: offer.get },
  ] as const;
  const { topup } = offer;

  return (
    <div className="bg-secondary/40 flex flex-col gap-2 rounded-md border p-2.5 text-xs">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-mono font-medium">{offerNo(offer.offerId)}</span>
        <Badge variant="outline" size="sm">
          {OFFER_STATUS_LABEL[offer.status]()}
        </Badge>
      </p>
      {sides.map((side) => (
        <div key={side.key} className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">{side.label}</span>
          {side.items.length === 0 ? (
            <span>{m.offer_side_nothing()}</span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {side.items.map((item) => (
                <li key={item.objektId ?? `any:${item.collectionSlug}`} className="break-words">
                  <ItemLabel item={item} collections={collections} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {topup ? (
        <p>
          {m.mod_excerpt_offer_topup({
            name: topup.payer === "target" ? targetName : reporterName,
            amount: formatCurrency(Number(topup.amount), topup.currency),
          })}
        </p>
      ) : null}
      {offer.note ? (
        <p className="text-pretty break-words whitespace-pre-wrap">
          <span className="text-muted-foreground">{m.mod_excerpt_offer_note()} </span>
          {offer.note}
        </p>
      ) : null}
    </div>
  );
}

/** Trades attached to this account's open reports: legs, states and hashes, no message text. */
function AttachedTrades({
  trades,
  collections,
  targetName,
}: {
  trades: Account["trades"];
  collections: Account["tradeCollections"];
  targetName: string;
}) {
  if (trades.length === 0) return null;
  return (
    <section aria-labelledby="mod-trades" className="flex flex-col gap-3">
      <h2 id="mod-trades" className={sectionTitle}>
        {m.mod_trades_heading({ count: trades.length })}
      </h2>
      <ul className="flex flex-col gap-3">
        {trades.map((trade) => {
          const other = trade.other?.identity?.name ?? m.mod_person_gone();
          return (
            <li key={trade.id} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold tabular-nums">{tradeNo(trade.id)}</span>
                <Badge variant="outline" size="sm">
                  {tradeStatusText(trade.status)}
                </Badge>
                <span className="text-muted-foreground">{m.mod_trade_with({ name: other })}</span>
                <span className="text-muted-foreground text-xs">
                  {m.offer_trade_accepted()}{" "}
                  <When iso={trade.acceptedAt} className="font-mono tabular-nums" />
                </span>
              </div>
              <ul className="flex flex-col divide-y rounded-md border">
                {trade.legs.map((leg) => (
                  <li key={leg.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">
                        <ItemLabel item={leg} collections={collections} />
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {leg.fromTarget
                          ? m.mod_trade_direction({ from: targetName, to: other })
                          : m.mod_trade_direction({ from: other, to: targetName })}
                      </span>
                      <Badge variant="outline" size="sm">
                        {leg.state === "verified"
                          ? m.offer_leg_verified()
                          : leg.state === "waiting"
                            ? m.offer_leg_waiting()
                            : m.offer_leg_closed()}
                      </Badge>
                    </span>
                    {leg.txHash ? (
                      <span className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
                        <span className="font-mono break-all">{leg.txHash}</span>
                        {leg.verifiedAt ? (
                          <When iso={leg.verifiedAt} className="font-mono tabular-nums" />
                        ) : null}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Sanctions({
  sanctions,
  staffTarget,
}: {
  sanctions: Account["sanctions"];
  staffTarget: boolean;
}) {
  return (
    <section aria-labelledby="mod-sanctions" className="flex flex-col gap-3">
      <h2 id="mod-sanctions" className={sectionTitle}>
        {m.mod_sanctions_heading()}
      </h2>
      {sanctions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_sanctions_none()}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {sanctions.map((sanction) => (
            <li key={sanction.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{SANCTION_LABEL[sanction.type]()}</span>
                  {sanction.active ? (
                    <Badge variant="outline" size="sm">
                      {m.mod_sanction_active()}
                    </Badge>
                  ) : sanction.revokedAt ? (
                    <Badge variant="secondary" size="sm">
                      {m.mod_sanction_revoked()}
                    </Badge>
                  ) : null}
                </span>
                <span className="text-pretty break-words">{sanction.reason}</span>
                <span className="text-muted-foreground text-xs">
                  {m.mod_sanction_by({ name: personName(sanction.issuedBy) })}{" "}
                  <When iso={sanction.createdAt} className="font-mono tabular-nums" />
                  {sanction.expiresAt ? (
                    <>
                      {" · "}
                      {m.mod_sanction_ends()}{" "}
                      <When iso={sanction.expiresAt} className="font-mono tabular-nums" />
                    </>
                  ) : null}
                </span>
              </div>
              {sanction.active && !staffTarget ? (
                <RevokeButton sanctionId={sanction.id} label={SANCTION_LABEL[sanction.type]()} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Audit({ audit }: { audit: Account["audit"] }) {
  return (
    <section aria-labelledby="mod-audit" className="flex flex-col gap-3">
      <h2 id="mod-audit" className={sectionTitle}>
        {m.mod_audit_heading()}
      </h2>
      {audit.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_audit_none()}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {audit.map((entry) => {
            const reason =
              typeof entry.detail?.reason === "string" ? entry.detail.reason : undefined;
            const role = typeof entry.detail?.role === "string" ? entry.detail.role : undefined;
            return (
              <li key={entry.id} className="flex flex-col gap-0.5 text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{auditActionLabel(entry.action)}</span>
                  {role ? <span className="text-muted-foreground">→ {roleLabel(role)}</span> : null}
                  <span className="text-muted-foreground">
                    {entry.actor ? personName(entry.actor) : m.mod_audit_system()}
                  </span>
                  <When
                    iso={entry.createdAt}
                    className="text-muted-foreground font-mono text-xs tabular-nums"
                  />
                </span>
                {reason ? (
                  <span className="text-muted-foreground text-pretty break-words">{reason}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function roleErrorText(error: unknown) {
  const { reason } = errorReason(error);
  if (reason === "self") return m.mod_error_self();
  if (reason === "staff_target") return m.mod_staff_target();
  return m.mod_role_error();
}

/** Granting or removing a staff role changes who can sanction anyone, so it asks once more. */
function RoleControl({
  userId,
  name,
  isModerator,
}: {
  userId: string;
  name: string;
  isModerator: boolean;
}) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const setRole = useMutation(
    orpc.moderation.setRole.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.moderation.key() });
        toastManager.add({ type: "success", title: m.mod_role_saved() });
      },
      onError: (error) => toastManager.add({ type: "error", title: roleErrorText(error) }),
    }),
  );

  return (
    <section aria-labelledby="mod-role" className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 id="mod-role" className={sectionTitle}>
        {m.mod_role_heading()}
      </h2>
      <p className="text-muted-foreground text-sm text-pretty">
        {isModerator ? m.mod_role_is_moderator() : m.mod_role_is_user()}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        loading={setRole.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {isModerator ? m.mod_role_remove() : m.mod_role_grant()}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogPopup className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {isModerator
                ? m.mod_role_remove_confirm({ name })
                : m.mod_role_grant_confirm({ name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isModerator ? m.mod_role_remove_desc() : m.mod_role_grant_desc()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {m.common_modal_cancel()}
            </AlertDialogClose>
            <AlertDialogClose
              render={<Button />}
              onClick={() => setRole.mutate({ userId, role: isModerator ? "user" : "moderator" })}
            >
              {isModerator ? m.mod_role_remove() : m.mod_role_grant()}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </section>
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
