import {
  MOD_ACTIONS,
  MOD_REASON_MAX_LENGTH,
  MUTE_DAYS,
  type ModAction,
} from "@repo/api/schemas/moderation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { ACTION_LABEL } from "@/features/moderation/labels";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

const ACTION_HINT: Record<ModAction, () => string> = {
  dismiss: m.mod_action_dismiss_hint,
  warn: m.mod_action_warn_hint,
  chat_mute: m.mod_action_chat_mute_hint,
  trade_block: m.mod_action_trade_block_hint,
  ban: m.mod_action_ban_hint,
};

/** These take an account out of trading or the site, so they ask once more. */
const CONFIRMED: readonly ModAction[] = ["trade_block", "ban"];

/** 0 means no end date. */
const BAN_DAYS = [0, 7, 30, 365] as const;

/** The button names its target, so Dismiss never reads as closing the form. */
function submitLabel(action: ModAction, name: string) {
  switch (action) {
    case "dismiss":
      return m.mod_submit_dismiss();
    case "warn":
      return m.mod_submit_warn({ name });
    case "chat_mute":
      return m.mod_submit_chat_mute({ name });
    case "trade_block":
      return m.mod_submit_trade_block({ name });
    case "ban":
      return m.mod_submit_ban({ name });
  }
}

function resolvedText(count: number) {
  if (count === 0) return m.mod_act_success_none();
  if (count === 1) return m.mod_act_success_one();
  return m.mod_act_success({ count });
}

function errorText(error: unknown) {
  const { reason } = errorReason(error);
  if (reason === "staff_target") return m.mod_staff_target();
  if (reason === "self") return m.mod_error_self();
  return m.mod_act_error();
}

export function ActForm({ userId, name }: { userId: string; name: string }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ModAction | null>(null);
  const [muteDays, setMuteDays] = useState<number>(7);
  // a timed ban is the safer default; no end date is a deliberate pick
  const [banDays, setBanDays] = useState<number>(7);
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState<{ action?: boolean; reason?: boolean }>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ids = {
    action: useId(),
    actionError: useId(),
    reason: useId(),
    reasonNote: useId(),
    days: useId(),
    error: useId(),
  };
  const actionGroup = useRef<HTMLDivElement>(null);
  const reasonBox = useRef<HTMLTextAreaElement>(null);

  const act = useMutation(
    orpc.moderation.act.mutationOptions({
      onSuccess: async ({ resolvedReports }) => {
        await queryClient.invalidateQueries({ queryKey: orpc.moderation.key() });
        toastManager.add({
          type: "success",
          title: resolvedText(resolvedReports),
        });
        setAction(null);
        setReason("");
      },
    }),
  );

  const days =
    action === "chat_mute" ? muteDays : action === "ban" && banDays > 0 ? banDays : undefined;

  const run = () => {
    if (!action) return;
    act.mutate({ userId, action, days, reason: reason.trim() });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = { action: !action, reason: reason.trim() === "" };
    setMissing(next);
    if (next.action) actionGroup.current?.querySelector<HTMLElement>("[role=radio]")?.focus();
    else if (next.reason) reasonBox.current?.focus();
    if (next.action || next.reason || !action) return;
    if (CONFIRMED.includes(action)) setConfirmOpen(true);
    else run();
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby={ids.action}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <h2
        id={ids.action}
        className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
      >
        {m.mod_act_heading()}
      </h2>

      <RadioGroup
        ref={actionGroup}
        aria-labelledby={ids.action}
        aria-required
        aria-invalid={missing.action || undefined}
        aria-describedby={missing.action ? ids.actionError : undefined}
        value={action}
        onValueChange={(next) => {
          const picked = MOD_ACTIONS.find((value) => value === next);
          if (picked) setAction(picked);
        }}
        className="gap-2.5"
      >
        {MOD_ACTIONS.map((value) => (
          <Field key={value} className="w-full flex-row items-start gap-2.5">
            <Radio value={value} className="mt-0.5" />
            <FieldLabel className="flex-col items-start gap-0.5 font-normal">
              <span className="font-medium">{ACTION_LABEL[value]()}</span>
              <span className="text-muted-foreground text-xs text-pretty">
                {ACTION_HINT[value]()}
              </span>
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
      {missing.action ? (
        <p id={ids.actionError} className="text-destructive-foreground text-xs">
          {m.mod_act_pick_action()}
        </p>
      ) : null}

      {action === "chat_mute" || action === "ban" ? (
        <div className="flex flex-col gap-2">
          <span id={ids.days} className="text-sm font-medium">
            {action === "chat_mute" ? m.mod_act_mute_length() : m.mod_act_ban_length()}
          </span>
          <RadioGroup
            aria-labelledby={ids.days}
            value={String(action === "chat_mute" ? muteDays : banDays)}
            onValueChange={(next) => {
              const value = Number(next);
              if (action === "chat_mute") setMuteDays(value);
              else setBanDays(value);
            }}
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {(action === "chat_mute" ? MUTE_DAYS : BAN_DAYS).map((value) => (
              <Field key={value} className="flex-row items-center gap-2">
                <Radio value={String(value)} />
                <FieldLabel className="font-normal tabular-nums">
                  {value === 0
                    ? m.mod_act_no_end()
                    : value === 1
                      ? m.mod_act_one_day()
                      : m.mod_act_days({ count: value })}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.reason}>{m.mod_act_reason()}</Label>
        <Textarea
          ref={reasonBox}
          id={ids.reason}
          aria-describedby={ids.reasonNote}
          value={reason}
          maxLength={MOD_REASON_MAX_LENGTH}
          aria-required
          aria-invalid={missing.reason || undefined}
          onChange={(event) => setReason(event.target.value)}
          placeholder={m.mod_act_reason_placeholder()}
        />
        <p id={ids.reasonNote} className="text-muted-foreground text-xs text-pretty">
          {missing.reason ? (
            <span className="text-destructive-foreground">{m.mod_act_reason_required()}</span>
          ) : (
            m.mod_act_reason_hint()
          )}
        </p>
      </div>

      <p id={ids.error} role="alert" className="text-destructive-foreground text-sm empty:hidden">
        {act.isError ? errorText(act.error) : null}
      </p>

      <Button
        type="submit"
        variant={action && CONFIRMED.includes(action) ? "destructive" : "default"}
        loading={act.isPending}
        className="self-start"
      >
        {action ? submitLabel(action, name) : m.mod_act_submit()}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          action === "ban"
            ? banDays > 0
              ? m.mod_confirm_ban_days({ name, count: banDays })
              : m.mod_confirm_ban_forever({ name })
            : m.mod_confirm_trade_block({ name })
        }
        description={action === "ban" ? m.mod_action_ban_hint() : m.mod_action_trade_block_hint()}
        confirmLabel={action ? submitLabel(action, name) : null}
        destructive
        onConfirm={run}
      />
    </form>
  );
}
