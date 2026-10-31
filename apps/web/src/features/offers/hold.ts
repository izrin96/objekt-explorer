import { m } from "@/paraglide/messages";

export const HOLD_MS = 5000;

export type HeldAction = "decline" | "withdraw";

export const holdNotice = (action: HeldAction) =>
  action === "decline" ? m.offer_toast_declined() : m.offer_toast_withdrawn();

export const holdLine = (action: HeldAction) =>
  action === "decline" ? m.offer_declining() : m.offer_withdrawing();

export const withHold = (
  holds: Readonly<Record<number, HeldAction>>,
  offerId: number,
  action: HeldAction,
): Record<number, HeldAction> => ({ ...holds, [offerId]: action });

export const withoutHold = (
  holds: Readonly<Record<number, HeldAction>>,
  offerId: number,
): Record<number, HeldAction> => {
  const { [offerId]: _, ...rest } = holds;
  return rest;
};
