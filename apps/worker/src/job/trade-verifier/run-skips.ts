import { log } from "../../lib/log";

const verifierLog = log("verifier");

/** Runs in a row a trade must fail before it is reported as an error, not a retry. */
const REPORT_AFTER_RUNS = 3;
const failingRuns = new Map<number, number>();

/**
 * The trades one run skipped because their step threw, so one bad trade can't stop the run for
 * every user; expiry leaves them alone, since their transfers may not be settled yet.
 */
export function runSkips() {
  const skipped = new Map<number, unknown>();
  return {
    has: (tradeId: number) => skipped.has(tradeId),
    async step<T>(tradeId: number, step: () => Promise<T>): Promise<T | null> {
      try {
        const result = await step();
        failingRuns.delete(tradeId);
        return result;
      } catch (error) {
        skipped.set(tradeId, error);
        return null;
      }
    },
    /** One warning a run; a trade that keeps failing is reported once, as an error. */
    report() {
      if (skipped.size === 0) return;
      for (const [tradeId, error] of skipped) {
        const runs = (failingRuns.get(tradeId) ?? 0) + 1;
        failingRuns.set(tradeId, runs);
        if (runs === REPORT_AFTER_RUNS) {
          verifierLog.error(`Trade ${tradeId} failed ${runs} runs in a row:`, error);
        }
      }
      const [first] = skipped.values();
      verifierLog.warn(
        `Skipped ${skipped.size} trades that failed (${[...skipped.keys()].join(", ")}), retrying next run:`,
        String(first),
      );
    },
  };
}

export type RunSkips = ReturnType<typeof runSkips>;
