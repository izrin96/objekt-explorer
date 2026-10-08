import { toastManager } from "@/components/ui/toast";

type ToastOptions = Parameters<typeof toastManager.add>[0];

/**
 * A toast with one action that closes it: Base UI leaves the toast up after its action is
 * clicked, and the pointer still on it pauses the timeout, so it would never go.
 */
export function addActionToast(
  options: Omit<ToastOptions, "actionProps">,
  action: { label: string; onClick: () => void },
) {
  const id = toastManager.add({
    ...options,
    actionProps: {
      children: action.label,
      onClick: () => {
        toastManager.close(id);
        action.onClick();
      },
    },
  });
  return id;
}
