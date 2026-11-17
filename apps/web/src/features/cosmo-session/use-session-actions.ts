import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

import { cosmoSessionsOptions } from "./queries";

/** Sync now and Disconnect: each refetches the list, and a refusal reads through `refusalText`. */
export function useSessionActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: cosmoSessionsOptions.queryKey });
  const fail = (error: unknown) => toastManager.add({ type: "error", title: refusalText(error) });

  return {
    sync: useMutation(
      orpc.cosmoSession.requestSync.mutationOptions({ onSuccess: refresh, onError: fail }),
    ),
    disconnect: useMutation(
      orpc.cosmoSession.disconnect.mutationOptions({
        onSuccess: async ({ confirmed }) => {
          await refresh();
          if (!confirmed) {
            toastManager.add({ type: "warning", title: m.cosmo_session_disconnect_unconfirmed() });
          }
        },
        onError: fail,
      }),
    ),
  };
}
