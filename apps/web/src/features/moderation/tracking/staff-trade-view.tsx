import type { StaffTrade } from "@repo/api/schemas/staff-totals";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { serialText } from "@/features/offers/format";
import { ItemLabel } from "@/features/offers/item-label";
import { m } from "@/paraglide/messages";

import { When } from "../console/when";
import { LoadFailed, Slotted } from "./parts";
import { staffTradeOptions } from "./queries";
import { StaffTradeHeader } from "./staff-trade-header";
import { LegsTable, TxLink } from "./staff-trade-legs";
import { StaffTradeTimeline } from "./staff-trade-timeline";

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

  return (
    <div className="flex flex-col gap-6">
      <StaffTradeHeader trade={trade} />

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

        <StaffTradeTimeline trade={trade} legOf={legOf} nameOf={nameOf} />
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
