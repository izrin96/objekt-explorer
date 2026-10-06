import {
  REPORT_NOTE_MAX_LENGTH,
  REPORT_REASONS,
  type ReportReason,
} from "@repo/api/schemas/moderation";
import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/paraglide/messages";

import { REASON_LABEL } from "./labels";

const NOTE_MAX = REPORT_NOTE_MAX_LENGTH;

type ReportValues = {
  reason: ReportReason;
  note: string;
  share: boolean;
  alsoBlock: boolean;
};

/**
 * The report form. Sharing is offered only from a conversation, and is on there by default:
 * it is the only way message text reaches moderators.
 */
export function ReportDialog({
  open,
  onOpenChange,
  name,
  fromConversation,
  pending = false,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  fromConversation: boolean;
  pending?: boolean;
  error?: string | null;
  onSubmit: (values: ReportValues) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        {/* remounted per open, so a closed report never leaves its choices behind */}
        {open ? (
          <ReportForm
            name={name}
            fromConversation={fromConversation}
            pending={pending}
            error={error ?? null}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}

function ReportForm({
  name,
  fromConversation,
  pending,
  error,
  onSubmit,
}: {
  name: string;
  fromConversation: boolean;
  pending: boolean;
  error: string | null;
  onSubmit: (values: ReportValues) => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [share, setShare] = useState(fromConversation);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [missingReason, setMissingReason] = useState(false);
  const reasonGroup = useRef<HTMLDivElement>(null);
  const ids = { reason: useId(), note: useId(), share: useId(), block: useId(), error: useId() };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reason) {
      setMissingReason(true);
      reasonGroup.current?.querySelector<HTMLElement>("[role=radio]")?.focus();
      return;
    }
    onSubmit({ reason, note: note.trim(), share: fromConversation && share, alsoBlock });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col" noValidate>
      <DialogHeader>
        <DialogTitle className="font-display">{m.mod_report_title({ name })}</DialogTitle>
        <DialogDescription>
          {fromConversation ? m.mod_report_description_thread() : m.mod_report_description()}
        </DialogDescription>
      </DialogHeader>

      <DialogPanel className="flex flex-col gap-6">
        <section aria-labelledby={ids.reason} className="flex flex-col gap-2.5">
          <h3 id={ids.reason} className="text-sm font-medium">
            {m.mod_report_reason()}
          </h3>
          <RadioGroup
            ref={reasonGroup}
            aria-labelledby={ids.reason}
            aria-required
            aria-invalid={missingReason || undefined}
            aria-describedby={missingReason ? ids.error : undefined}
            value={reason}
            onValueChange={(next) => {
              const picked = REPORT_REASONS.find((value) => value === next);
              if (!picked) return;
              setReason(picked);
              setMissingReason(false);
            }}
            className="gap-2"
          >
            {REPORT_REASONS.map((value) => (
              <Field key={value} className="w-full flex-row items-center gap-2.5">
                <Radio value={value} />
                <FieldLabel className="font-normal">{REASON_LABEL[value]()}</FieldLabel>
              </Field>
            ))}
          </RadioGroup>
          {missingReason ? (
            <p id={ids.error} role="alert" className="text-destructive-foreground text-xs">
              {m.mod_report_reason_required()}
            </p>
          ) : null}
        </section>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.note}>{m.mod_report_note()}</Label>
          <Textarea
            id={ids.note}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            placeholder={m.mod_report_note_placeholder()}
          />
          {/* in the tree throughout, but silent until the note nears the limit */}
          <p
            aria-live="polite"
            className="text-muted-foreground self-end font-mono text-xs tabular-nums"
          >
            {note.length >= NOTE_MAX - 50
              ? m.chat_counter({
                  count: note.length.toLocaleString(),
                  max: NOTE_MAX.toLocaleString(),
                })
              : null}
          </p>
        </div>

        {fromConversation ? (
          <SwitchRow
            id={ids.share}
            checked={share}
            onCheckedChange={setShare}
            label={m.mod_report_share()}
            description={m.mod_report_share_desc()}
          />
        ) : null}
        <SwitchRow
          id={ids.block}
          checked={alsoBlock}
          onCheckedChange={setAlsoBlock}
          label={m.mod_report_also_block({ name })}
          description={m.mod_block_description()}
        />

        {/* always in the tree, so a refusal is announced when its text arrives */}
        <p role="alert" className="text-destructive-foreground text-sm text-pretty empty:hidden">
          {error}
        </p>
      </DialogPanel>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button type="submit" loading={pending}>
          {m.mod_report_submit()}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SwitchRow({
  id,
  checked,
  onCheckedChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p id={`${id}-desc`} className="text-muted-foreground text-xs text-pretty">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        aria-describedby={`${id}-desc`}
        className="mt-0.5 shrink-0"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
