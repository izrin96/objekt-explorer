import {
  type Time,
  CalendarDate,
  DateFormatter,
  GregorianCalendar,
  getLocalTimeZone,
  now,
  parseAbsolute,
  toCalendarDate,
  toCalendarDateTime,
  toTime,
} from "@internationalized/date";
import { ClockCounterClockwiseIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { useFilters } from "@/hooks/use-filters";
import { getClientLocale } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Calendar } from "../intentui/calendar";
import {
  PopoverBody,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverFooter,
  PopoverHeader,
  PopoverTitle,
} from "../intentui/popover";
import { TimeField, TimeInput } from "../intentui/time-field";

function safeParse(isoStr: string | null) {
  if (!isoStr) return null;
  try {
    return parseAbsolute(isoStr, getLocalTimeZone());
  } catch {
    return null;
  }
}

function formatCheckpointLabel(isoStr: string | null, defaultLabel: string) {
  if (!isoStr) return defaultLabel;
  const parsed = safeParse(isoStr);
  if (!parsed) return defaultLabel;

  const date = parsed.toDate();
  return new DateFormatter(getClientLocale(), {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export default function CheckpointPicker() {
  const [filters, setFilters] = useFilters();
  const triggerRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(null);
  const [selectedTime, setSelectedTime] = useState<Time | null>(null);
  const [maxDate, setMaxDate] = useState<CalendarDate | null>(null);

  // Sync client-only values from filters on mount.
  useEffect(() => {
    setMaxDate(toCalendarDate(now(getLocalTimeZone())));
    const parsed = safeParse(filters.at);
    if (parsed) {
      setSelectedDate(toCalendarDate(parsed));
      setSelectedTime(toTime(parsed));
    }
  }, []);

  const handleApply = () => {
    if (!selectedDate || !selectedTime) return;

    const dateTime = toCalendarDateTime(selectedDate, selectedTime);
    const isoString = dateTime.toDate(getLocalTimeZone()).toISOString();
    setIsOpen(false);
    void setFilters({ at: isoString });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        ref={triggerRef}
        intent="outline"
        data-selected={filters.at}
        onPress={() => setIsOpen(true)}
      >
        <ClockCounterClockwiseIcon />
        <ClientOnly fallback={m.checkpoint_title()}>
          {filters.at
            ? formatCheckpointLabel(filters.at, m.checkpoint_title())
            : m.checkpoint_title()}
        </ClientOnly>
      </Button>
      <PopoverContent
        placement="bottom left"
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <PopoverHeader>
          <PopoverTitle>{m.checkpoint_title()}</PopoverTitle>
          <PopoverDescription>{m.checkpoint_description()}</PopoverDescription>
        </PopoverHeader>
        <PopoverBody className="space-y-4 select-none">
          <div className="flex flex-col items-center gap-3">
            <Calendar
              value={selectedDate}
              onChange={setSelectedDate}
              maxValue={maxDate}
              minValue={new CalendarDate(new GregorianCalendar(), 2022, 8, 1)}
            />
            <TimeField
              value={selectedTime}
              onChange={setSelectedTime}
              hourCycle={12}
              granularity="second"
            >
              <TimeInput />
            </TimeField>
          </div>
        </PopoverBody>
        <PopoverFooter>
          <PopoverClose onPress={() => setIsOpen(false)}>{m.checkpoint_close()}</PopoverClose>
          <Button onPress={handleApply} isDisabled={!selectedDate || !selectedTime}>
            {m.checkpoint_apply()}
          </Button>
        </PopoverFooter>
      </PopoverContent>

      {filters.at && (
        <Button intent="outline" onPress={() => setFilters({ at: null })}>
          <XIcon />
          {m.checkpoint_reset()}
        </Button>
      )}
    </div>
  );
}
