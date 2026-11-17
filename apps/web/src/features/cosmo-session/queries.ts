import { LOADER_READ_STALE_MS, orpc } from "@/lib/orpc";

/** The user's own Cosmo sessions; a row that is waiting for a sync makes the section refetch. */
export const cosmoSessionsOptions = orpc.cosmoSession.list.queryOptions({
  staleTime: LOADER_READ_STALE_MS,
  retry: false,
});

/** Sync now's pending row refetches this often until the worker has run it. */
export const SYNC_POLL_MS = 10_000;

/** The code step's status check, every 3 s: the app only changes state when the user acts on the phone. */
export const QR_POLL_MS = 3_000;
