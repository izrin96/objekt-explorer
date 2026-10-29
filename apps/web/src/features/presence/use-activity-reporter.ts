import { useEffect } from "react";

import { client } from "@/lib/orpc";

import { failedReportAt, shouldReport } from "./activity";

// no `scroll`: it also fires for scrolls the app makes, such as a thread following a new message;
// `pointerdown` covers touch
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel"] as const;

/**
 * Tells the server the viewer is active, at most once a minute and only while this tab is in
 * front, so others see them idle once every tab has gone quiet.
 */
export function useActivityReporter() {
  useEffect(() => {
    let lastReport: number | undefined;

    const onActivity = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!shouldReport(lastReport, now)) return;
      lastReport = now;
      // the person never sees a refusal or a failure; activity tries again shortly
      void client.presence.active().catch(() => {
        lastReport = failedReportAt(Date.now());
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
  }, []);
}
