import { formatTimestamp } from "@/lib/time";

export function Timestamp({ date, className }: { date: Date; className?: string }) {
  return (
    <time dateTime={date.toISOString()} className={className}>
      {formatTimestamp(date)}
    </time>
  );
}
