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
import { useRef, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useFilters } from "@/hooks/use-filters";
import { getUserLocale } from "@/lib/utils";

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
  return new DateFormatter(getUserLocale(), {
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
  const content = useIntlayer("checkpoint");
  const [filters, setFilters] = useFilters();
  const currentValue = safeParse(filters.at);
  const triggerRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(
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
        <ClockCounterClockwiseIcon data-slot="icon" />
        {formatCheckpointLabel(filters.at, content.title.value)}
      </Button>
      <PopoverContent
        placement="bottom left"
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <PopoverHeader>
          <PopoverTitle>{content.title.value}</PopoverTitle>
          <PopoverDescription>{content.description.value}</PopoverDescription>
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
          <PopoverClose onPress={() => setIsOpen(false)}>{content.close.value}</PopoverClose>
          <Button onPress={handleApply} isDisabled={!selectedDate || !selectedTime}>
            {content.apply.value}
          </Button>
        </PopoverFooter>
      </PopoverContent>

      {filters.at && (
        <Button intent="outline" onPress={() => setFilters({ at: null })}>
          <XIcon data-slot="icon" />
          {content.reset.value}
        </Button>
      )}
    </div>
  );
}
