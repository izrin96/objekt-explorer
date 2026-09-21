import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { LIST_TYPE_LABEL, LIST_TYPE_VARIANT, useLists } from "@/store/lists";

type AddToListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** the objekts being added, by `LabObjekt.id` */
  objektIds: string[];
  onSubmitted?: () => void;
};

/**
 * cnippet Dialog with a single Select. Writes into the lists store, so
 * `/list/<slug>` shows what was added; objekts the list already holds are
 * skipped and reported, the way the app's `addToList` mutation does.
 */
export function AddToListDialog({
  open,
  onOpenChange,
  objektIds,
  onSubmitted,
}: AddToListDialogProps) {
  const lists = useLists((s) => s.lists);
  const addEntries = useLists((s) => s.addEntries);
  const [listId, setListId] = useState<string | null>(null);
  const count = objektIds.length;

  const submit = () => {
    if (!listId) return;
    const list = lists.find((l) => l.id === listId);
    const added = addEntries(listId, objektIds);
    const skipped = count - added;
    toastManager.add({
      type: added > 0 ? "success" : "info",
      title: added > 0 ? `Added ${added} objekt${added === 1 ? "" : "s"}` : "Nothing to add",
      description:
        skipped > 0 ? `to “${list?.name}” · ${skipped} already there` : `to “${list?.name}”`,
    });
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Add to list</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{count}</span> objekt{count === 1 ? "" : "s"} selected
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-2">
            <Label htmlFor="list-select">List</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger id="list-select">
                {/* the item value is the list id; the trigger shows its name */}
                <SelectValue>
                  {(value: string | null) =>
                    value === null
                      ? "Choose a list"
                      : (lists.find((l) => l.id === value)?.name ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="truncate">{l.name}</span>
                    <Badge variant={LIST_TYPE_VARIANT[l.type]} size="sm" className="ml-auto">
                      {LIST_TYPE_LABEL[l.type]}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!listId} onClick={submit}>
            Submit
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
