import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { itemName } from "./format";
import type { Leg } from "./next-step";
import type { Collections } from "./pick";
import { stillWantedLines } from "./still-wanted-lines";

/** Received objekts still on the viewer's want lists, each with Remove and Always remove. */
export function StillWanted({ legs, collections }: { legs: Leg[]; collections: Collections }) {
  const queryClient = useQueryClient();
  const lines = stillWantedLines(legs);
  const drop = useMutation(
    orpc.list.dropReceived.mutationOptions({
      onSuccess: (_data, { slug }) => {
        const line = lines.find((shown) => shown.list.slug === slug);
        if (line) {
          toastManager.add({
            type: "success",
            title: m.offer_still_wanted_removed({ list: line.list.name }),
          });
        }
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.offer.trade.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.list.key() }),
        ]);
      },
      onError: () => toastManager.add({ type: "error", title: m.offer_still_wanted_error() }),
    }),
  );
  if (lines.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {lines.map(({ collectionSlug, list }) => {
        // turning the switch on drops this list's other lines too, so their entries go with it
        const onList = lines
          .filter((shown) => shown.list.slug === list.slug)
          .map((shown) => shown.collectionSlug);
        return (
          <li
            key={`${collectionSlug}:${list.slug}`}
            className="bg-secondary/50 flex flex-col gap-2 rounded-md border p-2.5 text-sm"
          >
            <p className="text-pretty wrap-anywhere">
              {m.offer_still_wanted({
                objekt: itemName({ collectionSlug }, collections),
                list: list.name,
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={drop.isPending}
                onClick={() =>
                  drop.mutate({ slug: list.slug, collectionSlugs: [collectionSlug], always: false })
                }
              >
                {m.offer_still_wanted_remove()}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={drop.isPending}
                onClick={() =>
                  drop.mutate({ slug: list.slug, collectionSlugs: onList, always: true })
                }
              >
                {m.offer_still_wanted_always()}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
