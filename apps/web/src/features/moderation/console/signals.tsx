import { ArrowsLeftRightIcon, DotsThreeIcon, LinkBreakIcon } from "@phosphor-icons/react";
import { FLAG_CATEGORIES } from "@repo/api/schemas/chat";
import { truncateAddress } from "@repo/lib/address";
import { Link, useHydrated } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { FLAG_LABEL, SANCTION_LABEL } from "@/features/moderation/labels";
import { StatRow } from "@/features/objekt/drawer/stat-row";
import { displayNickname } from "@/lib/address";
import { formatTimestamp } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { MoveAddressDialog } from "./move-address-dialog";
import { type Account, personName, sectionTitle } from "./shared";
import { UnlinkAddressDialog } from "./unlink-address-dialog";
import { When } from "./when";

/** The account's figures, under its name in the header. */
export function AccountStats({ data }: { data: Account }) {
  // the viewer's zone, as every other time on the page; empty until hydrated
  const hydrated = useHydrated();
  return (
    <StatRow
      className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      stats={[
        {
          label: m.mod_signal_joined(),
          value: hydrated ? formatTimestamp(new Date(data.account.createdAt)).slice(0, 10) : "",
        },
        {
          label: m.mod_signal_verified(),
          value: (data.reputation?.verified ?? 0).toLocaleString(),
        },
        {
          label: m.mod_signal_unfinished(),
          value: (data.reputation?.unfinished ?? 0).toLocaleString(),
        },
        { label: m.mod_signal_starts(), value: data.startsLast24h.toLocaleString() },
        ...FLAG_CATEGORIES.map((category) => ({
          label: FLAG_LABEL[category](),
          value: data.flags[category].toLocaleString(),
        })),
      ]}
    />
  );
}

export function LinkedProfiles({ data, viewerIsAdmin }: { data: Account; viewerIsAdmin: boolean }) {
  return (
    <section
      aria-labelledby="mod-addresses"
      className="bg-card flex flex-col gap-3 rounded-lg border p-4"
    >
      <h2 id="mod-addresses" className={sectionTitle}>
        {m.mod_signal_addresses()}
      </h2>
      {data.addresses.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_signal_no_addresses()}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {data.addresses.map((address) => (
            <li key={address.address} className="flex items-center gap-2">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium break-all">
                  {displayNickname(address.address, address.nickname)}
                </span>
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {truncateAddress(address.address)}
                  {address.linkedAt ? (
                    <>
                      {" · "}
                      {m.mod_signal_linked()} <When iso={address.linkedAt} />
                    </>
                  ) : null}
                </span>
              </span>
              <Link
                to="/mod/addresses/$address"
                params={{ address: address.address }}
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
              >
                {m.mod_signal_address_history()}
              </Link>
              {viewerIsAdmin ? (
                <AddressMenu address={address.address} userId={data.account.userId} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {data.sharedHolders.length > 0 ? (
        <div className="flex flex-col gap-1 border-t pt-3 text-sm">
          <span className="text-muted-foreground text-xs">{m.mod_signal_held_by()}</span>
          <ul className="flex flex-col gap-1">
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
                  <Badge variant="error" size="sm">
                    {SANCTION_LABEL[holder.sanctioned]()}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Move and Unlink are admin-only and rare, so they sit behind ⋯ rather than on every row. */
function AddressMenu({ address, userId }: { address: string; userId: string }) {
  const [open, setOpen] = useState<"move" | "unlink" | null>(null);
  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={m.mod_address_actions({ address: truncateAddress(address) })}
            />
          }
        >
          <DotsThreeIcon weight="bold" />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuItem onClick={() => setOpen("move")}>
            <ArrowsLeftRightIcon />
            {m.mod_address_move()}
          </MenuItem>
          <MenuItem variant="destructive" onClick={() => setOpen("unlink")}>
            <LinkBreakIcon />
            {m.mod_address_unlink()}
          </MenuItem>
        </MenuPopup>
      </Menu>
      <MoveAddressDialog
        address={address}
        userId={userId}
        open={open === "move"}
        onOpenChange={(next) => setOpen(next ? "move" : null)}
      />
      <UnlinkAddressDialog
        address={address}
        userId={userId}
        open={open === "unlink"}
        onOpenChange={(next) => setOpen(next ? "unlink" : null)}
      />
    </>
  );
}
