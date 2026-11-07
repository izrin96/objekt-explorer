/**
 * Fetches a lazily loaded chunk once the page has loaded and the browser is idle: the code stays
 * out of the first paint, yet is cached before the first open, which then mounts at once and
 * animates instead of popping in after the download. A failed fetch is left to the open to retry.
 */
export function preloadWhenIdle(load: () => Promise<unknown>) {
  const run = () => void load().catch(() => undefined);
  const whenIdle = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 5000 });
    else setTimeout(run, 2000);
  };
  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });
}
