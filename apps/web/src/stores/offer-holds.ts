import { create } from "zustand";

import { toastManager } from "@/components/ui/toast";
import {
  type HeldAction,
  HOLD_MS,
  holdNotice,
  withHold,
  withoutHold,
} from "@/features/offers/hold";
import { addActionToast } from "@/lib/action-toast";
import { m } from "@/paraglide/messages";

/** The held Decline or Withdraw of each offer, by offer id. In memory only: a reload drops it. */
export const useOfferHolds = create<{ holds: Record<number, HeldAction> }>(() => ({
  holds: {},
}));

type Pending = { timer: ReturnType<typeof setTimeout>; toastId: string; onUndo: () => void };

/** Outside the store so a hold outlives the card that started it. */
const pending = new Map<number, Pending>();

const drop = (offerId: number) =>
  useOfferHolds.setState((state) => ({ holds: withoutHold(state.holds, offerId) }));

/** `send` is the action's mutation; it runs when the hold ends. `onUndo` runs after a cancel. */
export function holdOfferAction(
  offerId: number,
  action: HeldAction,
  { send, onUndo }: { send: () => void; onUndo: () => void },
) {
  if (pending.has(offerId)) return;
  const toastId = addActionToast(
    { type: "success", title: holdNotice(action), timeout: HOLD_MS },
    { label: m.chat_undo(), onClick: () => cancelOfferHold(offerId) },
  );
  const timer = setTimeout(() => {
    pending.delete(offerId);
    drop(offerId);
    send();
  }, HOLD_MS);
  pending.set(offerId, { timer, toastId, onUndo });
  useOfferHolds.setState((state) => ({ holds: withHold(state.holds, offerId, action) }));
}

export function cancelOfferHold(offerId: number) {
  const hold = pending.get(offerId);
  if (!hold) return;
  clearTimeout(hold.timer);
  pending.delete(offerId);
  toastManager.close(hold.toastId);
  drop(offerId);
  hold.onUndo();
}
