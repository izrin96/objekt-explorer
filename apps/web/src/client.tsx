import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import { initClientErrorTracking, reportUncaught } from "@/lib/error-tracking";

initClientErrorTracking();

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
  // caught errors are reported by the route and widget boundaries, which know a refusal
  { onUncaughtError: reportUncaught },
);
