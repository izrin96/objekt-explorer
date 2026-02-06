"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { type CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { useDateFormatter } from "@react-aria/i18n";
import { use } from "react";
import {
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader as CalendarGridHeaderPrimitive,
  CalendarHeaderCell,
  Calendar as CalendarPrimitive,
  type CalendarProps as CalendarPrimitiveProps,
  CalendarStateContext,
  composeRenderProps,
  type DateValue,
  Heading,
  RangeCalendarStateContext,
  useLocale,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { Button } from "./button";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select";

interface CalendarProps<T extends DateValue> extends Omit<
  CalendarPrimitiveProps<T>,
  "visibleDuration"
> {
  className?: string;
}

const Calendar = <T extends DateValue>({ className, ...props }: CalendarProps<T>) => {
  const now = today(getLocalTimeZone());

  return (
    <CalendarPrimitive data-slot="calendar" {...props}>
      <CalendarHeader />
      <CalendarGrid>
        <CalendarGridHeader />
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={composeRenderProps(className, (className, { isSelected, isDisabled }) =>
                twMerge(
                  "text-fg hover:bg-secondary-fg/15 relative flex size-11 cursor-default items-center justify-center rounded-lg tabular-nums outline-hidden sm:size-9 sm:text-sm/6 forced-colors:text-[ButtonText] forced-colors:outline-0",
                  isSelected &&
                    "bg-primary pressed:bg-primary text-primary-fg hover:bg-primary/90 data-invalid:bg-danger data-invalid:text-danger-fg forced-colors:bg-[Highlight] forced-colors:text-[Highlight] forced-colors:data-invalid:bg-[Mark]",
                  isDisabled && "text-muted-fg forced-colors:text-[GrayText]",
                  date.compare(now) === 0 &&
                    "after:bg-primary selected:after:bg-primary-fg focus-visible:after:bg-primary-fg after:pointer-events-none after:absolute after:start-1/2 after:bottom-1 after:z-10 after:size-0.75 after:-translate-x-1/2 after:rounded-full",
                  className,
                ),
              )}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </CalendarPrimitive>
  );
};

const CalendarHeader = ({
  isRange,
  className,
  ...props
}: React.ComponentProps<"header"> & { isRange?: boolean }) => {
  const { direction } = useLocale();
  return (
    <header
      data-slot="calendar-header"
      className={twMerge(
        "flex w-full justify-between gap-1.5 ps-1.5 pe-1 pt-1 pb-5 sm:pb-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-1.5">
        <SelectMonth />
        <SelectYear />
      </div>
      <Heading className="sr-only" />
      <div className="flex items-center gap-1">
        <Button
          size="sq-sm"
          className="**:data-[slot=icon]:text-fg size-8 sm:size-7"
          isCircle
          intent="plain"
          slot="previous"
        >
          {direction === "rtl" ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </Button>
        <Button
          size="sq-sm"
          className="**:data-[slot=icon]:text-fg size-8 sm:size-7"
          isCircle
          intent="plain"
          slot="next"
        >
          {direction === "rtl" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </Button>
      </div>
    </header>
  );
};

interface CalendarDropdown {
  id: number;
  date: CalendarDate;
  formatted: string;
}

const SelectMonth = () => {
  const calendarState = use(CalendarStateContext);
  const rangeCalendarState = use(RangeCalendarStateContext);
  const state = calendarState || rangeCalendarState!;
  const formatter = useDateFormatter({
    month: "short",
    timeZone: state.timeZone,
  });

  const months: CalendarDropdown[] = [];
  const numMonths = state.focusedDate.calendar.getMonthsInYear(state.focusedDate);
  for (let i = 1; i <= numMonths; i++) {
    const date = state.focusedDate.set({ month: i });
    months.push({
      id: i,
      date,
      formatted: formatter.format(date.toDate(state.timeZone)),
    });
  }

  return (
    <Select
      className="[popover-width:8rem]"
      aria-label="Month"
      style={{ flex: 1, width: "fit-content" }}
      value={state.focusedDate.month}
      onChange={(key) => {
        if (typeof key === "number") {
          state.setFocusedDate(months[key - 1]!.date);
        }
      }}
    >
      <SelectTrigger className="w-22 text-sm/5 **:data-[slot=select-value]:inline-block **:data-[slot=select-value]:truncate sm:px-2.5 sm:py-1.5 sm:*:text-sm/5" />
      <SelectContent className="min-w-0" items={months}>
        {(item) => (
          <SelectItem>
            <SelectLabel>{item.formatted}</SelectLabel>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

const SelectYear = () => {
  const calendarState = use(CalendarStateContext);
  const rangeCalendarState = use(RangeCalendarStateContext);
  const state = calendarState || rangeCalendarState!;
  const formatter = useDateFormatter({
    year: "numeric",
    timeZone: state.timeZone,
  });

  // Determine year range from minValue/maxValue or default to ±20 years
  const currentYear = state.focusedDate.year;
  const minYear = state.minValue?.year ?? currentYear - 20;
  const maxYear = state.maxValue?.year ?? currentYear + 20;

  const years: CalendarDropdown[] = [];
  for (let year = minYear; year <= maxYear; year++) {
    const date = state.focusedDate.set({ year });
    years.push({
      id: years.length,
      date,
      formatted: formatter.format(date.toDate(state.timeZone)),
    });
  }

  // Find the index of the current focused year
  const selectedIndex = years.findIndex((y) => y.date.year === state.focusedDate.year);

  return (
    <Select
      aria-label="Year"
      value={selectedIndex}
      onChange={(key) => {
        if (typeof key === "number") {
          state.setFocusedDate(years[key]!.date);
        }
      }}
    >
      <SelectTrigger className="text-sm/5 sm:px-2.5 sm:py-1.5 sm:*:text-sm/5" />
      <SelectContent items={years}>
        {(item) => (
          <SelectItem>
            <SelectLabel>{item.formatted}</SelectLabel>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

const CalendarGridHeader = () => {
  return (
    <CalendarGridHeaderPrimitive>
      {(day) => (
        <CalendarHeaderCell className="text-muted-fg pb-2 text-center text-sm/6 font-semibold sm:px-0 sm:py-0.5 lg:text-xs">
          {day}
        </CalendarHeaderCell>
      )}
    </CalendarGridHeaderPrimitive>
  );
};

export type { CalendarProps };
export { Calendar, SelectMonth, SelectYear, CalendarHeader, CalendarGridHeader };
