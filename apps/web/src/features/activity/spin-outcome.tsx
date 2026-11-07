import { ArrowRightIcon } from "@phosphor-icons/react";
import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ObjektNameButton } from "@/features/objekt/objekt-hover-card";
import { m } from "@/paraglide/messages";

import type { SpinRow } from "./spin-rows";

/** A spin row's objekt cell: the spun objekt, then what came back. */
export function SpinOutcome({
  objekt,
  spin,
  onOpen,
}: {
  objekt: OwnedObjekt;
  spin: SpinRow<OwnedObjekt>["spin"];
  onOpen: (objekt: ValidObjekt) => void;
}) {
  // a reward the server paired but could not read: say nothing rather than "Spinning…"
  if (spin?.outcome === "reward" && !spin.reward)
    return <ObjektNameButton objekt={objekt} onOpen={onOpen} />;

  return (
    <span className="flex min-w-0 items-center gap-2 self-stretch">
      {/* the spun objekt gives way first, so the reward stays readable */}
      <span className="flex min-w-0 shrink-2 self-stretch">
        <ObjektNameButton objekt={objekt} onOpen={onOpen} />
      </span>
      <ArrowRightIcon aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
      {spin?.reward ? (
        <span className="flex min-w-0 self-stretch">
          <ObjektNameButton
            objekt={spin.reward.objekt}
            onOpen={onOpen}
            srPrefix={m.spin_outcome_got()}
          />
        </span>
      ) : spin?.outcome === "broke" ? (
        <Badge variant="error" size="sm">
          {m.spin_outcome_broke()}
        </Badge>
      ) : (
        <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs whitespace-nowrap">
          <Spinner aria-hidden role={undefined} className="size-3" />
          {m.spin_outcome_pending()}
        </span>
      )}
    </span>
  );
}
