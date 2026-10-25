import type { AlertMatchMode, AlertType, NotificationType } from "@repo/api/schemas/notification";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { notificationPrefsOptions } from "@/features/notifications/queries";
import { SegmentedChoice } from "@/features/offers/segmented-choice";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

type AlertChoice = "off" | AlertMatchMode;

const ALERT_ROWS: { type: AlertType; label: () => string; description: () => string }[] = [
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
];

const SWITCH_ROWS: { type: NotificationType; label: () => string; description: () => string }[] = [
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

const CHOICE_DESCRIPTION: Record<AlertChoice, () => string> = {
  off: m.notification_alert_off_desc,
  any: m.notification_alert_any_desc,
  mutual: m.notification_alert_mutual_desc,
};

/** Each setting saves on its own. */
export function NotificationsSection() {
  const queryClient = useQueryClient();
  const options = notificationPrefsOptions();
  const prefs = useQuery(options);
  const { queryKey } = options;

  const optimistic = {
    onError: (_error: unknown, _input: unknown, context: { previous: unknown } | undefined) => {
      queryClient.setQueryData(queryKey, context?.previous as typeof prefs.data);
      toastManager.add({ type: "error", title: m.notification_pref_error() });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  };

  const setPref = useMutation(
    orpc.notifications.setPref.mutationOptions({
      onMutate: async ({ type, enabled }) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old) =>
          old ? { ...old, enabled: { ...old.enabled, [type]: enabled } } : old,
        );
        return { previous };
      },
      ...optimistic,
    }),
  );

  const setAlertMatch = useMutation(
    orpc.notifications.setAlertMatch.mutationOptions({
      onMutate: async ({ type, choice }) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old) =>
          old
            ? {
                enabled: { ...old.enabled, [type]: choice !== "off" },
                // Off keeps the stored choice, as the server does
                match: choice === "off" ? old.match : { ...old.match, [type]: choice },
              }
            : old,
        );
        return { previous };
      },
      ...optimistic,
    }),
  );

  const choiceOf = (type: AlertType): AlertChoice | null =>
    prefs.data ? (prefs.data.enabled[type] ? prefs.data.match[type] : "off") : null;

  return (
    <div className="flex flex-col gap-4">
      {ALERT_ROWS.map((row) => {
        const choice = choiceOf(row.type);
        return (
          <div
            key={row.type}
            className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{row.label()}</span>
              <span className="text-muted-foreground text-xs text-pretty">
                {row.description()}
                {choice && ` ${CHOICE_DESCRIPTION[choice]()}`}
              </span>
            </span>
            {prefs.isPending ? (
              <Skeleton className="h-10 w-full shrink-0 rounded-lg sm:h-9 sm:w-56" />
            ) : (
              <SegmentedChoice
                label={row.label()}
                value={choice}
                disabled={!prefs.data}
                onChange={(next) => setAlertMatch.mutate({ type: row.type, choice: next })}
                className="w-full shrink-0 sm:w-fit [&>*]:flex-1 sm:[&>*]:flex-none"
                options={[
                  { value: "off", label: m.notification_alert_off() },
                  { value: "any", label: m.notification_alert_any() },
                  { value: "mutual", label: m.notification_alert_mutual() },
                ]}
              />
            )}
          </div>
        );
      })}
      {SWITCH_ROWS.map((row) => (
        <Label
          key={row.type}
          htmlFor={`account-notify-${row.type}`}
          className="flex items-start justify-between gap-4 font-normal"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{row.label()}</span>
            <span className="text-muted-foreground text-xs text-pretty">{row.description()}</span>
          </span>
          {prefs.isPending ? (
            <Skeleton className="mt-0.5 h-5.5 w-9.5 shrink-0 rounded-full sm:h-4.5 sm:w-7.5" />
          ) : (
            <Switch
              id={`account-notify-${row.type}`}
              className="mt-0.5 shrink-0"
              checked={prefs.data?.enabled[row.type] ?? false}
              disabled={!prefs.data}
              onCheckedChange={(enabled) => setPref.mutate({ type: row.type, enabled })}
            />
          )}
        </Label>
      ))}
    </div>
  );
}
