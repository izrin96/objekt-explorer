import { CaretDownIcon, ClockCounterClockwiseIcon, XIcon } from "@phosphor-icons/react";
import { endOfDay, format, isEqual, parse } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { useFilters, useSetFilters } from "@/features/filters/use-filters";
import { m } from "@/paraglide/messages";

/** the `at` parameter is an instant; a checkpoint defaults to "the end of that day" */
export function checkpointDate(at: string | undefined): Date | undefined {
  if (at === undefined) return undefined;
  const parsed = new Date(at);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Cosmo's chain history starts here, so an earlier snapshot is always empty */
const EARLIEST = new Date(2022, 7, 1);
const END_OF_DAY_TIME = "23:59:59";

/** the day alone for the default end-of-day instant, the time as well when one was picked */
export function formatCheckpoint(date: Date): string {
  return isEqual(date, endOfDay(date))
    ? format(date, "d MMM yyyy")
    : format(date, "d MMM yyyy, HH:mm:ss");
}

function timeOf(date: Date | undefined): string {
  return date === undefined || isEqual(date, endOfDay(date))
    ? END_OF_DAY_TIME
    : format(date, "HH:mm:ss");
}

/** a cleared or end-of-day time keeps the whole day; any other time is the instant itself */
function toInstant(day: Date, time: string): Date {
  if (time === "" || time === END_OF_DAY_TIME) return endOfDay(day);
  const parsed = parse(time, time.length === 5 ? "HH:mm" : "HH:mm:ss", day);
  return Number.isNaN(parsed.getTime()) ? endOfDay(day) : parsed;
}

/**
 * A date is a draft until Apply: every tab re-derives its whole owned set from
 * it, so committing on each calendar click would reshuffle the grid behind the
 * open popover on the way to the date the user actually wants. Reset sits
 * outside the popover — a mode you have to open a popover to leave is a mode
 * with no exit in sight.
 */
export function CheckpointPopover() {
  const at = useFilters((f) => f.at);
  const setFilters = useSetFilters();
  const date = checkpointDate(at);
  const [draft, setDraft] = useState<Date | undefined>(date);
  const [time, setTime] = useState(() => timeOf(date));
  const [open, setOpen] = useState(false);

  const today = new Date();

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          // reopening on last session's draft would show a date the page is
          // not actually filtered by
          if (next) {
            setDraft(date);
            setTime(timeOf(date));
          }
          setOpen(next);
        }}
      >
        <PopoverTrigger render={<Button variant={date ? "secondary" : "outline"} size="sm" />}>
          <ClockCounterClockwiseIcon />
          {date ? formatCheckpoint(date) : m.checkpoint_title()}
          <CaretDownIcon className="size-3 opacity-60" />
        </PopoverTrigger>
        <PopoverPopup align="start" className="w-auto">
          <PopoverTitle className="mb-2 text-sm font-medium">
            {m.checkpoint_description()}
          </PopoverTitle>
          <input
            type="date"
            aria-label={m.profile_checkpoint_date_label()}
            value={draft ? format(draft, "yyyy-MM-dd") : ""}
            min={format(EARLIEST, "yyyy-MM-dd")}
            max={format(today, "yyyy-MM-dd")}
            onChange={(event) => setDraft(event.target.valueAsDate ?? undefined)}
            className="bg-background focus-visible:ring-ring mb-2 h-8 w-full rounded-lg border px-2.5 font-mono text-sm outline-none focus-visible:ring-2"
          />
          <Calendar
            mode="single"
            selected={draft}
            onSelect={setDraft}
            disabled={[{ before: EARLIEST }, { after: today }]}
            startMonth={EARLIEST}
            className="p-0"
          />
          <input
            type="time"
            step={1}
            aria-label={m.profile_checkpoint_time_label()}
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="bg-background focus-visible:ring-ring mt-2 h-8 w-full rounded-lg border px-2.5 font-mono text-sm outline-none focus-visible:ring-2"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <Button variant="ghost" size="xs" disabled={!draft} onClick={() => setDraft(undefined)}>
              {m.filter_clear()}
            </Button>
            <Button
              size="xs"
              disabled={!draft}
              onClick={() => {
                if (draft) setFilters({ at: toInstant(draft, time).toISOString() });
                setOpen(false);
              }}
            >
              {m.checkpoint_apply()}
            </Button>
          </div>
        </PopoverPopup>
      </Popover>

      {date && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDraft(undefined);
            setFilters({ at: undefined });
          }}
        >
          <XIcon />
          {m.checkpoint_reset()}
        </Button>
      )}
    </>
  );
}
