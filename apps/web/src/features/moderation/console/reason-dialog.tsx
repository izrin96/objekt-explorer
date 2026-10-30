import { MOD_REASON_MAX_LENGTH } from "@repo/api/schemas/moderation";
import { type FormEvent, type ReactNode, useId, useState } from "react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/paraglide/messages";

/** The shell of a moderation action that asks for a reason; the form mounts only while open. */
export function ReasonDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-sm">{open ? children : null}</DialogPopup>
    </Dialog>
  );
}

/**
 * Title, extra fields (`children`), the required reason and the footer. `onSubmit` gets the trimmed
 * reason. `precheck` runs first and returns false to stop; `blocking` is the message it left, shown
 * ahead of the reason's own and `error` (the mutation's).
 */
export function ReasonForm({
  title,
  description,
  submitLabel,
  submitVariant,
  pending,
  error,
  blocking,
  precheck,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  submitLabel: string;
  submitVariant?: "destructive";
  pending: boolean;
  error: string | null;
  blocking?: string | null;
  precheck?: () => boolean;
  onSubmit: (reason: string) => void;
  children?: ReactNode;
}) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  const id = useId();
  const errorId = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (precheck && !precheck()) {
      setMissing(false);
      return;
    }
    if (reason.trim() === "") {
      setMissing(true);
      return;
    }
    setMissing(false);
    onSubmit(reason.trim());
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle className="font-display">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        {children}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{m.mod_act_reason()}</Label>
          <Textarea
            id={id}
            value={reason}
            maxLength={MOD_REASON_MAX_LENGTH}
            aria-required
            aria-invalid={(missing && !blocking) || undefined}
            aria-describedby={errorId}
            onChange={(event) => setReason(event.target.value)}
          />
          <p id={errorId} role="alert" className="text-destructive-foreground text-xs empty:hidden">
            {blocking ?? (missing ? m.mod_act_reason_required() : error)}
          </p>
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button type="submit" variant={submitVariant} loading={pending}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
