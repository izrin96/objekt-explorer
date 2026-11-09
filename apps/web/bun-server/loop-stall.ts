import { log } from "./config";
import { busyReport, routeKey, type Running, stallReport } from "./stall-report";

const TICK_MS = 50;
const STALL_MS = 100;
const BUSY_WINDOW_MS = 10_000;
const BUSY_SHARE = 0.7;
// backstop for an end that never fires; aborts and HEAD requests end on their own
const FORGET_AFTER_MS = 60_000;

const running = new Map<number, Running>();
const routes = new Map<string, number>();
let nextId = 0;

/**
 * Marks a request as in flight under its `routeKey`, so no log line carries a handle, an address
 * or an auth token. It ends when the client disconnects, or when the returned function is called.
 */
export function startRequest(request: Request, pathname: string): () => void {
  const id = nextId++;
  const route = routeKey(request.method, pathname);
  running.set(id, { label: route, startedAt: performance.now() });
  routes.set(route, (routes.get(route) ?? 0) + 1);
  const end = () => running.delete(id);
  request.signal.addEventListener("abort", end, { once: true });
  return end;
}

/**
 * Ends the request once its body has been sent. SSR streams, so React renders while the body is
 * read, well after the handler returned its Response. A HEAD response's body is never read.
 */
export function endAfterBody(request: Request, response: Response, end: () => void): Response {
  if (!response.body || request.method === "HEAD") {
    end();
    return response;
  }
  return new Response(response.body.pipeThrough(new TransformStream({ flush: end })), response);
}

/**
 * Logs a single block of `STALL_MS` or more, naming what was in flight, and any window in which the
 * process used over `BUSY_SHARE` of a core, with the routes it served. The process figure counts
 * zlib's and the collector's threads too, so it can pass 100%.
 */
export function watchLoopStalls() {
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const blocked = now - last - TICK_MS;
    last = now;
    for (const [id, item] of running) {
      if (now - item.startedAt > FORGET_AFTER_MS) running.delete(id);
    }
    if (blocked >= STALL_MS) log.warning(stallReport(blocked, running.values(), now));
  }, TICK_MS);

  let cpu = process.cpuUsage();
  let since = performance.now();
  setInterval(() => {
    const used = process.cpuUsage(cpu);
    const now = performance.now();
    const share = (used.user + used.system) / 1000 / (now - since);
    if (share >= BUSY_SHARE) log.warning(busyReport(share, now - since, routes));
    cpu = process.cpuUsage();
    since = now;
    routes.clear();
  }, BUSY_WINDOW_MS);
}
