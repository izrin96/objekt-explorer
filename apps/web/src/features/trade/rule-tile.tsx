import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { ruleText } from "@/features/list/rules/words";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { PostSideData } from "./post-types";
import { SlugTile } from "./thumb-grid";

type RuleTileData = PostSideData["rules"][number];

/**
 * A want side's rules, one tile each: RULE, the rule's name and who it takes, and for a signed-in
 * viewer how many of its objekts they have, ringed when any. Activating a tile lists those.
 */
export function RuleTiles({
  tiles,
  collections,
  onOpen,
}: {
  tiles: readonly RuleTileData[];
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    <ul className="-m-1 flex flex-wrap gap-1.5 p-1">
      {tiles.map((tile) => (
        <li key={tile.ruleId}>
          <RuleTile tile={tile} collections={collections} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

function RuleTile({
  tile,
  collections,
  onOpen,
}: {
  tile: RuleTileData;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const ringed = (tile.matched ?? 0) > 0;
  const face = (
    <>
      <Badge variant="outline" size="sm" className="tracking-wide">
        {m.trade_rule_tag()}
      </Badge>
      <span className="w-full text-xs text-pretty">{ruleText(tile.rule)}</span>
      {tile.matched !== null ? (
        <span
          className={cn(
            "text-xs tabular-nums",
            ringed ? "text-success-foreground" : "text-muted-foreground",
          )}
        >
          {m.trade_list_count_you_have({ count: tile.matched })}
        </span>
      ) : null}
    </>
  );
  const box = cn(
    "min-h-14 max-w-56 min-w-28 items-start justify-center gap-1 rounded-lg px-2.5 py-1.5 text-start before:rounded-[calc(var(--radius-lg)-1px)]",
    ringed && "outline-foreground outline-2 outline-offset-1",
  );

  if (!ringed) {
    return <Card className={box}>{face}</Card>;
  }
  return (
    <Popover>
      <Card
        render={<PopoverTrigger />}
        className={cn(
          box,
          "hover:bg-accent/50 focus-visible:ring-ring outline-none focus-visible:ring-2",
        )}
      >
        {face}
      </Card>
      <PopoverPopup className="w-72">
        <PopoverTitle className="text-sm">
          {m.trade_rule_you_have_title({ rule: ruleText(tile.rule) })}
        </PopoverTitle>
        <ul className="mt-2 grid grid-cols-6 gap-1.5">
          {tile.matchedSlugs.map((slug) => {
            const collection = collections[slug];
            return (
              <li key={slug} className="@container">
                {collection ? (
                  <ObjektCard objekt={collection} image="thumbnail" hideLabel onOpen={onOpen} />
                ) : (
                  <SlugTile className="text-xxs p-0.5">{slug}</SlugTile>
                )}
              </li>
            );
          })}
        </ul>
        {(tile.matched ?? 0) > tile.matchedSlugs.length ? (
          <p className="text-muted-foreground mt-2 text-xs">
            {m.trade_more_count({ count: (tile.matched ?? 0) - tile.matchedSlugs.length })}
          </p>
        ) : null}
      </PopoverPopup>
    </Popover>
  );
}
