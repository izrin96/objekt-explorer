import { MOD_REASON_MAX_LENGTH } from "@repo/api/schemas/moderation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";

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
import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

function revokeErrorText(error: unknown) {
  const { reason } = errorReason(error);
  if (reason === "staff_target") return m.mod_staff_target();
  return m.mod_act_error();
}

/** Revoking lifts a sanction, so it needs a reason for the audit log like any other action. */
export function RevokeButton({ sanctionId, label }: { sanctionId: number; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-label={m.mod_revoke_name({ sanction: label })}
        onClick={() => setOpen(true)}
      >
        {m.mod_revoke()}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup className="max-w-sm">
          {open ? (
            <RevokeForm sanctionId={sanctionId} label={label} onDone={() => setOpen(false)} />
          ) : null}
        </DialogPopup>
      </Dialog>
    </>
  );
}

function RevokeForm({
  sanctionId,
  label,
  onDone,
}: {
  sanctionId: number;
  label: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  const id = useId();
  const errorId = useId();
  const revoke = useMutation(
    orpc.moderation.revoke.mutationOptions({
      // close first, so focus returns to the Revoke button before the list refetches
      onSuccess: () => {
        onDone();
        toastManager.add({ type: "success", title: m.mod_revoke_success() });
      },
      // the refetch below drops this row and its dialog, so the stale case is told in a toast
      onError: (error) => {
        if (errorReason(error).reason !== "not_active") return;
        onDone();
        toastManager.add({ type: "info", title: m.mod_revoke_not_active() });
      },
      // an already-ended sanction means the page is stale either way
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.moderation.key() }),
    }),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim() === "") {
      setMissing(true);
      return;
    }
    revoke.mutate({ sanctionId, reason: reason.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle className="font-display">
          {m.mod_revoke_title({ sanction: label })}
        </DialogTitle>
        <DialogDescription>{m.mod_revoke_description()}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{m.mod_act_reason()}</Label>
        <Textarea
          id={id}
          value={reason}
          maxLength={MOD_REASON_MAX_LENGTH}
          aria-required
          aria-invalid={missing || undefined}
          aria-describedby={errorId}
          onChange={(event) => setReason(event.target.value)}
        />
        <p id={errorId} role="alert" className="text-destructive-foreground text-xs empty:hidden">
          {missing
            ? m.mod_act_reason_required()
            : revoke.isError
              ? revokeErrorText(revoke.error)
              : null}
        </p>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button type="submit" loading={revoke.isPending}>
          {m.mod_revoke()}
        </Button>
      </DialogFooter>
    </form>
  );
}
