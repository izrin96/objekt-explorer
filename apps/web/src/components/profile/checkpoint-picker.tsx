"use client";

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
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { useFilters } from "@/hooks/use-filters";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import {
  PopoverBody,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverFooter,
  PopoverHeader,
  PopoverTitle,
} from "../ui/popover";
import { TimeField, TimeInput } from "../ui/time-field";

const TIME_ZONE = getLocalTimeZone();

function safeParse(isoStr: string | null) {
  if (!isoStr) return null;
  try {
    return parseAbsolute(isoStr, TIME_ZONE);
  } catch {
    return null;
  }
}

function formatCheckpointLabel(isoStr: string | null, defaultLabel: string) {
  if (!isoStr) return defaultLabel;
  const parsed = safeParse(isoStr);
  if (!parsed) return defaultLabel;

  const date = parsed.toDate();
  return new DateFormatter(Intl.DateTimeFormat().resolvedOptions().locale, {
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
  const t = useTranslations("checkpoint");
  const [filters, setFilters] = useFilters();
  const currentValue = safeParse(filters.at);
  const triggerRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(
    currentValue ? toCalendarDate(currentValue) : null,
  );
  const [selectedTime, setSelectedTime] = useState<Time | null>(
    currentValue ? toTime(currentValue) : toTime(now(TIME_ZONE)),
  );

  const handleApply = () => {
    if (!selectedDate || !selectedTime) return;

    // Combine date and time into CalendarDateTime
    const dateTime = toCalendarDateTime(selectedDate, selectedTime);
    const isoString = dateTime.toDate(TIME_ZONE).toISOString();
    setIsOpen(false);
    return setFilters({ at: isoString });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        ref={triggerRef}
        intent="outline"
        data-selected={filters.at}
        onPress={() => setIsOpen(true)}
      >
        <ClockCounterClockwiseIcon data-slot="icon" />
        {formatCheckpointLabel(filters.at, t("title"))}
      </Button>
      <PopoverContent
        placement="bottom left"
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <PopoverHeader>
          <PopoverTitle>{t("title")}</PopoverTitle>
          <PopoverDescription>{t("description")}</PopoverDescription>
        </PopoverHeader>
        <PopoverBody className="space-y-4 select-none">
          <div className="flex flex-col items-center gap-3">
            <Calendar
              value={selectedDate}
              onChange={setSelectedDate}
              maxValue={toCalendarDate(now(TIME_ZONE))}
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
          <PopoverClose onPress={() => setIsOpen(false)}>{t("close")}</PopoverClose>
          <Button onPress={handleApply} isDisabled={!selectedDate || !selectedTime}>
            {t("apply")}
          </Button>
        </PopoverFooter>
      </PopoverContent>

      {filters.at && (
        <Button intent="outline" onPress={() => setFilters({ at: null })}>
          <XIcon data-slot="icon" />
          {t("reset")}
        </Button>
      )}
    </div>
  );
}
