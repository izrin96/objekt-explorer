import { CaretDownIcon, ClockCounterClockwiseIcon, XIcon } from "@phosphor-icons/react";
import {
  endOfDay,
  format,
  isEqual,
  isSameDay,
  parse,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { useState } from "react";
import type { DayPickerLocale, DropdownProps } from "react-day-picker";
import { enUS } from "react-day-picker/locale/en-US";
import { ja } from "react-day-picker/locale/ja";
import { ko } from "react-day-picker/locale/ko";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilters, useSetFilters } from "@/features/filters/use-filters";
import { formatTimestamp } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale, type Locale } from "@/paraglide/runtime";

/** the `at` parameter is an instant; a checkpoint defaults to "the end of that day" */
export function checkpointDate(at: string | undefined): Date | undefined {
  if (at === undefined) return undefined;
  const parsed = new Date(at);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Cosmo's chain history starts here, so an earlier snapshot is always empty */
const EARLIEST = new Date(2022, 7, 1);
const END_OF_DAY_TIME = "23:59:59";
/** Safari centres a time value unless its inner field is told otherwise */
const dateTimeClass = "[&_input]:appearance-none [&_input::-webkit-date-and-time-value]:text-left";

/** weekdays, month names and the calendar's screen-reader labels follow the app's language */
const CALENDAR_LOCALE: Record<Locale, DayPickerLocale> = { en: enUS, ko, ja };

const PRESETS = [
  {
    id: "yesterday",
    label: () => m.checkpoint_preset_yesterday(),
    day: (today: Date) => subDays(today, 1),
  },
  { id: "week", label: () => m.checkpoint_preset_week(), day: (today: Date) => subWeeks(today, 1) },
  {
    id: "month",
    label: () => m.checkpoint_preset_month(),
    day: (today: Date) => subMonths(today, 1),
  },
  {
    id: "3-months",
    label: () => m.checkpoint_preset_3_months(),
    day: (today: Date) => subMonths(today, 3),
  },
  { id: "year", label: () => m.checkpoint_preset_year(), day: (today: Date) => subYears(today, 1) },
];

/** cnippet's `v-calendar-5`: the month and year dropdowns as Selects, not native selects */
function CalendarDropdown({ options, value, onChange, "aria-label": ariaLabel }: DropdownProps) {
  const items = (options ?? []).map((option) => ({
    disabled: option.disabled,
    label: option.label,
    value: option.value.toString(),
  }));
  return (
    <Select
      items={items}
      value={value?.toString()}
      onValueChange={(next) => {
        if (next === null) return;
        // react-day-picker listens for a native select's change event
        onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger size="sm" aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className="tabular-nums"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

/** the day alone for the default end-of-day instant, the time as well when one was picked */
export function formatCheckpoint(date: Date): string {
  return isEqual(date, endOfDay(date)) ? format(date, "yyyy/MM/dd") : formatTimestamp(date);
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
  // the calendar shows the draft's month, so a preset or a restored date is in view
  const [month, setMonth] = useState<Date>(() => date ?? new Date());
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState(() => new Date());
  const calendarLocale = CALENDAR_LOCALE[getLocale()];

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
            setMonth(date ?? new Date());
            setToday(new Date());
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
          <div className="p-1">
            <PopoverTitle className="mb-2 text-sm font-medium">
              {m.checkpoint_description()}
            </PopoverTitle>
            <div className="flex gap-2 max-sm:flex-col">
              <div className="flex gap-1 max-sm:flex-wrap max-sm:border-b max-sm:pb-2 sm:flex-col sm:border-e sm:pe-2">
                {PRESETS.map((preset) => {
                  const day = preset.day(today);
                  const chosen = draft !== undefined && isSameDay(draft, day);
                  return (
                    <Button
                      key={preset.id}
                      variant={chosen ? "secondary" : "ghost"}
                      aria-pressed={chosen}
                      size="sm"
                      className="sm:justify-start"
                      onClick={() => {
                        setDraft(day);
                        setMonth(day);
                      }}
                    >
                      {preset.label()}
                    </Button>
                  );
                })}
              </div>
              <div className="max-sm:self-center">
                {/* DayPicker's own `role` is only application or dialog, so its aria-label is never read */}
                <div role="group" aria-label={m.profile_checkpoint_date_label()}>
                  <Calendar
                    mode="single"
                    selected={draft}
                    onSelect={setDraft}
                    month={month}
                    onMonthChange={setMonth}
                    captionLayout="dropdown"
                    components={{ Dropdown: CalendarDropdown }}
                    locale={calendarLocale}
                    // the vendored Calendar names months in the browser's language
                    formatters={{
                      formatMonthDropdown: (date) =>
                        format(date, "LLL", { locale: calendarLocale }),
                    }}
                    disabled={[{ before: EARLIEST }, { after: today }]}
                    startMonth={EARLIEST}
                    endMonth={today}
                    className="p-0"
                  />
                </div>
                <Input
                  type="time"
                  step={1}
                  aria-label={m.profile_checkpoint_time_label()}
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className={cn("mt-2", dateTimeClass)}
                />
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-1.5 border-t pt-2">
              <Button
                variant="ghost"
                size="xs"
                disabled={!draft}
                onClick={() => setDraft(undefined)}
              >
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
