import type { NotificationType } from "@repo/api/schemas/notification";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { notificationPrefsOptions } from "@/features/notifications/queries";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

const PREF_ROWS: { type: NotificationType; label: () => string; description: () => string }[] = [
  {
    type: "want_match",
    label: m.notification_pref_want_match,
    description: m.notification_pref_want_match_desc,
  },
  {
    type: "have_wanted",
    label: m.notification_pref_have_wanted,
    description: m.notification_pref_have_wanted_desc,
  },
  {
    type: "offer",
    label: m.notification_pref_offer,
    description: m.notification_pref_offer_desc,
  },
  {
    type: "trade",
    label: m.notification_pref_trade,
    description: m.notification_pref_trade_desc,
  },
];

/** Each switch saves on its own. */
export function NotificationsSection() {
  const queryClient = useQueryClient();
  const options = notificationPrefsOptions();
  const prefs = useQuery(options);
  const { queryKey } = options;

  const mutation = useMutation(
    orpc.notifications.setPref.mutationOptions({
      onMutate: async ({ type, enabled }) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old) => (old ? { ...old, [type]: enabled } : old));
        return { previous };
      },
      onError: (_error, _input, context) => {
        queryClient.setQueryData(queryKey, context?.previous);
        toastManager.add({ type: "error", title: m.notification_pref_error() });
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey }),
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      {PREF_ROWS.map((row) => (
        <Label
          key={row.type}
          htmlFor={`account-notify-${row.type}`}
          className="flex items-start justify-between gap-4 font-normal"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{row.label()}</span>
            <span className="text-muted-foreground text-xs text-pretty">{row.description()}</span>
          </span>
          <Switch
            id={`account-notify-${row.type}`}
            className="mt-0.5 shrink-0"
            checked={prefs.data?.[row.type] ?? false}
            disabled={!prefs.data}
            onCheckedChange={(enabled) => mutation.mutate({ type: row.type, enabled })}
          />
        </Label>
      ))}
    </div>
  );
}
