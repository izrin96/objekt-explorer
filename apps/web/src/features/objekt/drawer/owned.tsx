import {
  ArchiveIcon,
  CaretLeftIcon,
  CaretRightIcon,
  DotsThreeIcon,
  LockSimpleIcon,
  PushPinIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react";
import type { OwnedObjekt } from "@repo/lib/types/objekt";
import { type ReactNode, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { absoluteTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const PAGE_SIZE = 10;

type SortKey = "serial" | "receivedAt";
type Sort = { key: SortKey; dir: "asc" | "desc" };

/** The items only; the panel supplies the trigger and the popup. */
export type OwnedRowMenu = (objekt: OwnedObjekt) => ReactNode;

/**
 * Every copy of this collection the surface's profile holds. The table is the
 * only place a single token is addressable, so the row menu acts on one token
 * where the card menu acts on the whole group.
 */
export function OwnedPanel({
  objekts,
  onOpenSerial,
  menu,
}: {
  objekts: OwnedObjekt[];
  onOpenSerial: (serial: number) => void;
  /** omitting it drops the column, which is what a visitor gets */
  menu?: OwnedRowMenu;
}) {
  const [sort, setSort] = useState<Sort>({ key: "receivedAt", dir: "desc" });
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const sign = sort.dir === "desc" ? -1 : 1;
    return objekts.toSorted((a, b) =>
      sort.key === "serial"
        ? sign * (a.serial - b.serial)
        : sign * (new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()),
    );
  }, [objekts, sort]);

  if (objekts.length === 0) {
    return <EmptyState icon={ArchiveIcon} title={m.objekt_not_owned()} bordered={false} />;
  }

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  // a re-sort never changes the count, but a mutation behind it can
  const current = Math.min(page, totalPages);
  const rows = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const toggle = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "serial" ? "asc" : "desc" },
    );

  return (
    <div className="flex flex-col gap-2.5">
      {/* five columns do not fit a phone-width drawer, so the table keeps its
          own scroller rather than squeezing the received date. A visitor's row
          has one focusable cell, so without `tabIndex` the columns past the
          fold are pointer-only. */}
      <div
        data-scroll-x
        tabIndex={0}
        role="region"
        aria-label={m.objekt_owned_table_aria()}
        className="bg-card focus-visible:ring-ring overflow-x-auto rounded-lg border outline-none focus-visible:ring-2"
      >
        <table className="w-full min-w-96 border-collapse text-[13px]">
          <caption className="sr-only">{m.objekt_owned_table_aria()}</caption>
          <thead>
            <tr className="text-muted-foreground bg-secondary/60 text-[11.5px] tracking-wide uppercase">
              <SortableHeader sort={sort} column="serial" onToggle={toggle}>
                {m.objekt_serial()}
              </SortableHeader>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {m.objekt_token_id()}
              </th>
              <SortableHeader sort={sort} column="receivedAt" onToggle={toggle}>
                {m.objekt_received()}
              </SortableHeader>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {m.objekt_transferable()}
              </th>
              {menu && <th scope="col" className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  <button
                    type="button"
                    className="hover:text-accent-solid inline-flex cursor-pointer items-center gap-1.5 font-mono font-medium tabular-nums underline-offset-2 hover:underline"
                    onClick={() => onOpenSerial(item.serial)}
                  >
                    {item.serial}
                    {item.isPin === true && <PushPinIcon className="size-3" aria-hidden />}
                    {item.isLocked === true && <LockSimpleIcon className="size-3" aria-hidden />}
                  </button>
                </th>
                <td className="px-3 py-1.5 font-mono tabular-nums">{item.tokenId}</td>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">
                  {absoluteTime(new Date(item.receivedAt))}
                </td>
                <td className="px-3 py-1.5">
                  <Badge variant={item.transferable ? "success" : "warning"} size="sm">
                    {item.transferable ? m.objekt_yes() : m.objekt_no()}
                  </Badge>
                </td>
                {menu && (
                  <td className="pr-2 pl-1">
                    <Menu>
                      <MenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={m.objekt_menu_aria()}
                          />
                        }
                      >
                        <DotsThreeIcon weight="bold" />
                      </MenuTrigger>
                      <MenuPopup align="end" className="min-w-44">
                        {menu(item)}
                      </MenuPopup>
                    </Menu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={current <= 1}
            aria-label={m.objekt_pagination_previous_aria()}
            onClick={() => setPage(current - 1)}
          >
            <CaretLeftIcon />
          </Button>
          {/* the buttons disable at the ends, so the count is what announces the move */}
          <span role="status" className="font-mono text-[13px] tabular-nums">
            {current} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={current >= totalPages}
            aria-label={m.objekt_pagination_next_aria()}
            onClick={() => setPage(current + 1)}
          >
            <CaretRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  sort,
  column,
  onToggle,
  children,
}: {
  sort: Sort;
  column: SortKey;
  onToggle: (key: SortKey) => void;
  children: ReactNode;
}) {
  const active = sort.key === column;

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className="px-3 py-2 text-left font-medium"
    >
      <button
        type="button"
        onClick={() => onToggle(column)}
        className={cn(
          "focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase outline-none focus-visible:ring-2",
          active && "text-foreground",
        )}
      >
        {children}
        {active &&
          (sort.dir === "asc" ? (
            <SortAscendingIcon className="size-3.5" aria-hidden />
          ) : (
            <SortDescendingIcon className="size-3.5" aria-hidden />
          ))}
      </button>
    </th>
  );
}
