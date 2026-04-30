import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
// polyfills
import "core-js/actual/array/to-sorted";
import "core-js/actual/array/to-reversed";
import "core-js/actual/array/find-last";
import "core-js/actual/array/at";

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);
