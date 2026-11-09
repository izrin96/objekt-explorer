export type Running = { label: string; startedAt: number };

const SHOWN = 5;

/**
 * One log line for a blocked event loop: how long, and the requests in flight, oldest first. The
 * thread runs one of them at a time, so the culprit is among them, usually the oldest page render.
 */
export function stallReport(blockedMs: number, running: Iterable<Running>, now: number): string {
  const sorted = [...running].toSorted((a, b) => a.startedAt - b.startedAt);
  const shown = sorted
    .slice(0, SHOWN)
    .map((item) => `${item.label} (${String(Math.round(now - item.startedAt))} ms)`);
  const more = sorted.length > SHOWN ? `, and ${String(sorted.length - SHOWN)} more` : "";
  const list = shown.length > 0 ? shown.join(", ") + more : "no request in flight";
  return `[loop] blocked ${String(Math.round(blockedMs))} ms; in flight: ${list}`;
}

const ADDRESS = /^0x[0-9a-f]{40}$/i;

// a Better Auth path can carry a secret (`/api/auth/reset-password/<token>`), so only its endpoint is kept
const AUTH_PREFIX = "/api/auth/";

/**
 * A request's method and path as logs show it: profile and address segments collapsed, so a route
 * counts as one and names no one, and an auth path cut after its endpoint.
 */
export function routeKey(method: string, pathname: string): string {
  if (pathname.startsWith(AUTH_PREFIX)) {
    const [endpoint, ...rest] = pathname.slice(AUTH_PREFIX.length).split("/");
    return `${method} ${AUTH_PREFIX}${endpoint ?? ""}${rest.length > 0 ? "/…" : ""}`;
  }
  const path = pathname
    .split("/")
    .map((segment) => {
      if (ADDRESS.test(segment)) return ":address";
      if (segment.startsWith("@")) return "@:handle";
      return segment;
    })
    .join("/");
  return `${method} ${path}`;
}

/**
 * One log line for a window the process spent mostly on the CPU: many short tasks starve the loop
 * as surely as one long one, but no single block shows it.
 */
export function busyReport(cpuShare: number, windowMs: number, routes: Map<string, number>) {
  const top = [...routes]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, SHOWN)
    .map(([route, count]) => `${String(count)}× ${route}`);
  const list = top.length > 0 ? top.join(", ") : "none";
  return `[loop] CPU ${String(Math.round(cpuShare * 100))}% over the last ${String(Math.round(windowMs / 1000))} s; requests: ${list}`;
}
