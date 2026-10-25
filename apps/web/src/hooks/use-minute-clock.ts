import { useEffect, useState } from "react";

const MINUTE = 60_000;

/** The current time, read again once a minute, for views that stay open while time passes. */
export function useMinuteClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(timer);
  }, []);
  return now;
}
