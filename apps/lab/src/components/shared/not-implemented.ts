import { toastManager } from "@/components/ui/toast";

type Toast = Parameters<typeof toastManager.add>[0];

/**
 * A toast standing in for something the lab does not model — sharing a link,
 * exporting a CSV, copying the Discord format, deleting an account, locking an
 * objekt. It forwards its argument to `toastManager.add` untouched, so the
 * surface reads exactly as it did before; the point is that `notImplemented`
 * is greppable and `toastManager.add` now means "this really happened".
 *
 * A call that starts writing to a store belongs back on `toastManager.add`.
 */
export function notImplemented(toast: Toast): void {
  toastManager.add(toast);
}
