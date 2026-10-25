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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ACTION_LABEL } from "@/features/moderation/labels";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { sectionTitle } from "./shared";

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

/** The button names its target and length, so Dismiss never reads as closing the form. */
function submitLabel(action: ModAction, name: string, days: number) {
  switch (action) {
    case "dismiss":
      return m.mod_submit_dismiss();
    case "warn":
      return m.mod_submit_warn({ name });
    case "chat_mute":
      return days === 1
        ? m.mod_submit_chat_mute_one_day({ name })
        : m.mod_submit_chat_mute_days({ name, count: days });
    case "trade_block":
      return m.mod_submit_trade_block({ name });
    case "ban":
      return days > 0
        ? m.mod_submit_ban_days({ name, count: days })
        : m.mod_submit_ban_forever({ name });
  }
}

/** The ladder's weight: every option in `MOD_ACTIONS` order is one step heavier. */
const SEVERITY_STEPS = MOD_ACTIONS.length - 1;

function resolvedText(count: number) {
  if (count === 0) return m.mod_act_success_none();
  if (count === 1) return m.mod_act_success_one();
  return m.mod_act_success({ count });
}

function errorText(error: unknown) {
  const { reason } = errorReason(error);
  if (reason === "staff_target") return m.mod_staff_target();
  if (reason === "self") return m.mod_error_self();
  if (reason === "deleted_target") return m.mod_deleted_target();
  return m.mod_act_error();
}

/** A deleted account or an admin keeps its reports to dismiss, and takes no sanction. */
const DELETED_ACTIONS: readonly ModAction[] = ["dismiss"];

export function ActForm({
  userId,
  name,
  openReports,
  deleted,
  adminTarget,
  framed = true,
  onDone,
}: {
  userId: string;
  name: string;
  openReports: number;
  deleted: boolean;
  /** An admin takes no sanction, so only Dismiss is open. */
  adminTarget: boolean;
  /** Off in the phone's drawer, whose header carries the heading and the summary. */
  framed?: boolean;
  /** The phone's drawer closes once the action lands. */
  onDone?: () => void;
}) {
  const actions = deleted || adminTarget ? DELETED_ACTIONS : MOD_ACTIONS;
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
    summary: useId(),
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
        onDone?.();
      },
    }),
  );

  const days =
    action === "chat_mute" ? muteDays : action === "ban" && banDays > 0 ? banDays : undefined;
  const confirms = action !== null && CONFIRMED.includes(action);

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
      aria-labelledby={framed ? ids.action : undefined}
      aria-describedby={framed ? ids.summary : undefined}
      aria-label={framed ? undefined : m.mod_act_heading()}
      className={cn("flex flex-col gap-4", framed && "bg-card rounded-lg border p-4")}
    >
      {framed ? (
        <div className="flex flex-col gap-0.5">
          <h2 id={ids.action} className={sectionTitle}>
            {m.mod_act_heading()}
          </h2>
          <p id={ids.summary} className="text-muted-foreground text-sm text-pretty">
            {m.mod_act_resolves({ count: openReports })}
          </p>
        </div>
      ) : null}

      <RadioGroup
        ref={actionGroup}
        aria-labelledby={framed ? ids.action : undefined}
        aria-label={framed ? undefined : m.mod_act_heading()}
        aria-required
        aria-invalid={missing.action || undefined}
        aria-describedby={missing.action ? ids.actionError : undefined}
        value={action}
        onValueChange={(next) => {
          const picked = actions.find((value) => value === next);
          if (picked) setAction(picked);
        }}
        className="gap-1"
      >
        {actions.length > 1 ? (
          <span aria-hidden className="text-muted-foreground mb-1 flex justify-between text-xs">
            <span>{m.mod_act_lightest()}</span>
            <span>{m.mod_act_heaviest()}</span>
          </span>
        ) : null}
        {actions.map((value) => {
          const step = MOD_ACTIONS.indexOf(value);
          const heavy = CONFIRMED.includes(value);
          return (
            <Field
              key={value}
              className={cn(
                "w-full flex-row items-start gap-2.5 rounded-md border border-transparent px-2.5 py-2",
                action === value &&
                  (heavy
                    ? "border-destructive/48 bg-destructive/4"
                    : "border-foreground/24 bg-secondary"),
              )}
            >
              <Radio value={value} className="mt-0.5" />
              <FieldLabel className="flex-1 flex-col items-stretch gap-0.5 font-normal">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{ACTION_LABEL[value]()}</span>
                  <span aria-hidden className="ms-auto flex gap-0.5">
                    {Array.from({ length: SEVERITY_STEPS }, (_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "size-1.5 rounded-[2px]",
                          i >= step
                            ? "bg-foreground/12"
                            : heavy
                              ? "bg-destructive"
                              : "bg-foreground",
                        )}
                      />
                    ))}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs text-pretty">
                  {ACTION_HINT[value]()}
                </span>
              </FieldLabel>
            </Field>
          );
        })}
      </RadioGroup>
      {deleted ? (
        <p className="text-muted-foreground text-xs text-pretty">{m.mod_deleted_target()}</p>
      ) : adminTarget ? (
        <p className="text-muted-foreground text-xs text-pretty">{m.mod_admin_target()}</p>
      ) : null}
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
          {/* single choice, so pressing the active length again (an empty group) is ignored */}
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-labelledby={ids.days}
            value={[String(action === "chat_mute" ? muteDays : banDays)]}
            onValueChange={([next]) => {
              if (next === undefined) return;
              const value = Number(next);
              if (action === "chat_mute") setMuteDays(value);
              else setBanDays(value);
            }}
            className="flex-wrap"
          >
            {(action === "chat_mute" ? MUTE_DAYS : BAN_DAYS).map((value) => (
              <ToggleGroupItem
                key={value}
                value={String(value)}
                className="data-pressed:bg-primary data-pressed:text-primary-foreground font-mono tabular-nums"
              >
                {value === 0
                  ? m.mod_act_no_end()
                  : value === 1
                    ? m.mod_act_one_day()
                    : m.mod_act_days({ count: value })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
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

      <div className="flex flex-col gap-1.5">
        <Button
          type="submit"
          variant={confirms ? "destructive" : "default"}
          loading={act.isPending}
          className="w-full"
        >
          {action ? submitLabel(action, name, days ?? 0) : m.mod_act_submit()}
        </Button>
        {confirms ? (
          <p className="text-muted-foreground text-xs">{m.mod_act_confirm_note()}</p>
        ) : null}
      </div>

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
        confirmLabel={action ? submitLabel(action, name, days ?? 0) : null}
        destructive
        onConfirm={run}
      />
    </form>
  );
}
