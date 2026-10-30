import { truncateAddress } from "@repo/lib/address";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { errorReason, isNotFound } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

import { accountOptions } from "./queries";
import { ReasonDialog, ReasonForm } from "./reason-dialog";

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
    <ReasonDialog open={open} onOpenChange={onOpenChange}>
      <MoveForm
        address={address}
        short={truncateAddress(address)}
        userId={userId}
        onDone={() => onOpenChange(false)}
      />
    </ReasonDialog>
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
  const [targetMissing, setTargetMissing] = useState(false);
  const targetId = useId();
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

  const precheck = () => {
    const empty = target.trim() === "";
    setTargetMissing(empty);
    return !empty;
  };

  const submit = (reason: string) => {
    // the admin sees the resolved name before a move goes out
    if (!current || !resolved.isSuccess) {
      setLooked(target.trim());
      return;
    }
    move.mutate({ address, fromUserId: userId, toUserId: target.trim(), reason });
  };

  return (
    <ReasonForm
      title={m.mod_move_title({ address: short })}
      description={m.mod_move_description()}
      submitLabel={m.mod_move_submit()}
      pending={move.isPending}
      error={move.isError ? moveErrorText(move.error) : null}
      blocking={targetMissing ? m.mod_move_target_required() : null}
      precheck={precheck}
      onSubmit={submit}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={targetId}>{m.mod_move_target()}</Label>
        <Input
          id={targetId}
          value={target}
          className="font-mono"
          aria-required
          aria-invalid={targetMissing || undefined}
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
    </ReasonForm>
  );
}
