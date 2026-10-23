import { MOD_REASON_MAX_LENGTH } from "@repo/api/schemas/moderation";
import { truncateAddress } from "@repo/lib/address";
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

function unlinkErrorText(error: unknown) {
  switch (errorReason(error).reason) {
    case "address_sanctioned":
      return m.mod_address_sanctioned();
    case "address_in_trade":
      return m.mod_address_in_trade();
    case "address_changed":
      return m.mod_address_changed();
    default:
      return m.mod_act_error();
  }
}

/** An admin unlinks an address from its account; the 7-day wait starts as for the user's own unlink. */
export function UnlinkAddressDialog({
  address,
  userId,
  open,
  onOpenChange,
}: {
  address: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-sm">
        {open ? (
          <UnlinkForm
            address={address}
            short={truncateAddress(address)}
            userId={userId}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}

function UnlinkForm({
  address,
  short,
  userId,
  onDone,
}: {
  address: string;
  short: string;
  userId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  const id = useId();
  const errorId = useId();
  const unlink = useMutation(
    orpc.moderation.unlinkAddress.mutationOptions({
      onSuccess: () => {
        onDone();
        toastManager.add({ type: "success", title: m.mod_unlink_address_success() });
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.moderation.key() }),
    }),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim() === "") {
      setMissing(true);
      return;
    }
    unlink.mutate({ address, userId, reason: reason.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle className="font-display">
          {m.mod_unlink_address_title({ address: short })}
        </DialogTitle>
        <DialogDescription>{m.mod_unlink_address_description()}</DialogDescription>
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
            : unlink.isError
              ? unlinkErrorText(unlink.error)
              : null}
        </p>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button type="submit" variant="destructive" loading={unlink.isPending}>
          {m.mod_unlink_address_submit()}
        </Button>
      </DialogFooter>
    </form>
  );
}
