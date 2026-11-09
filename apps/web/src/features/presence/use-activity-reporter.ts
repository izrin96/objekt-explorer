import { useEffect } from "react";

import { client } from "@/lib/orpc";

import { failedReportAt, lastReportKey, shouldReport, storedLastReport } from "./activity";

// no `scroll`: it also fires for scrolls the app makes, such as a thread following a new message;
// `pointerdown` covers touch
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel"] as const;

function readShared(key: string, now: number) {
  try {
    return storedLastReport(localStorage.getItem(key), now);
  } catch {
    return undefined;
  }
}

function writeShared(key: string, at: number) {
  try {
    localStorage.setItem(key, String(at));
  } catch {
    // storage blocked: this tab still keeps its own pace
  }
}

/**
 * Tells the server the viewer is active, at most once a minute across all their tabs and only
 * from a tab in front, so others see them idle once every tab has gone quiet.
 */
export function useActivityReporter(userId: string) {
  useEffect(() => {
    const key = lastReportKey(userId);
    let lastReport: number | undefined;

    const onActivity = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      // storage is read only once this tab's own clock allows, since pointermove fires per frame
      if (!shouldReport(lastReport, now)) return;
      // the mark is per person, so a report from another tab covers this one; without sharing,
      // switching through a dozen tabs within a minute runs into the server's limit
      const shared = readShared(key, now);
      if (shared !== undefined && !shouldReport(shared, now)) {
        lastReport = shared;
        return;
      }
      lastReport = now;
      writeShared(key, now);
      // the person never sees a refusal or a failure; activity tries again shortly
      void client.presence.active().catch(() => {
        lastReport = failedReportAt(Date.now());
        // a later report from another tab may have landed meanwhile; never roll it back
        if (readShared(key, Date.now()) === now) writeShared(key, lastReport);
      });
    };

    const options = { capture: true, passive: true };
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, options);
    document.addEventListener("visibilitychange", onActivity);
    onActivity();

    return () => {
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity, options);
      document.removeEventListener("visibilitychange", onActivity);
    };
  }, [userId]);
}
