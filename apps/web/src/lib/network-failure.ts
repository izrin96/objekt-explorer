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

/** A request cut off before or during its response (offline, app backgrounded, navigation): not our bug. */
export function isNetworkFailure(error: unknown, depth = 0): boolean {
  if (error instanceof TypeError) return isNetworkMessage(error.message);
  if (!(error instanceof Error) || depth > 4) return false;
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
