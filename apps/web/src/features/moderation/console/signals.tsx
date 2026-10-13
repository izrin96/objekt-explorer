import { FLAG_CATEGORIES } from "@repo/api/schemas/chat";
import { Link, useHydrated } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { FLAG_LABEL, SANCTION_LABEL } from "@/features/moderation/labels";
import { StatRow } from "@/features/objekt/drawer/stat-row";
import { displayNickname } from "@/lib/address";
import { formatTimestamp } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { MoveAddressButton } from "./move-address-dialog";
import { type Account, personName, sectionTitle } from "./shared";
import { UnlinkAddressButton } from "./unlink-address-dialog";
import { When } from "./when";

export function Signals({ data, viewerIsAdmin }: { data: Account; viewerIsAdmin: boolean }) {
  // the viewer's zone, as every other time on the page; empty until hydrated
  const hydrated = useHydrated();
  const active = data.sanctions.filter((sanction) => sanction.active);
  return (
    <section aria-labelledby="mod-signals" className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 id="mod-signals" className={sectionTitle}>
        {m.mod_signals()}
      </h2>
      <StatRow
        className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 xl:*:border-s-0 xl:*:ps-0"
        stats={[
          {
            label: m.mod_signal_joined(),
            value: hydrated ? formatTimestamp(new Date(data.account.createdAt)).slice(0, 10) : "",
          },
          { label: m.mod_signal_starts(), value: data.startsLast24h.toLocaleString() },
          {
            label: m.mod_signal_verified(),
            value: (data.reputation?.verified ?? 0).toLocaleString(),
          },
          {
            label: m.mod_signal_unfinished(),
            value: (data.reputation?.unfinished ?? 0).toLocaleString(),
          },
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
                <Link
                  to="/mod/addresses/$address"
                  params={{ address: address.address }}
                  className="text-muted-foreground text-xs underline-offset-2 hover:underline"
                >
                  {m.mod_signal_address_history()}
                </Link>
                {viewerIsAdmin ? (
                  <span className="flex gap-1">
                    <MoveAddressButton address={address.address} userId={data.account.userId} />
                    <UnlinkAddressButton address={address.address} userId={data.account.userId} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {data.sharedHolders.length > 0 ? (
          <div className="mt-1 flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">{m.mod_signal_held_by()}</span>
            <ul className="flex flex-col gap-0.5">
              {data.sharedHolders.map((holder) => (
                <li key={holder.userId} className="flex flex-wrap items-center gap-x-2">
                  <Link
                    to="/mod/reports/$userId"
                    params={{ userId: holder.userId }}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {personName(holder)}
                  </Link>
                  {holder.sanctioned ? (
                    <Badge variant="destructive" size="sm">
                      {SANCTION_LABEL[holder.sanctioned]()}
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
