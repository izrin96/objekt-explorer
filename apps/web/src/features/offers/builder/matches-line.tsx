import { ArrowsLeftRightIcon, WarningIcon } from "@phosphor-icons/react";
import { OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";
import type { ReactNode, Ref } from "react";

import { Button } from "@/components/ui/button";
import { nearCountText } from "@/features/trade/near";
import { WithNumber, WithNumbers } from "@/features/trade/with-number";
import { TONE_EDGE, TONE_FILL, TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { NearGroup } from "../near-picks";
import type { AddedMatches } from "./types";

/** Near matches waiting to be added: muted and dashed, since they never count as matches. */
export function NearLine({
  group,
  names,
  onAdd,
}: {
  group: NearGroup;
  names: string;
  onAdd: () => void;
}) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed px-3 py-2">
      <p className="min-w-0 flex-1 text-sm text-pretty">
        {m.offer_near_line({ more: nearCountText(group.verb, group.picks.length), names })}
      </p>
      <Button variant="outline" size="xs" onClick={onAdd}>
        {group.picks.length === 1 ? m.offer_near_add_one() : m.offer_near_add()}
      </Button>
    </div>
  );
}

/** A status line's frame: ink on a tint with an edge, in the progress or the warning tone. */
export function StatusLine({
  tone,
  children,
  action,
}: {
  tone: "progress" | "warning";
  children: ReactNode;
  action?: ReactNode;
}) {
  const Icon = tone === "progress" ? ArrowsLeftRightIcon : WarningIcon;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2",
        TONE_FILL[tone],
        TONE_EDGE[tone],
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", TONE_INK[tone])} />
      <p className={cn("min-w-0 flex-1 text-sm text-pretty", TONE_INK[tone])}>{children}</p>
      {action}
    </div>
  );
}

/** What the matches added, by which sides they filled and whether they are one post's. */
function addedText(
  { give, get, list }: { give: number; get: number; list: string | null },
  marks: { give: string; get: string },
) {
  if (give > 0 && get > 0) {
    return list === null
      ? m.offer_matches_added(marks)
      : m.offer_matches_added_post({ ...marks, list });
  }
  if (give > 0) {
    if (list === null) {
      return give === 1
        ? m.offer_matches_added_give_one()
        : m.offer_matches_added_give({ count: marks.give });
    }
    return give === 1
      ? m.offer_matches_added_post_give_one({ list })
      : m.offer_matches_added_post_give({ count: marks.give, list });
  }
  if (list === null) {
    return get === 1
      ? m.offer_matches_added_get_one()
      : m.offer_matches_added_get({ count: marks.get });
  }
  return get === 1
    ? m.offer_matches_added_post_get_one({ list })
    : m.offer_matches_added_post_get({ count: marks.get, list });
}

/**
 * The line the matches leave above the sides: what they added, with Remove matches, or once
 * removed, how many went, with Undo. Its counts stay as the builder opened.
 */
export function MatchesLine({
  added,
  taken,
  onRemove,
  onUndo,
  nearNames,
  takenNames,
  removeRef,
  undoRef,
}: {
  added: AddedMatches;
  /** the near picks Add it added, which Remove takes out too but the counts leave out */
  nearNames: string | null;
  /** the near picks Remove took out, named beside the matches it counts */
  takenNames: string | null;
  /** how many Remove matches took out, while Undo is offered */
  taken: number | null;
  onRemove: () => void;
  onUndo: () => void;
  removeRef: Ref<HTMLButtonElement>;
  undoRef: Ref<HTMLButtonElement>;
}) {
  // with near picks only, nothing here is a match
  const nearOnly = added.keys.give.length + added.keys.get.length === 0;
  const alsoTook = (line: string) =>
    takenNames ? m.offer_matches_cleared_with_near({ line, names: takenNames }) : line;
  if (taken !== null) {
    return (
      <StatusLine
        tone="progress"
        action={
          <Button ref={undoRef} variant="outline" size="xs" onClick={onUndo}>
            {m.common_actions_undo()}
          </Button>
        }
      >
        {nearOnly || taken === 0 ? (
          m.offer_near_cleared({ names: takenNames ?? "" })
        ) : taken === 1 ? (
          alsoTook(m.offer_matches_cleared_one())
        ) : (
          <WithNumber
            count={taken}
            render={(count) => alsoTook(m.offer_matches_cleared({ count }))}
          />
        )}
      </StatusLine>
    );
  }
  const give = added.keys.give.length;
  const get = added.keys.get.length;
  const remove = (
    <Button ref={removeRef} variant="outline" size="xs" onClick={onRemove}>
      {nearOnly ? m.common_actions_remove() : m.offer_matches_remove()}
    </Button>
  );
  if (nearOnly) {
    return (
      <StatusLine tone="progress" action={remove}>
        {m.offer_near_added({ names: nearNames ?? "" })}
      </StatusLine>
    );
  }
  return (
    <StatusLine tone="progress" action={remove}>
      <WithNumbers
        numbers={{
          give,
          get,
          max: OFFER_SIDE_LIMIT,
          matchedGive: added.matched.give,
          matchedGet: added.matched.get,
        }}
        render={(marks) => {
          const line = addedText({ give, get, list: added.postName }, marks);
          const caps = [
            added.matched.give > OFFER_SIDE_LIMIT
              ? m.offer_matches_capped_give({ max: marks.max, count: marks.matchedGive })
              : null,
            added.matched.get > OFFER_SIDE_LIMIT
              ? m.offer_matches_capped_get({ max: marks.max, count: marks.matchedGet })
              : null,
          ].filter((cap) => cap !== null);
          // each locale joins the sentences its own way: ja with 。 and no space
          const capped =
            caps.length === 0
              ? line
              : m.offer_matches_with_caps({
                  line,
                  caps:
                    caps.length === 2
                      ? m.offer_matches_caps_both({ give: caps[0]!, get: caps[1]! })
                      : caps[0]!,
                });
          return nearNames ? m.offer_matches_with_near({ line: capped, names: nearNames }) : capped;
        }}
      />
    </StatusLine>
  );
}
