import { log } from "../../lib/log";

const verifierLog = log("verifier");

/**
 * One trade's step of a run. A step that throws is logged and skipped, so one bad trade can't
 * stop the rest of the run (and everything after it) for every user.
 */
export async function oneTrade<T>(tradeId: number, step: () => Promise<T>): Promise<T | null> {
  try {
    return await step();
  } catch (error) {
    verifierLog.error(`Trade ${tradeId} failed; skipped this run:`, error);
    return null;
  }
}
