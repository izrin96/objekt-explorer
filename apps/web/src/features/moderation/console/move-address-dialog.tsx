import { MOD_REASON_MAX_LENGTH } from "@repo/api/schemas/moderation";
import { truncateAddress } from "@repo/lib/address";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { errorReason, isNotFound } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

import { accountOptions } from "./queries";

function moveErrorText(error: unknown) {
  switch (errorReason(error).reason) {
    case "address_sanctioned":
      return m.mod_address_sanctioned();
    case "address_in_trade":
      return m.mod_address_in_trade();
    case "address_changed":
      return m.mod_address_changed();
    case "same_account":
      return m.mod_same_account();
    case "deleted_target":
      return m.mod_move_deleted_target();
    default:
      return m.mod_act_error();
  }
}

/** An admin moves an address to another account at once, for an owner who lost access. */
export function MoveAddressDialog({
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
          <MoveForm
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

function MoveForm({
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
  const [target, setTarget] = useState("");
  // looked up on blur, so typing an id does not fire a read per key
  const [looked, setLooked] = useState("");
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState<"target" | "reason" | null>(null);
  const targetId = useId();
  const reasonId = useId();
  const errorId = useId();
  const resolved = useQuery({ ...accountOptions(looked), enabled: looked !== "" });
  // the name shown is the one for the id in the field now
  const current = looked !== "" && looked === target.trim();
  const move = useMutation(
    orpc.moderation.moveAddress.mutationOptions({
      onSuccess: () => {
        onDone();
        toastManager.add({ type: "success", title: m.mod_move_success() });
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.moderation.key() }),
    }),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (target.trim() === "") {
      setMissing("target");
      return;
    }
    if (reason.trim() === "") {
      setMissing("reason");
      return;
    }
    // the admin sees the resolved name before a move goes out
    if (!current || !resolved.isSuccess) {
      setLooked(target.trim());
      return;
    }
    move.mutate({
      address,
      fromUserId: userId,
      toUserId: target.trim(),
      reason: reason.trim(),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle className="font-display">{m.mod_move_title({ address: short })}</DialogTitle>
        <DialogDescription>{m.mod_move_description()}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={targetId}>{m.mod_move_target()}</Label>
          <Input
            id={targetId}
            value={target}
            className="font-mono"
            aria-required
            aria-invalid={missing === "target" || undefined}
            aria-describedby={`${targetId}-note`}
            onChange={(event) => setTarget(event.target.value)}
            onBlur={() => setLooked(target.trim())}
          />
          <p id={`${targetId}-note`} className="text-muted-foreground text-xs">
            {current && resolved.isSuccess
              ? m.mod_move_target_found({ name: resolved.data.account.identity.name })
              : current && resolved.isError && isNotFound(resolved.error)
                ? m.mod_move_target_missing()
                : m.mod_move_target_hint()}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={reasonId}>{m.mod_act_reason()}</Label>
          <Textarea
            id={reasonId}
            value={reason}
            maxLength={MOD_REASON_MAX_LENGTH}
            aria-required
            aria-invalid={missing === "reason" || undefined}
            aria-describedby={errorId}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <p id={errorId} role="alert" className="text-destructive-foreground text-xs empty:hidden">
          {missing === "target"
            ? m.mod_move_target_required()
            : missing === "reason"
              ? m.mod_act_reason_required()
              : move.isError
                ? moveErrorText(move.error)
                : null}
        </p>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button type="submit" loading={move.isPending}>
          {m.mod_move_submit()}
        </Button>
      </DialogFooter>
    </form>
  );
}
