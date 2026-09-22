import type { ActivityData } from "@repo/api/schemas/activity";
import { Addresses } from "@repo/lib";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import { memo } from "react";

import { DataTableRow } from "@/components/shared/data-table";
import { TimeAgo } from "@/components/shared/time-ago";
import { EVENT_COLOR, type EventKind } from "@/features/objekt/drawer/serials";
import { getCollectionShortNo } from "@/features/objekt/objekt-utils";
import { truncateAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const EVENT_LABEL: Record<EventKind, () => string> = {
  mint: m.activity_event_type_mint,
  transfer: m.activity_event_type_transfer,
  spin: m.activity_event_type_spin,
};

export function getEventKind(from: string, to: string): EventKind {
  if (from === Addresses.NULL) return "mint";
  if (to === Addresses.SPIN) return "spin";
  return "transfer";
}

/** A nickname the owner hides never reaches the client, so the address stands in. */
function Who({ address, nickname }: { address: string; nickname: string | undefined }) {
  if (nickname === undefined) {
    return (
      <span className="text-muted-foreground truncate font-mono text-xs">
        {truncateAddress(address)}
      </span>
    );
  }
  return (
    <Link
      to="/@{$nickname}"
      params={{ nickname }}
      className="truncate underline-offset-2 hover:underline"
    >
      {nickname}
    </Link>
  );
}

function System({ label }: { label: string }) {
  return <span className="text-muted-foreground truncate font-mono text-xs">{label}</span>;
}

/**
 * The row carries links, so it cannot be one big button: the objekt cell is
 * the control that opens the drawer.
 */
export const ActivityRow = memo(function ActivityRow({
  item,
  isNew,
  onOpen,
}: {
  item: ActivityData;
  isNew: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const kind = getEventKind(item.transfer.from, item.transfer.to);

  return (
    <DataTableRow className={cn(isNew && "motion-safe:animate-live-animation-bg")}>
      <span className="flex items-center gap-1.5 text-xs font-medium">
        <i className="size-1.5 shrink-0 rounded-full" style={{ background: EVENT_COLOR[kind] }} />
        {EVENT_LABEL[kind]()}
      </span>

      <button
        type="button"
        onClick={() => onOpen(item.objekt)}
        className="focus-visible:ring-ring flex min-w-0 cursor-pointer items-center gap-2.5 rounded-sm text-left outline-none focus-visible:ring-2"
      >
        <img
          src={item.objekt.thumbnailImage}
          alt=""
          loading="lazy"
          decoding="async"
          className="bg-secondary h-7 w-4.5 shrink-0 rounded-[3px] object-cover"
        />
        <span className="truncate">
          {item.objekt.member}
          <span className="ml-1.5 font-mono text-xs">
            {getCollectionShortNo(item.objekt)}{" "}
            <b className="font-semibold">#{item.objekt.serial}</b>
          </span>
        </span>
      </button>

      <span className="flex min-w-0">
        {kind === "mint" ? (
          <System label={m.activity_cosmo()} />
        ) : (
          <Who address={item.transfer.from} nickname={item.nickname.from} />
        )}
      </span>

      <span className="flex min-w-0">
        {kind === "spin" ? (
          <System label={m.activity_cosmo_spin()} />
        ) : (
          <Who address={item.transfer.to} nickname={item.nickname.to} />
        )}
      </span>

      <span className="text-muted-foreground truncate text-right font-mono text-xs">
        <TimeAgo date={new Date(item.transfer.timestamp)} />
      </span>
    </DataTableRow>
  );
});
