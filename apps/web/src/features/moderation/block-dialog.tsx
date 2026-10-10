import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { m } from "@/paraglide/messages";

/** The confirm step before a block; the caller runs the block on confirm. */
export function BlockDialog({
  open,
  onOpenChange,
  name,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.mod_block_title({ name })}
      description={m.mod_block_description()}
      confirmLabel={m.mod_block_submit()}
      destructive
      onConfirm={onConfirm}
    />
  );
}
