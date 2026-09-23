/**
 * Stand-in for the website's `orpc.status.get`: there is no public status
 * endpoint, so the lab ships a deterministic payload of the same shape.
 */
export type LabStatus = {
  database: { behind: boolean; latestTransferDate: string };
  cosmo: { status: "up" | "partial" | "down" };
};

const MINUTE_MS = 60_000;

/** Knuth multiplicative hash: stable inside one minute, moves on at the next. */
const phase = (Math.imul(Math.floor(Date.now() / MINUTE_MS), 2654435761) >>> 0) % 3;

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE_MS).toISOString();

/**
 * Cycles up / partial / down so all three trigger tints and both database
 * badges can be checked by reloading, without a backend to drive them.
 */
export const status: LabStatus =
  phase === 0
    ? { cosmo: { status: "up" }, database: { behind: false, latestTransferDate: minutesAgo(0.4) } }
    : phase === 1
      ? {
          cosmo: { status: "partial" },
          database: { behind: false, latestTransferDate: minutesAgo(1.2) },
        }
      : {
          cosmo: { status: "down" },
          database: { behind: true, latestTransferDate: minutesAgo(47) },
        };
