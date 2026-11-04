import type { StaffDays, TradeAttention } from "@repo/api/schemas/staff-totals";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tradeNo } from "@/features/offers/format";
import { m } from "@/paraglide/messages";

import { When } from "../console/when";
import { ATTENTION_BADGE, ATTENTION_DETAIL, ATTENTION_LABEL } from "./labels";
import { count, LoadFailed, PersonLink, Slotted, TableFrame } from "./parts";
import { tradeAttentionOptions } from "./queries";

export function Attention({ days }: { days: StaffDays }) {
  const query = useQuery(tradeAttentionOptions(days));
  if (query.isPending) return <Skeleton className="h-40 rounded-lg" />;
  if (query.isError) return <LoadFailed onRetry={() => void query.refetch()} />;
  const { rows, total, repeatBreakers } = query.data;
  return (
    <>
      <section aria-labelledby="mod-attention" className="flex flex-col gap-2">
        <h2 id="mod-attention" className="text-sm font-semibold">
          {m.mod_trades_attention_title()}{" "}
          <span className="text-muted-foreground font-normal tabular-nums">{count(total)}</span>
        </h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
            {m.mod_trades_attention_empty()}
          </p>
        ) : (
          <AttentionTable rows={rows} />
        )}
        {total > rows.length ? (
          <p className="text-muted-foreground text-xs tabular-nums">
            {m.mod_trades_attention_capped({ shown: count(rows.length), total: count(total) })}
          </p>
        ) : null}
      </section>
      <section aria-labelledby="mod-breakers" className="flex flex-col gap-2">
        <h2 id="mod-breakers" className="text-sm font-semibold">
          {m.mod_trades_breakers_title()}
        </h2>
        {repeatBreakers.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.mod_trades_breakers_empty()}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {repeatBreakers.map((row) => (
              <li key={row.person.userId} className="flex items-center gap-2">
                <PersonLink person={row.person} />
                <span className="text-muted-foreground tabular-nums">
                  {m.mod_trades_breakers_count({ count: count(row.failed) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function AttentionTable({ rows }: { rows: TradeAttention["rows"] }) {
  return (
    <TableFrame>
      <Table variant="card">
        <TableHeader>
          <TableRow>
            <TableHead>{m.mod_trades_col_trade()}</TableHead>
            <TableHead>{m.mod_trades_col_why()}</TableHead>
            <TableHead>{m.mod_trades_col_between()}</TableHead>
            <TableHead>{m.mod_trades_col_accepted()}</TableHead>
            <TableHead>{m.mod_trades_col_legs()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.tradeId}>
              <TableCell>
                {/* the link covers the row; the account links sit above it */}
                <Link
                  to="/mod/trades/$tradeId"
                  params={{ tradeId: String(row.tradeId) }}
                  className="font-mono text-xs font-medium after:absolute after:inset-0 hover:underline"
                >
                  {tradeNo(row.tradeId)}
                </Link>
              </TableCell>
              <TableCell>
                <ul className="flex flex-col gap-1">
                  {row.reasons.map((reason) => (
                    <li key={reason.reason} className="flex flex-wrap items-center gap-x-2">
                      <Badge variant={ATTENTION_BADGE[reason.reason]}>
                        {ATTENTION_LABEL[reason.reason]()}
                      </Badge>
                      {reason.at === null ? null : (
                        <span className="text-muted-foreground text-xs">
                          <Slotted
                            text={(time) => ATTENTION_DETAIL[reason.reason]({ time })}
                            node={<When iso={reason.at} className="tabular-nums" />}
                          />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </TableCell>
              <TableCell>
                <span className="flex flex-col">
                  {row.parties.map((person) => (
                    <PersonLink
                      key={person.userId}
                      person={person}
                      className="relative z-10 block max-w-48 truncate"
                    />
                  ))}
                </span>
              </TableCell>
              <TableCell>
                <When iso={row.acceptedAt} className="tabular-nums" />
              </TableCell>
              <TableCell className="tabular-nums">
                {m.offer_trade_step_progress({
                  verified: count(row.legsDone),
                  total: count(row.legsTotal),
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  );
}
