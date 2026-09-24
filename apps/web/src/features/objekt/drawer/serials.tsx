import {
  ArrowsLeftRightIcon,
  CaretLeftIcon,
  CaretLineLeftIcon,
  CaretLineRightIcon,
  CaretRightIcon,
  ListMagnifyingGlassIcon,
  LockIcon,
  QuestionMarkIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { ObjektTransfer, ObjektTransferResult } from "@repo/api/schemas/objekt";
import { Addresses } from "@repo/lib";
import type { UseQueryResult } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { Timestamp } from "@/components/shared/timestamp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import { truncateAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { SortableHeader, type SortState } from "./sortable-header";

export type EventKind = "mint" | "transfer" | "spin";

/**
 * The events are categories, not states, so they own three hues of their own
 * rather than borrowing the feedback tokens — which are chip fills that vanish
 * on a light page. `app.css` holds the pair per theme.
 */
export const EVENT_COLOR: Record<EventKind, string> = {
  mint: "bg-event-mint",
  transfer: "bg-event-transfer",
  spin: "bg-event-spin",
};

const EVENT_LABEL: Record<EventKind, () => string> = {
  mint: m.objekt_event_minted,
  transfer: m.objekt_event_transferred,
  spin: m.objekt_event_spun,
};

export type TimelineEvent = {
  id: string;
  kind: EventKind;
  /** a nickname, or a raw `0x…` address when Cosmo has no name for the holder */
  owner: string;
  /** render the owner in mono — it is a raw address, not a nickname */
  mono: boolean;
  at: Date;
};

/** the response is newest first, so the last row is the mint */
export function toTimeline(rows: ObjektTransfer[]): TimelineEvent[] {
  return rows.map((row, index) => {
    const spun = row.to.toLowerCase() === Addresses.SPIN;
    const kind: EventKind = spun ? "spin" : index === rows.length - 1 ? "mint" : "transfer";
    return {
      id: row.id,
      kind,
      owner: spun ? "COSMO" : (row.nickname ?? row.to),
      mono: !spun && !row.nickname,
      at: new Date(row.timestamp),
    };
  });
}

/** Previous and next snap to the nearest *existing* serial, never to `serial ± 1`. */
export function SerialsPanel({
  serial,
  serials,
  metadata,
  physical,
  loading,
  onSerialChange,
  children,
}: {
  serial: number | null;
  serials: number[];
  metadata: UseQueryResult<{ total: number; spin: number; transferable: number }>;
  /** a physical objekt's copies only exist once scanned, so its total counts scans */
  physical: boolean;
  loading: boolean;
  onSerialChange: (serial: number) => void;
  children: ReactNode;
}) {
  const updateSerial = (mode: "first" | "prev" | "next" | "last") => {
    if (serials.length === 0) return;
    const current = serial ?? 0;
    if (mode === "first") return onSerialChange(serials[0] ?? current);
    if (mode === "last") return onSerialChange(serials[serials.length - 1] ?? current);
    if (mode === "prev") {
      const found = serials.findLast((value) => value < current);
      return onSerialChange(found ?? (current > 1 ? current - 1 : 1));
    }
    const found = serials.find((value) => value > current);
    return onSerialChange(found ?? current + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3" role="status">
        {/* a live region announces its content, so the label has to be in it */}
        <span className="sr-only">{m.objekt_serials_loading()}</span>
        <Shimmer className="h-8 w-full rounded-md" />
        <Shimmer className="h-3.5 w-52" />
        <Shimmer className="h-21 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <NumberField
          value={serial}
          // null is an empty input, not "no serial"; 0 keeps the field usable
          onValueChange={(value) => onSerialChange(value ?? 0)}
          min={0}
          size="sm"
          className="min-w-0 grow"
        >
          <NumberFieldGroup>
            <NumberFieldInput
              aria-label={m.objekt_serial_aria()}
              className="text-left font-mono"
              placeholder={m.objekt_serial()}
            />
          </NumberFieldGroup>
        </NumberField>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.trade_view_serial_first_aria()}
          onClick={() => updateSerial("first")}
        >
          <CaretLineLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.trade_view_serial_previous_aria()}
          onClick={() => updateSerial("prev")}
        >
          <CaretLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.trade_view_serial_next_aria()}
          onClick={() => updateSerial("next")}
        >
          <CaretRightIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.trade_view_serial_last_aria()}
          onClick={() => updateSerial("last")}
        >
          <CaretLineRightIcon />
        </Button>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        {metadata.isPending && <Shimmer className="h-3.5 w-52" />}
        {metadata.isError && (
          <Badge variant="error" size="sm" className="font-sans">
            {m.objekt_error_fetching_metadata()}
          </Badge>
        )}
        {metadata.data && (
          <>
            <span>
              {physical ? m.objekt_scanned_copies() : m.objekt_copies()}{" "}
              <b className="text-foreground font-semibold">
                {metadata.data.total.toLocaleString()}
              </b>
            </span>
            <span>
              {m.objekt_event_spun()}{" "}
              <b className="text-foreground font-semibold">{metadata.data.spin.toLocaleString()}</b>
            </span>
            <span>
              {m.objekt_non_spin()}{" "}
              <b className="text-foreground font-semibold">
                {(metadata.data.total - metadata.data.spin).toLocaleString()}
              </b>
            </span>
            <span>
              {m.objekt_transferable()}{" "}
              <b className="text-foreground font-semibold">
                {((metadata.data.transferable / metadata.data.total) * 100).toFixed(2)}%
              </b>{" "}
              ({metadata.data.transferable.toLocaleString()})
            </span>
          </>
        )}
      </div>

      {children}
    </div>
  );
}

type SerialView =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "private" }
  | { kind: "missing" }
  | {
      kind: "found";
      /** a nickname, or a raw `0x…` address when Cosmo has no name for the holder */
      owner: string;
      ownerIsAddress: boolean;
      tokenId: string | null;
      transferable: boolean | null;
      events: TimelineEvent[];
    };

function resolveSerial(
  serial: number | null,
  query: UseQueryResult<ObjektTransferResult>,
): SerialView {
  if (serial === null || serial <= 0) return { kind: "idle" };
  if (query.isPending) return { kind: "loading" };
  if (query.isError) return { kind: "error" };

  const data = query.data;
  if (data.hide === true) return { kind: "private" };

  const owner = data.owner;
  // a serial that was never minted still answers 200 — with no owner and no rows
  if (!owner) return { kind: "missing" };

  const nickname = data.transfers.find(
    (row) => row.to.toLowerCase() === owner.toLowerCase(),
  )?.nickname;

  return {
    kind: "found",
    owner: nickname ?? owner,
    ownerIsAddress: !nickname,
    tokenId: data.tokenId ?? null,
    transferable: data.transferable ?? null,
    events: toTimeline(data.transfers),
  };
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">{children}</dd>
    </>
  );
}

/**
 * Owner, token id and transferable keep their boxes as shimmer blocks while
 * the request is in flight, so the timeline underneath does not jump when it
 * lands.
 */
function OwnershipHead({
  view,
  onClose,
}: {
  view: Extract<SerialView, { kind: "loading" | "found" }>;
  onClose: () => void;
}) {
  const found = view.kind === "found" ? view : null;

  return (
    <div className="flex flex-col gap-1.5">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 text-sm">
        <Fact label={m.objekt_owner()}>
          {found === null ? (
            <Shimmer className="h-4.5 w-28" />
          ) : (
            // a holder with no Cosmo nickname still has a profile, addressed by wallet
            <Link
              to="/@{$nickname}"
              params={{ nickname: found.ownerIsAddress ? found.owner.toLowerCase() : found.owner }}
              onClick={onClose}
              className={cn(
                "truncate underline-offset-2 hover:underline",
                found.ownerIsAddress ? "font-mono text-xs" : "font-medium",
              )}
            >
              {found.ownerIsAddress ? truncateAddress(found.owner) : found.owner}
            </Link>
          )}
        </Fact>
        <Fact label={m.objekt_token_id()}>
          {found === null ? (
            <Shimmer className="h-4.5 w-16" />
          ) : (
            <span className="truncate font-mono text-xs">{found.tokenId ?? "—"}</span>
          )}
        </Fact>
        <Fact label={m.objekt_transferable()}>
          {found === null ? (
            <Shimmer className="h-5 w-11 rounded-full" />
          ) : (
            <Badge
              variant={
                found.transferable === null ? "outline" : found.transferable ? "success" : "warning"
              }
              size="sm"
              className={found.transferable === null ? "font-normal" : undefined}
            >
              {found.transferable === null
                ? "—"
                : found.transferable
                  ? m.objekt_yes()
                  : m.objekt_no()}
            </Badge>
          )}
        </Fact>
      </dl>
    </div>
  );
}

export function Timeline({
  serial,
  query,
  onClose,
}: {
  serial: number | null;
  query: UseQueryResult<ObjektTransferResult>;
  onClose: () => void;
}) {
  const view = resolveSerial(serial, query);

  if (view.kind === "idle") {
    return (
      <EmptyState icon={ListMagnifyingGlassIcon} title={m.objekt_serial_pick()} bordered={false} />
    );
  }

  if (view.kind === "error") {
    return <EmptyState icon={WarningIcon} title={m.common_error_loading_data()} bordered={false} />;
  }

  // a private holder gets no owner, no token id and no history — not a blank row
  if (view.kind === "private") {
    return (
      <EmptyState
        icon={LockIcon}
        title={m.objekt_objekt_private()}
        hint={m.objekt_serial_private_hint()}
        bordered={false}
      />
    );
  }

  if (view.kind === "missing") {
    return (
      <EmptyState
        icon={QuestionMarkIcon}
        title={m.objekt_not_found_objekt()}
        hint={m.objekt_serial_missing_hint()}
        bordered={false}
      />
    );
  }

  const body =
    view.kind === "loading" ? (
      <Shimmer className="h-21 w-full rounded-lg" />
    ) : view.events.length === 0 ? (
      <EmptyState icon={ArrowsLeftRightIcon} title={m.objekt_no_transfers()} bordered={false} />
    ) : (
      <OwnershipTable events={view.events} onClose={onClose} />
    );

  return (
    <div className="flex flex-col gap-1.5">
      <OwnershipHead view={view} onClose={onClose} />
      {body}
    </div>
  );
}

type TimelineSortKey = "at";

function OwnershipTable({ events, onClose }: { events: TimelineEvent[]; onClose: () => void }) {
  const [sort, setSort] = useState<SortState<TimelineSortKey>>({ key: "at", dir: "desc" });

  const rows = useMemo(() => {
    const sign = sort.dir === "desc" ? -1 : 1;
    return events.toSorted((a, b) => sign * (a.at.getTime() - b.at.getTime()));
  }, [events, sort]);

  return (
    /* the owner names run long, so the table keeps its own scroller rather
       than squeezing them; the region takes focus so the columns past the
       fold are reachable without a pointer */
    <div
      data-scroll-x
      tabIndex={0}
      role="region"
      aria-label={m.objekt_serial_table_aria()}
      className="bg-card focus-visible:ring-ring overflow-x-auto rounded-lg border outline-none focus-visible:ring-2"
    >
      <table className="w-full min-w-96 border-collapse text-sm">
        <caption className="sr-only">{m.objekt_serial_table_aria()}</caption>
        <thead>
          <tr className="text-muted-foreground bg-secondary/60 text-xs tracking-wide uppercase">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {m.objekt_owner()}
            </th>
            <SortableHeader
              sort={sort}
              column="at"
              onToggle={() =>
                setSort((prev) => ({ ...prev, dir: prev.dir === "asc" ? "desc" : "asc" }))
              }
            >
              {m.objekt_date()}
            </SortableHeader>
          </tr>
        </thead>
        <tbody>
          {rows.map((event) => {
            return (
              <tr key={event.id} className="border-t">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <i
                      aria-hidden
                      className={cn("size-1.5 shrink-0 rounded-full", EVENT_COLOR[event.kind])}
                    />
                    {/* the dot's colour is the event; this names it for a screen reader */}
                    <span className="sr-only">{EVENT_LABEL[event.kind]()}:</span>
                    {/* the spin address is Cosmo's burn wallet, so it has no profile */}
                    {event.kind === "spin" ? (
                      <span className="truncate">{event.owner}</span>
                    ) : (
                      <Link
                        to="/@{$nickname}"
                        params={{ nickname: event.mono ? event.owner.toLowerCase() : event.owner }}
                        onClick={onClose}
                        className={cn(
                          "truncate underline-offset-2 hover:underline",
                          event.mono && "font-mono text-xs",
                        )}
                      >
                        {event.mono ? truncateAddress(event.owner) : event.owner}
                      </Link>
                    )}
                  </span>
                </th>
                <td className="text-muted-foreground px-3 py-1.5 font-mono text-xs whitespace-nowrap">
                  <Timestamp date={event.at} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
