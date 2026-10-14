import type { DeletionCheck } from "@repo/api/schemas/user";
import { Link } from "@tanstack/react-router";
import { useId } from "react";

import { SANCTION_LABEL } from "@/features/moderation/labels";
import { formatTimestamp } from "@/lib/time";
import { m } from "@/paraglide/messages";

type Blocker = DeletionCheck["blockers"][number];

function BlockerRow({ blocker }: { blocker: Blocker }) {
  if (blocker.kind === "sanction") {
    return (
      <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
        <span className="text-sm font-medium">{SANCTION_LABEL[blocker.type]()}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {blocker.until
            ? m.auth_account_delete_sanction_until({
                date: formatTimestamp(new Date(blocker.until)),
              })
            : m.auth_account_delete_sanction_no_end()}
        </span>
      </li>
    );
  }
  return (
    <li>
      <Link
        to="/trade/mine/$tradeId"
        params={{ tradeId: String(blocker.tradeId) }}
        className="hover:bg-accent -mx-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md px-2 py-2"
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-sm tabular-nums">T-{blocker.tradeId}</span>
          <span className="truncate text-sm">{blocker.partner.name}</span>
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {blocker.cancelLocked
            ? m.auth_account_delete_cancel_locked({
                date: formatTimestamp(new Date(blocker.endsBy)),
              })
            : m.auth_account_delete_cancel_available()}
        </span>
      </Link>
    </li>
  );
}

export function DeletionBlockers({ blockers }: { blockers: Blocker[] }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-1">
      <h3 id={titleId} className="text-sm font-medium text-balance">
        {m.auth_account_delete_blockers_title()}
      </h3>
      <ul className="divide-y">
        {blockers.map((blocker, i) => (
          <BlockerRow
            key={blocker.kind === "trade" ? `t${blocker.tradeId}` : `s${i}`}
            blocker={blocker}
          />
        ))}
      </ul>
    </section>
  );
}
