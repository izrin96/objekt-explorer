import { getLocale } from "@/paraglide/runtime";

/** A UTC day read in the viewer's zone would show the day before, west of UTC. */
export function formatUtcDay(date: string, style: "short" | "long" = "long") {
  return new Intl.DateTimeFormat(getLocale(), {
    day: "numeric",
    month: "short",
    ...(style === "long" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
