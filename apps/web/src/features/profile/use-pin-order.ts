import type { GridObjekt, OwnedGridObjekt } from "@repo/lib/types/objekt";
import { useCallback, useMemo, useState } from "react";

import { toastManager } from "@/components/ui/toast";
import { isObjektOwned, pinOrderOf } from "@/features/objekt/objekt-utils";
import { m } from "@/paraglide/messages";

import { pinOrderFor, useReorderPins } from "./actions";

/** `objekts` is `filtered` with any reorder in flight applied; `pinned` leads it topmost-first */
export function usePinOrder(address: string, filtered: GridObjekt[], hidePin: boolean) {
  const reorderPins = useReorderPins(address);

  // applied in the same commit as dnd-kit's own drag-end cleanup, so the drop
  // frame shows the final order without waiting on React Query's notify
  // scheduler, which lands the optimistic cache write a tick later
  const [pinOrderOverride, setPinOrderOverride] = useState<ReadonlyMap<string, number> | null>(
    null,
  );

  // a drop shows its own result, so only the menu route confirms in words
  const reorder = useCallback(
    (tokenIds: string[], notify = false) => {
      setPinOrderOverride(pinOrderFor(tokenIds));
      reorderPins.mutate(
        { address, tokenIds: tokenIds.map(Number) },
        {
          onSuccess: notify
            ? () => toastManager.add({ type: "success", title: m.actions_move_pin_success() })
            : undefined,
          onSettled: () => setPinOrderOverride(null),
        },
      );
    },
    [address, reorderPins],
  );

  const objekts = useMemo(() => {
    if (!pinOrderOverride) return filtered;
    return filtered.map((objekt) => {
      const order = isObjektOwned(objekt) ? pinOrderOverride.get(objekt.tokenId) : undefined;
      return order === undefined ? objekt : Object.assign({}, objekt, { pinOrder: order });
    });
  }, [filtered, pinOrderOverride]);

  const pinned = useMemo(
    () =>
      hidePin
        ? []
        : objekts
            .filter(
              (objekt): objekt is OwnedGridObjekt => isObjektOwned(objekt) && objekt.isPin === true,
            )
            .toSorted((a, b) => pinOrderOf(b) - pinOrderOf(a)),
    [objekts, hidePin],
  );

  const pinnedIds = useMemo(() => pinned.map((objekt) => objekt.tokenId), [pinned]);

  return { objekts, pinned, pinnedIds, reorder };
}
