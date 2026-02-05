"use client";

import { type Time, CalendarDate, GregorianCalendar } from "@internationalized/date";
import {
  getLocalTimeZone,
  now,
  parseAbsolute,
  toCalendarDate,
  toCalendarDateTime,
  toTime,
} from "@internationalized/date";
import { ClockCounterClockwiseIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { useFilters } from "@/hooks/use-filters";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "../ui/modal";
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

function formatCheckpointLabel(isoStr: string | null) {
  if (!isoStr) return "Time Travel";
  const parsed = safeParse(isoStr);
  if (!parsed) return "Time Travel";

  const date = parsed.toDate();
  return new Intl.DateTimeFormat(undefined, {
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
  const currentValue = safeParse(filters.at);

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
      <Button intent="outline" data-selected={filters.at} onPress={() => setIsOpen(true)}>
        <ClockCounterClockwiseIcon data-slot="icon" />
        {formatCheckpointLabel(filters.at)}
      </Button>
      <ModalContent size="sm" isOpen={isOpen} onOpenChange={setIsOpen}>
        <ModalHeader>
          <ModalTitle>Time Travel</ModalTitle>
          <ModalDescription>View collection at given time</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4 select-none">
          <div className="flex h-110 flex-col items-center gap-3 sm:h-86">
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
        </ModalBody>
        <ModalFooter>
          <ModalClose>Close</ModalClose>
          <Button onPress={handleApply} isDisabled={!selectedDate || !selectedTime}>
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>

      {filters.at && (
        <Button intent="outline" onPress={() => setFilters({ at: null })}>
          <XIcon data-slot="icon" />
          Reset
        </Button>
      )}
    </div>
  );
}
