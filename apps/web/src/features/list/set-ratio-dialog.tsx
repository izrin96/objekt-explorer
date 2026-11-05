import type { ListObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";

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
import { m } from "@/paraglide/messages";

import { useSetRatio } from "./actions";
import { RatioPicker } from "./ratio-picker";
import { highestOwn, type RatioSide, ratioText } from "./ratio-text";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objekts: ListObjekt[];
  slug: string;
  side: RatioSide;
  /** the list's Ratio for all, which 1:1 follows */
  listRatio: number | null;
  /** the element focus returns to, looked up as the dialog closes */
  finalFocus?: () => HTMLElement | null;
};

export function SetRatioDialog({
  open,
  onOpenChange,
  objekts,
  slug,
  side,
  listRatio,
  finalFocus,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-sm" finalFocus={finalFocus}>
        <SetRatioForm
          objekts={objekts}
          slug={slug}
          side={side}
          listRatio={listRatio}
          onDone={() => onOpenChange(false)}
        />
      </DialogPopup>
    </Dialog>
  );
}

/** Mounted with the popup, so each opening starts from the selection's highest own ratio. */
function SetRatioForm({
  objekts,
  slug,
  side,
  listRatio,
  onDone,
}: Omit<Props, "open" | "onOpenChange" | "finalFocus"> & { onDone: () => void }) {
  const setRatio = useSetRatio();
  const [ratio, setValue] = useState<number | null>(() => highestOwn(objekts));
  // a save that changes nothing would still touch the list
  const unchanged = objekts.every((objekt) => (objekt.ratio ?? null) === ratio);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{m.ratio_set_title()}</DialogTitle>
        <DialogDescription>
          {listRatio === null
            ? side === "have"
              ? m.ratio_set_have_desc()
              : m.ratio_set_want_desc()
            : side === "have"
              ? m.ratio_set_have_desc_list({ ratio: ratioText(listRatio, side) })
              : m.ratio_set_want_desc_list({ ratio: ratioText(listRatio, side) })}
        </DialogDescription>
      </DialogHeader>
      <DialogPanel>
        <RatioPicker
          side={side}
          label={m.ratio_label()}
          value={ratio}
          onChange={setValue}
          listRatio={listRatio}
        />
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button
          loading={setRatio.isPending}
          disabled={objekts.length === 0 || unchanged}
          onClick={() =>
            setRatio.mutate(
              { slug, entryIds: objekts.map((objekt) => objekt.entryId), ratio },
              { onSuccess: onDone },
            )
          }
        >
          {m.common_actions_save()}
        </Button>
      </DialogFooter>
    </>
  );
}
