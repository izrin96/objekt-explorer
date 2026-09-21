import {
  CaretLeftIcon,
  CaretLineLeftIcon,
  CaretLineRightIcon,
  CaretRightIcon,
  LockIcon,
  QuestionMarkIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import {
  CURRENT_BADGE,
  EVENT_BADGE,
  EventPill,
  type Metadata,
  type TimelineEvent,
  type TransferResponse,
} from "@/components/objekt-drawer/types";
import { CopyButton } from "@/components/shared/copy-button";
import { Shimmer } from "@/components/shared/shimmer";
import { TimeAgo } from "@/components/shared/time-ago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import { Spinner } from "@/components/ui/spinner";
import { isPrivateSerial, serialsFor } from "@/fixtures/serials";
import type { ApiState } from "@/hooks/use-api";
import { truncateAddress } from "@/lib/address";
import { EVENT_COLOR } from "@/lib/objekt";

/** shown whenever a panel is reading from fixtures because the proxy failed */
function OfflineTag() {
  return (
    <Badge variant="warning" size="sm" className="font-normal">
      offline sample
    </Badge>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
      <Spinner className="size-4" />
      {label}
    </div>
  );
}

/**
 * Serial picker + the chosen serial's ownership timeline, in one tab.
 *
 * Port of `apps/website/src/components/objekt/trade-view.tsx`: a number field
 * with first / prev / next / last, where prev and next snap to the nearest
 * *existing* serial from `/api/objekts/list`, never to `serial ± 1`.
 */
export function SerialsPanel({
  serial,
  serials,
  metadata,
  offlineSerials,
  loading,
  onSerialChange,
  children,
}: {
  serial: number | null;
  serials: number[];
  metadata: ApiState<Metadata>;
  offlineSerials: boolean;
  loading: boolean;
  onSerialChange: (serial: number) => void;
  children: React.ReactNode;
}) {
  const updateSerial = (mode: "first" | "prev" | "next" | "last") => {
    if (serials.length === 0) return;
    const current = serial ?? 0;
    if (mode === "first") return onSerialChange(serials[0] ?? current);
    if (mode === "last") return onSerialChange(serials[serials.length - 1] ?? current);
    if (mode === "prev") {
      const found = serials.findLast((s) => s < current);
      return onSerialChange(found ?? (current > 1 ? current - 1 : 1));
    }
    const found = serials.find((s) => s > current);
    return onSerialChange(found ?? current + 1);
  };

  if (loading) return <Loading label="Loading serials…" />;

  return (
    <div className="flex flex-col gap-3">
      {/* below `sm` the field takes the row and the four nav buttons drop to a
          second line; together they need ~190px more than a phone drawer has */}
      <div className="flex flex-wrap items-center gap-1.5">
        <NumberField
          value={serial}
          // null is an empty input, not "no serial"; 0 keeps the field usable
          onValueChange={(value) => onSerialChange(value ?? 0)}
          min={0}
          size="sm"
          className="w-full grow sm:w-auto"
        >
          <NumberFieldGroup>
            <NumberFieldInput aria-label="Serial" className="font-mono" placeholder="Serial" />
          </NumberFieldGroup>
        </NumberField>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="First serial"
          onClick={() => updateSerial("first")}
        >
          <CaretLineLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous serial"
          onClick={() => updateSerial("prev")}
        >
          <CaretLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next serial"
          onClick={() => updateSerial("next")}
        >
          <CaretRightIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Last serial"
          onClick={() => updateSerial("last")}
        >
          <CaretLineRightIcon />
        </Button>
      </div>

      {/* live supply, straight off /api/objekts/metadata */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        {metadata.loading && <Spinner className="size-3.5" />}
        {metadata.data ? (
          <>
            <span>
              Minted <b className="text-foreground font-semibold">{metadata.data.total}</b>
            </span>
            <span>
              Spun <b className="text-foreground font-semibold">{metadata.data.spin}</b>
            </span>
            <span>
              Transferable{" "}
              <b className="text-foreground font-semibold">{metadata.data.transferable}</b>
            </span>
          </>
        ) : (
          metadata.error && (
            <span>
              Minted{" "}
              <b className="text-foreground font-semibold">{serials.length.toLocaleString()}</b>
            </span>
          )
        )}
        {offlineSerials && <OfflineTag />}
      </div>

      {children}
    </div>
  );
}

/** what the Serials panel is showing for the serial it is pointing at */
type SerialView =
  | { kind: "idle" }
  | { kind: "loading" }
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

/**
 * Resolve one serial to the state its panel renders — the same branches
 * `apps/website/src/components/objekt/trade-view.tsx` takes (pending,
 * `data.hide`, `!data.owner`, then the real thing), with the offline fixtures
 * standing in for whichever shape the proxy could not answer.
 */
function resolveSerial(
  slug: string,
  serial: number | null,
  state: ApiState<TransferResponse>,
  offline: boolean,
  events: TimelineEvent[],
): SerialView {
  if (serial === null || serial <= 0) return { kind: "idle" };
  if (state.loading) return { kind: "loading" };

  if (offline) {
    // the fixtures have no `hide` column; the rule stands in for one
    if (isPrivateSerial(serial)) return { kind: "private" };
    const row = serialsFor(slug).find((r) => r.serial === serial);
    if (!row) return { kind: "missing" };
    return {
      kind: "found",
      owner: row.owner,
      ownerIsAddress: false,
      tokenId: row.tokenId,
      transferable: row.transferable,
      events,
    };
  }

  if (state.data?.hide === true) return { kind: "private" };

  const owner = state.data?.owner;
  // a serial that was never minted still answers 200 — with no owner and no rows
  if (!owner) return { kind: "missing" };
  const nickname = state.data?.transfers.find(
    (row) => row.to.toLowerCase() === owner.toLowerCase(),
  )?.nickname;
  return {
    kind: "found",
    owner: nickname ?? owner,
    ownerIsAddress: nickname === undefined,
    tokenId: state.data?.tokenId ?? null,
    transferable: state.data?.transferable ?? null,
    events,
  };
}

/** centred icon + message, the same shape the empty Market panel uses */
function SerialNotice({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-center">
      {icon}
      <span className="text-foreground text-sm">{title}</span>
      {hint && <span className="text-xs">{hint}</span>}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">{children}</dd>
    </>
  );
}

/**
 * Owner / token id / transferable for the looked-up serial.
 *
 * All three rows are left-aligned — the panel's two facts are not a trailing
 * column — and they keep their boxes as shimmer blocks while the request is in
 * flight, so the timeline underneath does not jump when it lands.
 */
function OwnershipHead({
  view,
  offline,
  onClose,
}: {
  view: Extract<SerialView, { kind: "loading" | "found" }>;
  offline: boolean;
  onClose: () => void;
}) {
  const found = view.kind === "found" ? view : null;

  return (
    <div className="flex flex-col gap-1.5 border-b pb-2.5">
      {offline && (
        <div>
          <OfflineTag />
        </div>
      )}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 text-sm">
        <Fact label="Owner">
          {found === null ? (
            <Shimmer className="h-4.5 w-28" />
          ) : found.ownerIsAddress ? (
            <span className="truncate font-mono text-xs">{truncateAddress(found.owner)}</span>
          ) : (
            <Link
              to="/profile/$nickname"
              params={{ nickname: found.owner }}
              onClick={onClose}
              className="truncate font-medium underline-offset-2 hover:underline"
            >
              {found.owner}
            </Link>
          )}
        </Fact>
        <Fact label="Token id">
          {found === null ? (
            <>
              <Shimmer className="h-4.5 w-16" />
              <Shimmer className="size-5.5" />
            </>
          ) : (
            <>
              <span className="truncate font-mono text-xs">{found.tokenId ?? "—"}</span>
              {found.tokenId !== null && (
                <CopyButton
                  text={found.tokenId}
                  label="Copy token id"
                  toastTitle="Token id copied"
                />
              )}
            </>
          )}
        </Fact>
        <Fact label="Transferable">
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
              {found.transferable === null ? "—" : found.transferable ? "Yes" : "No"}
            </Badge>
          )}
        </Fact>
      </dl>
    </div>
  );
}

/** Ownership state + timeline for the serial the panel above is pointing at. */
export function Timeline({
  slug,
  serial,
  events,
  state,
  offline,
  onClose,
}: {
  slug: string;
  serial: number | null;
  events: TimelineEvent[];
  state: ApiState<TransferResponse>;
  offline: boolean;
  onClose: () => void;
}) {
  const view = resolveSerial(slug, serial, state, offline, events);

  if (view.kind === "idle") {
    return (
      <p className="text-muted-foreground py-6 text-sm">Pick a serial to see its trade history</p>
    );
  }

  // a private holder gets no owner, no token id and no history — not a blank row
  if (view.kind === "private") {
    return (
      <SerialNotice
        icon={<LockIcon size={56} weight="light" />}
        title="This objekt is private"
        hint="The owner hides their serials"
      />
    );
  }

  if (view.kind === "missing") {
    return (
      <SerialNotice
        icon={<QuestionMarkIcon size={56} weight="light" />}
        title="Serial not found"
        hint="Nothing has been minted at this serial"
      />
    );
  }

  const body =
    view.kind === "loading" ? (
      <Shimmer className="h-21 w-full rounded-lg" />
    ) : view.events.length === 0 ? (
      <p className="text-muted-foreground py-6 text-sm">No transfers yet</p>
    ) : (
      <ol className="flex flex-col divide-y text-sm">
        {view.events.map((event, i) => {
          const current = i === 0 && event.kind !== "spin";
          return (
            /* Wrapping, not shrinking: the owner is the only flexible item in the
               row, so without this the two pills and the timestamp squeeze it to
               nothing. Wrapping lets the chrome move to a second line and the
               nickname keep its width; `truncate` stays as the backstop. */
            <li key={event.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 py-2">
              <i
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: EVENT_COLOR[event.kind] }}
              />
              <span
                className={
                  event.mono
                    ? "truncate font-mono text-xs"
                    : current
                      ? "truncate font-semibold"
                      : "truncate"
                }
              >
                {event.owner}
              </span>
              {/* what this row is, then — on the newest one — that it is also
                  where the token sits now; one treatment for both */}
              <EventPill badge={EVENT_BADGE[event.kind]} />
              {current && <EventPill badge={CURRENT_BADGE} />}
              <span className="text-muted-foreground ml-auto flex-none font-mono text-xs">
                <TimeAgo date={event.at} />
              </span>
            </li>
          );
        })}
      </ol>
    );

  return (
    <div className="flex flex-col gap-1.5">
      <OwnershipHead view={view} offline={offline} onClose={onClose} />
      {body}
    </div>
  );
}
