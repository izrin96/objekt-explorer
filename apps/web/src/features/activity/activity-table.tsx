import type { ActivityItem } from "@repo/api/schemas/activity";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { WindowVirtualizer } from "virtua";

import { DataTable, DataTableColumnHeader, DataTableHead } from "@/components/shared/data-table";
import { m } from "@/paraglide/messages";

import { ActivityRow } from "./activity-row";

/** the Objekt cell holds member + collection no. + serial, which needs ~14rem */
const COLUMNS = "grid-cols-[6rem_minmax(14rem,1.5fr)_1fr_1fr_10.5rem]";
const MIN_WIDTH = "min-w-172";

export function ActivityTable({
  rows,
  newIds,
  onOpen,
  onPointerEnter,
  onPointerLeave,
}: {
  rows: ActivityItem[];
  newIds: ReadonlySet<string>;
  onOpen: (objekt: ValidObjekt) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  return (
    <DataTable columns={COLUMNS} minWidth={MIN_WIDTH} label={m.activity_table_aria_label()}>
      <DataTableHead>
        <DataTableColumnHeader>{m.activity_table_event()}</DataTableColumnHeader>
        <DataTableColumnHeader>{m.activity_table_objekt()}</DataTableColumnHeader>
        <DataTableColumnHeader>{m.activity_table_from()}</DataTableColumnHeader>
        <DataTableColumnHeader>{m.activity_table_to()}</DataTableColumnHeader>
        <DataTableColumnHeader className="text-right">
          {m.activity_table_time()}
        </DataTableColumnHeader>
      </DataTableHead>
      <div role="rowgroup" onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
        <WindowVirtualizer data={rows}>
          {(row: ActivityItem) => (
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
