import type { ActivityData } from "@repo/api/schemas/activity";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { WindowVirtualizer } from "virtua";

import { DataTable, DataTableHead } from "@/components/shared/data-table";
import { m } from "@/paraglide/messages";

import { ActivityRow } from "./activity-row";

/** the Objekt cell holds member + collection no. + serial, which needs ~14rem */
const COLUMNS = "grid-cols-[6rem_minmax(14rem,1.5fr)_1fr_1fr_7rem]";
const MIN_WIDTH = "min-w-160";

export function ActivityTable({
  rows,
  newIds,
  onOpen,
  onPointerEnter,
  onPointerLeave,
}: {
  rows: ActivityData[];
  newIds: ReadonlySet<string>;
  onOpen: (objekt: ValidObjekt) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  return (
    <DataTable columns={COLUMNS} minWidth={MIN_WIDTH}>
      <DataTableHead>
        <span>{m.activity_table_event()}</span>
        <span>{m.activity_table_objekt()}</span>
        <span>{m.activity_table_from()}</span>
        <span>{m.activity_table_to()}</span>
        <span className="text-right">{m.activity_table_time()}</span>
      </DataTableHead>
      <div
        role="region"
        aria-label={m.activity_table_aria_label()}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <WindowVirtualizer data={rows}>
          {(row: ActivityData) => (
            <ActivityRow
              key={row.transfer.id}
              item={row}
              isNew={newIds.has(row.transfer.id)}
              onOpen={onOpen}
            />
          )}
        </WindowVirtualizer>
      </div>
    </DataTable>
  );
}
