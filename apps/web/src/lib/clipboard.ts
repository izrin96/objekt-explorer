import { toastManager } from "@/components/ui/toast";
import { m } from "@/paraglide/messages";

/** Copies `text` and says so; when the clipboard is blocked the toast carries the text instead. */
export async function copyWithToast(
  text: string,
  success: { title: string; description?: string },
) {
  try {
    await navigator.clipboard.writeText(text);
    toastManager.add({ type: "success", ...success });
  } catch {
    toastManager.add({ type: "error", title: m.common_copy_blocked(), description: text });
  }
}
