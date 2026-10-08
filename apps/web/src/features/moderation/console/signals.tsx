import { FLAG_CATEGORIES } from "@repo/api/schemas/chat";
import { useHydrated } from "@tanstack/react-router";

import { FLAG_LABEL, SANCTION_LABEL } from "@/features/moderation/labels";
import { StatRow } from "@/features/objekt/drawer/stat-row";
import { displayNickname } from "@/lib/address";
import { formatTimestamp } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { type Account, sectionTitle } from "./shared";
import { When } from "./when";

export function Signals({ data }: { data: Account }) {
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
