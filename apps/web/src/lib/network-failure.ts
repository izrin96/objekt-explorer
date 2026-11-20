// what Safari, Chrome and Firefox name a fetch that got no response
const NETWORK_FAILURE = new Set([
  "Load failed",
  "Failed to fetch",
  "NetworkError when attempting to fetch resource.",
]);

// Chrome 156 appends the host, as in "Failed to fetch (objekt.top)" (WEB-2N)
const HOST_SUFFIX = / \([^()]+\)$/;

function isNetworkMessage(message: string) {
  return NETWORK_FAILURE.has(message) || NETWORK_FAILURE.has(message.replace(HOST_SUFFIX, ""));
}

/**
 * An error by its `name` rather than `instanceof`, which fails for one built in another realm:
 * Opera GX on iOS wraps `fetch` from an injected script world, so its failures reject with that
 * world's TypeError (WEB-35).
 */
export function isNamedError(error: unknown, name?: string): error is Error {
  if (typeof error !== "object" || error === null) return false;
  const { name: own, message } = error as { name?: unknown; message?: unknown };
  return typeof own === "string" && typeof message === "string" && (!name || own === name);
}

/** A request cut off before or during its response (offline, app backgrounded, navigation): not our bug. */
export function isNetworkFailure(error: unknown, depth = 0): boolean {
  if (isNamedError(error, "TypeError")) return isNetworkMessage(error.message);
  if (!isNamedError(error) || depth > 4) return false;
  // ofetch's FetchError keeps the browser's TypeError as its cause
  if (error.name === "FetchError") {
    return (
      (error as { response?: unknown }).response === undefined &&
      isNetworkFailure(error.cause, depth + 1)
    );
  }
  // oRPC wraps a body cut off mid-read in "Cannot parse response body" (WEB-13)
  return (
    error.message.startsWith("Cannot parse response body") &&
    isNetworkFailure(error.cause, depth + 1)
  );
}
