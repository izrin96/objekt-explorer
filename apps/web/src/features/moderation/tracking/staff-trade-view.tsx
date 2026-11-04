import { ArrowSquareOutIcon, CaretLeftIcon } from "@phosphor-icons/react";
import type { StaffTrade } from "@repo/api/schemas/staff-totals";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { serialText, tradeNo, tradeStatusText } from "@/features/offers/format";
import { ItemLabel } from "@/features/offers/item-label";
import { explorerTxUrl } from "@/lib/explorer";
import { m } from "@/paraglide/messages";

import { LegCopyLine, LegStateBadge } from "../console/trades";
import { When } from "../console/when";
import { SANCTION_LABEL } from "../labels";
import { TRADE_STATUS_BADGE, tradeEndText } from "./labels";
import { LoadFailed, PersonLink, Slotted, TableFrame } from "./parts";
import { staffTradeOptions } from "./queries";

type Row = StaffTrade["timeline"][number];

function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={explorerTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={m.mod_staff_trade_explorer({ hash })}
      className="inline-flex max-w-48 items-center gap-1 font-mono text-xs hover:underline"
    >
      <span className="truncate">{hash}</span>
      <ArrowSquareOutIcon className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

function BackLink() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="self-start"
      render={<Link to="/mod/trades" search={{ days: 30 }} />}
    >
      <CaretLeftIcon />
      {m.mod_trades_title()}
    </Button>
  );
}

/** One trade as staff see it: no offer note, no message, whoever the parties are. */
export function StaffTradeView({ tradeId }: { tradeId: number }) {
  const query = useQuery(staffTradeOptions(tradeId));
  if (query.isPending) return <StaffTradeSkeleton />;
  if (query.isError) return <LoadFailed onRetry={() => void query.refetch()} />;
  return <TradeBody trade={query.data} />;
}

function TradeBody({ trade }: { trade: StaffTrade }) {
  const people = new Map(trade.parties.map((party) => [party.person.userId, party.person]));
  const nameOf = (userId: string | null) =>
    (userId === null ? null : people.get(userId)?.name) ?? m.mod_person_gone();
  const legOf = new Map(trade.legs.map((leg) => [leg.id, leg]));
  const reason = tradeEndText(trade.status, trade.cancelReason);
  const [first, second] = trade.parties;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackLink />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-display text-xl font-semibold tracking-tight">
              <Slotted
                text={(trade) => m.mod_staff_trade_title({ trade })}
                node={<span className="font-mono">{tradeNo(trade.id)}</span>}
              />
            </h1>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
              <span>
                {m.offer_trade_accepted()} <When iso={trade.acceptedAt} className="tabular-nums" />
              </span>
              {first && second ? (
                <>
                  <span aria-hidden>·</span>
                  <Party party={first} />
                  <span aria-hidden>·</span>
                  <Party party={second} />
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge size="lg" variant={TRADE_STATUS_BADGE[trade.status]}>
              {tradeStatusText(trade.status)}
            </Badge>
            {reason === null ? null : (
              <span className="text-muted-foreground text-xs">{reason}</span>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{m.mod_staff_trade_no_text()}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_--spacing(88)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="staff-legs" className="flex flex-col gap-2">
            <h2 id="staff-legs" className="text-sm font-semibold">
              {m.mod_staff_trade_legs()}
            </h2>
            <LegsTable trade={trade} nameOf={nameOf} />
          </section>
          {trade.copies.length === 0 ? null : (
            <section aria-labelledby="staff-copies" className="flex flex-col gap-2">
              <h2 id="staff-copies" className="text-sm font-semibold">
                {m.mod_staff_trade_copies()}
              </h2>
              <ul className="flex flex-col divide-y rounded-md border text-sm">
                {trade.copies.map((copy) => {
                  const leg = legOf.get(copy.legId);
                  return (
                    <li key={copy.id} className="flex flex-col gap-0.5 px-3 py-2">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        {leg ? (
                          <span className="font-medium">
                            <ItemLabel item={leg} collections={trade.collections} />
                          </span>
                        ) : null}
                        <Badge
                          variant={copy.status === "pending" ? "warning" : "outline"}
                          size="sm"
                        >
                          {copy.status === "pending"
                            ? m.mod_staff_trade_copy_pending()
                            : copy.status === "accepted"
                              ? copy.autoAccepted
                                ? m.offer_leg_auto_accepted()
                                : m.mod_staff_trade_copy_accepted()
                              : m.mod_staff_trade_copy_declined()}
                        </Badge>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {m.mod_staff_trade_copy_line({
                          sent: serialText({
                            serial: copy.serial,
                            estimated: copy.serialEstimated,
                          }),
                          asked: serialText({
                            serial: leg?.serial ?? null,
                            estimated: leg?.serialEstimated ?? false,
                          }),
                        })}
                        {" · "}
                        <When iso={copy.transferredAt} className="tabular-nums" />
                      </span>
                      {copy.status === "pending" && copy.acceptBy !== null ? (
                        <span className="text-muted-foreground text-xs">
                          <Slotted
                            text={(time) => m.mod_trades_detail_copy({ time })}
                            node={<When iso={copy.acceptBy} className="tabular-nums" />}
                          />
                        </span>
                      ) : null}
                      <TxLink hash={copy.txHash} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {trade.cancelRequests.length === 0 ? null : (
            <section aria-labelledby="staff-requests" className="flex flex-col gap-2">
              <h2 id="staff-requests" className="text-sm font-semibold">
                {m.mod_staff_trade_requests()}
              </h2>
              <ul className="flex flex-col divide-y rounded-md border text-sm">
                {trade.cancelRequests.map((ask) => (
                  <li
                    key={`${ask.askedBy}-${ask.askedAt}`}
                    className="flex flex-wrap items-baseline gap-x-2 px-3 py-2"
                  >
                    <span>{m.mod_staff_trade_request_by({ name: nameOf(ask.askedBy) })}</span>
                    <When
                      iso={ask.askedAt}
                      className="text-muted-foreground text-xs tabular-nums"
                    />
                    <Badge variant={ask.status === "pending" ? "warning" : "outline"} size="sm">
                      {REQUEST_STATUS[ask.status]()}
                    </Badge>
                    {ask.answeredAt === null ? null : (
                      <When
                        iso={ask.answeredAt}
                        className="text-muted-foreground text-xs tabular-nums"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section aria-labelledby="staff-timeline" className="flex flex-col gap-2">
          <h2 id="staff-timeline" className="text-sm font-semibold">
            {m.mod_staff_trade_timeline()}
          </h2>
          <ol className="flex flex-col gap-3 border-s ps-4">
            {trade.timeline.map((row, i) => {
              const leg = row.legId === null ? undefined : legOf.get(row.legId);
              return (
                <li key={`${row.kind}-${row.legId ?? ""}-${i}`} className="flex flex-col text-sm">
                  <When iso={row.at} className="text-muted-foreground text-xs tabular-nums" />
                  <span>{timelineText(row, nameOf)}</span>
                  {leg ? (
                    <span className="text-muted-foreground text-xs">
                      <ItemLabel item={leg} collections={trade.collections} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}

const REQUEST_STATUS: Record<StaffTrade["cancelRequests"][number]["status"], () => string> = {
  pending: m.mod_staff_trade_request_pending,
  accepted: m.mod_staff_trade_request_accepted,
  declined: m.mod_staff_trade_request_declined,
  withdrawn: m.mod_staff_trade_request_withdrawn,
  lapsed: m.mod_staff_trade_request_lapsed,
};

function Party({ party }: { party: StaffTrade["parties"][number] }) {
  return (
    <span className="inline-flex items-center gap-1">
      <PersonLink person={party.person} />
      {party.sanctions.map((type) => (
        <Badge key={type} variant="error" size="sm">
          {SANCTION_LABEL[type]()}
        </Badge>
      ))}
    </span>
  );
}

function timelineText(row: Row, nameOf: (userId: string | null) => string) {
  const name = nameOf(row.userId);
  switch (row.kind) {
    case "proposed":
      return m.mod_staff_trade_tl_proposed();
    case "accepted":
      return m.mod_staff_trade_tl_accepted();
    case "leg_verified":
      return m.mod_staff_trade_tl_leg_verified({ name });
    case "leg_confirmed":
      return m.mod_staff_trade_tl_leg_confirmed({ name });
    case "leg_away":
      return m.mod_staff_trade_tl_leg_away({ name });
    case "leg_stuck":
      return m.mod_staff_trade_tl_leg_stuck({ name });
    case "copy_sent":
      return m.mod_staff_trade_tl_copy_sent({ name });
    case "copy_accepted":
      return row.auto
        ? m.mod_staff_trade_tl_copy_auto()
        : m.mod_staff_trade_tl_copy_accepted({ name });
    case "copy_declined":
      return m.mod_staff_trade_tl_copy_declined({ name });
    case "cancel_asked":
      return m.mod_staff_trade_tl_cancel_asked({ name });
    case "cancel_accepted":
      return m.mod_staff_trade_tl_cancel_accepted({ name });
    case "cancel_declined":
      return m.mod_staff_trade_tl_cancel_declined({ name });
    case "cancel_withdrawn":
      return m.mod_staff_trade_tl_cancel_withdrawn({ name });
    case "cancel_lapsed":
      return m.mod_staff_trade_tl_cancel_lapsed({ name });
    case "completed":
      return m.mod_staff_trade_tl_completed();
    case "cancelled": {
      const why = tradeEndText("cancelled", row.reason);
      const who =
        row.userId === null
          ? m.mod_staff_trade_tl_cancelled()
          : m.mod_staff_trade_tl_cancelled_by({ name });
      return why === null ? who : `${who} · ${why}`;
    }
    case "failed":
      return tradeEndText("failed", row.reason) ?? m.offer_trade_failed();
  }
}

function LegsTable({
  trade,
  nameOf,
}: {
  trade: StaffTrade;
  nameOf: (userId: string | null) => string;
}) {
  return (
    <TableFrame>
      <Table variant="card">
        <TableHeader>
          <TableRow>
            <TableHead>{m.mod_staff_trade_col_from_to()}</TableHead>
            <TableHead>{m.mod_staff_trade_col_objekt()}</TableHead>
            <TableHead>{m.mod_staff_trade_col_state()}</TableHead>
            <TableHead>{m.mod_staff_trade_col_transfer()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trade.legs.map((leg) => (
            <TableRow key={leg.id}>
              <TableCell>
                {m.mod_trade_direction({
                  from: nameOf(leg.fromUserId),
                  to: nameOf(leg.toUserId),
                })}
              </TableCell>
              <TableCell>
                <span className="flex flex-col gap-0.5">
                  <ItemLabel item={leg} collections={trade.collections} />
                  <LegCopyLine leg={leg} />
                </span>
              </TableCell>
              <TableCell>
                <span className="flex flex-col items-start gap-0.5">
                  {leg.confirmedAt === null ? (
                    <LegStateBadge state={leg.state} />
                  ) : (
                    <Badge variant="outline" size="sm">
                      {m.offer_leg_confirmed()}
                    </Badge>
                  )}
                  {leg.breaksAt === null ? null : (
                    <span className="text-warning-foreground text-xs">
                      <Slotted
                        text={(time) => m.mod_staff_trade_away({ time })}
                        node={<When iso={leg.breaksAt} className="tabular-nums" />}
                      />
                    </span>
                  )}
                  {leg.untransferableAt === null || leg.state !== "waiting" ? null : (
                    <span className="text-warning-foreground text-xs">{m.offer_leg_stuck()}</span>
                  )}
                </span>
              </TableCell>
              <TableCell>
                {leg.txHash === null ? (
                  <span className="text-muted-foreground text-xs">
                    {m.mod_staff_trade_no_transfer()}
                  </span>
                ) : (
                  <span className="flex flex-col gap-0.5">
                    <TxLink hash={leg.txHash} />
                    {leg.verifiedAt === null ? null : (
                      <When
                        iso={leg.verifiedAt}
                        className="text-muted-foreground text-xs tabular-nums"
                      />
                    )}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  );
}

export function StaffTradeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_--spacing(88)]">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}
