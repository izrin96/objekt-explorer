import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import type { StaffTrade } from "@repo/api/schemas/staff-totals";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ItemLabel } from "@/features/offers/item-label";
import { explorerTxUrl } from "@/lib/explorer";
import { m } from "@/paraglide/messages";

import { LegCopyLine, LegStateBadge } from "../console/trades";
import { When } from "../console/when";
import { Slotted, TableFrame } from "./parts";

export function TxLink({ hash }: { hash: string }) {
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

export function LegsTable({
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
