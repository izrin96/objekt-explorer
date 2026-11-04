/**
 * A running trade's steps, in the order `tradeStep` tries them. `needsYouSql`
 * (services/chat/deal.ts) is the SQL twin of the steps `NEEDS_YOU_STATES` names.
 */
export const TRADE_STEPS = [
  "theyAskCancel",
  "youAskCancel",
  "youDecide",
  "yourTurn",
  "theirTurn",
  "stuck",
  "theyDecide",
] as const;
export type TradeStep = (typeof TRADE_STEPS)[number];

/** A running trade from the viewer's side. Every count is of open, unverified legs. */
export type TradeCounts = {
  /** legs the viewer gives */
  owed: number;
  /** of those, transferable and with no different copy waiting */
  sendable: number;
  /** of those, not transferable */
  stuck: number;
  /** legs the viewer receives that hold a different copy for them to decide on */
  toDecide: number;
  /** who asked to cancel, while a request is open */
  cancelAsk: "you" | "them" | null;
};

/**
 * The first step that applies wins: Decision 1 of `trade-page-redesign`'s design.md, under the
 * tag `openspec-archive-2026-10-19`.
 */
export function tradeStep(t: TradeCounts): TradeStep {
  if (t.cancelAsk === "them") return "theyAskCancel";
  if (t.cancelAsk === "you") return "youAskCancel";
  if (t.toDecide > 0) return "youDecide";
  if (t.sendable > 0) return "yourTurn";
  if (t.owed === 0) return "theirTurn";
  return t.stuck > 0 ? "stuck" : "theyDecide";
}
