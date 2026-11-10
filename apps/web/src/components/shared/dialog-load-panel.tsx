import { DialogPanel } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { refusalText } from "@/lib/refusal";

/** A dialog's body while what it edits loads: a spinner, or the error once the read fails. */
export function DialogLoadPanel({ error }: { error: unknown }) {
  return (
    <DialogPanel>
      {error ? (
        <p className="text-destructive-foreground text-sm">{refusalText(error)}</p>
      ) : (
        <div className="flex justify-center py-6">
          <Spinner className="size-5" />
        </div>
      )}
    </DialogPanel>
  );
}
