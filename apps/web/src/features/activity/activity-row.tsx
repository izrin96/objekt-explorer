import type { ActivityItem } from "@repo/api/schemas/activity";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { memo } from "react";

import { DataTableRow } from "@/components/shared/data-table";
import { Timestamp } from "@/components/shared/timestamp";
import { EVENT_COLOR, type EventKind } from "@/features/objekt/drawer/timeline";
import { ObjektNameButton } from "@/features/objekt/objekt-hover-card";
import { ProfileCell } from "@/features/profile/profile-hover-card";
import { truncateAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { getEventKind } from "./live-feed";

const EVENT_LABEL: Record<EventKind, () => string> = {
  mint: m.activity_event_type_mint,
  transfer: m.activity_event_type_transfer,
  spin: m.activity_event_type_spin,
};

/** A nickname the owner hides never reaches the client, so the address stands in. */
function Who({ address, nickname }: { address: string; nickname: string | undefined }) {
  return (
    <ProfileCell
      address={address}
      nickname={nickname}
      className="flex min-w-0 items-center self-stretch"
      linkClassName={cn(
        "truncate underline-offset-2 hover:underline",
        nickname === undefined && "text-muted-foreground font-mono text-xs",
      )}
    >
      {nickname ?? truncateAddress(address)}
    </ProfileCell>
  );
}

function System({ label }: { label: string }) {
  return (
    <span className="flex min-w-0">
      <span className="text-muted-foreground truncate font-mono text-xs">{label}</span>
    </span>
  );
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
  item: ActivityItem;
  isNew: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const kind = getEventKind(item.transfer.from, item.transfer.to);

  return (
    <DataTableRow className={cn(isNew && "motion-safe:animate-live-animation-bg")}>
      <span className="flex items-center gap-1.5 text-xs font-medium">
        <i className={cn("size-1.5 shrink-0 rounded-full", EVENT_COLOR[kind])} />
        {EVENT_LABEL[kind]()}
      </span>

      <ObjektNameButton objekt={item.objekt} onOpen={onOpen} />

      {kind === "mint" ? (
        <System label={m.activity_cosmo()} />
      ) : (
        <Who address={item.transfer.from} nickname={item.nickname.from} />
      )}

      {kind === "spin" ? (
        <System label={m.activity_cosmo_spin()} />
      ) : (
        <Who address={item.transfer.to} nickname={item.nickname.to} />
      )}

      <span className="text-muted-foreground text-right font-mono text-xs whitespace-nowrap">
        <Timestamp date={new Date(item.transfer.timestamp)} />
      </span>
    </DataTableRow>
  );
});
