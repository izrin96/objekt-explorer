import {
  CaretRightIcon,
  ChatCircleIcon,
  DotsThreeIcon,
  HandshakeIcon,
  ListIcon,
} from "@phosphor-icons/react";
import type { MarketListing } from "@repo/api/schemas/market";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { getListLinkOption } from "@/features/list/list-link";
import { ProfileCell } from "@/features/profile/profile-hover-card";
import { formatCurrency } from "@/features/settings/use-currency";
import { formatTimestamp } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ObjektNote } from "../objekt-note";
import { listingPrice, sellerOf } from "./market-listing";

export type RowActions = {
  message: () => void;
  offer: () => void;
};

/** The app's one timestamp; a phone-width drawer keeps the day and leaves the time to `title`. */
function ListingTime({ date }: { date: Date }) {
  const full = formatTimestamp(date);
  const [day, ...time] = full.split(" ");
  return (
    <time dateTime={date.toISOString()} title={full}>
      <span className="whitespace-nowrap">{day}</span>
      <span className="whitespace-nowrap max-sm:hidden"> {time.join(" ")}</span>
    </time>
  );
}

/** The row's actions sit in one menu, so the table fits the drawer at phone width. */
export function MarketRow({
  item,
  currency,
  formatUsd,
  onOpenSerial,
  actions,
}: {
  item: MarketListing;
  /** the viewer's code; the conversion is only worth showing when the seller's differs */
  currency: string;
  formatUsd: (usd: number) => string;
  onOpenSerial: (serial: number) => void;
  /** null when the seller can't be messaged, and on the viewer's own listings */
  actions: RowActions | null;
}) {
  const { address, nickname, name: sellerName } = sellerOf(item);
  const { label, priced, converted } = listingPrice(item, currency, formatCurrency, formatUsd);

  return (
    <tr className="border-t">
      <td className="px-3 py-1.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          {item.note && <ObjektNote note={item.note} />}
          {/* a listing is set in the seller's currency, not the viewer's */}
          <span className={cn("tabular-nums", priced ? "font-medium" : "text-muted-foreground")}>
            {label}
          </span>
        </div>
        {converted !== null && (
          <div className="text-muted-foreground text-xs tabular-nums">≈{converted}</div>
        )}
      </td>
      <th scope="row" className="px-3 py-1.5 text-left font-normal">
        {item.serial === null ? (
          <span className="text-muted-foreground font-mono">—</span>
        ) : (
          <button
            type="button"
            className="hover:text-accent-solid cursor-pointer font-mono font-medium tabular-nums underline-offset-2 hover:underline"
            onClick={() => onOpenSerial(item.serial ?? 0)}
          >
            #{item.serial}
          </button>
        )}
      </th>
      <td className="max-w-0 px-3 py-1.5">
        {address === null ? (
          <span className="text-muted-foreground font-mono">—</span>
        ) : (
          // a seller with no Cosmo nickname still has a profile, addressed by wallet
          <ProfileCell
            address={address}
            nickname={nickname}
            title={nickname ?? address.toLowerCase()}
            className="-mx-3 -my-1.5 flex min-w-0 px-3 py-1.5 max-sm:-mx-1.5 max-sm:px-1.5"
            linkClassName={cn(
              "truncate underline-offset-2 hover:underline",
              nickname === null && "font-mono text-xs",
            )}
          >
            {sellerName}
          </ProfileCell>
        )}
      </td>
      <td className="text-muted-foreground px-3 py-1.5 text-xs tabular-nums">
        <ListingTime date={new Date(item.createdAt)} />
      </td>
      <td className="pe-1.5 max-sm:px-0!">
        {actions ? (
          <Menu>
            <MenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.objekt_market_listing_actions({
                    name: sellerName ?? m.objekt_market_seller(),
                  })}
                />
              }
            >
              <DotsThreeIcon weight="bold" />
            </MenuTrigger>
            <MenuPopup align="end" className="min-w-44">
              <MenuItem onClick={() => actions.message()}>
                <ChatCircleIcon />
                {m.chat_message()}
              </MenuItem>
              <MenuItem onClick={() => actions.offer()}>
                <HandshakeIcon />
                {m.offer_make()}
              </MenuItem>
              <MenuSeparator />
              <MenuItem render={<Link {...getListLinkOption(item.list)} />}>
                <ListIcon />
                {m.objekt_market_view_list()}
              </MenuItem>
            </MenuPopup>
          </Menu>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.objekt_market_view_list_of({
              name: sellerName ?? m.objekt_market_seller(),
            })}
            render={<Link {...getListLinkOption(item.list)} />}
          >
            <CaretRightIcon />
          </Button>
        )}
      </td>
    </tr>
  );
}
