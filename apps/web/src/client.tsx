import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import {
  initClientErrorTracking,
  reportRecoverable,
  reportUncaught,
  stopReportingForReload,
} from "@/lib/error-tracking";

initClientErrorTracking();

// a chunk this tab's build names is gone (a deploy older than the server's archive): load the new
// build once; a second failure within a minute is left to throw, so a missing chunk cannot loop
const RELOADED_AT = "chunk-reload-at";
window.addEventListener("vite:preloadError", (event) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOADED_AT)) < 60_000) return;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  stopReportingForReload();
  window.location.reload();
});

function hydrate() {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
    // caught errors are reported by the route and widget boundaries, which know a refusal
    { onUncaughtError: reportUncaught, onRecoverableError: reportRecoverable },
  );
}

// only browsers missing these download the polyfill; a failed download still hydrates
if (typeof Object.groupBy === "function" && typeof Map.groupBy === "function") hydrate();
else void import("@/lib/polyfills").catch(() => {}).then(hydrate);
