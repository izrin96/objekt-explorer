import type { ListTypeNew } from "@repo/api/schemas/list";

import { Badge } from "@/components/ui/badge";
import { toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { PostTag } from "./post-types";

const TAG_LABEL: Record<PostTag, { short: () => string; long: () => string }> = {
  wtt: { short: m.trade_tag_wtt, long: m.trade_tag_wtt_desc },
  wtb: { short: m.trade_tag_wtb, long: m.trade_tag_wtb_desc },
  wts: { short: m.trade_tag_wts, long: m.trade_tag_wts_desc },
};

/** The short tag stays visible; the spelled-out one is read and shown on hover. */
export function TagLabel({ tag }: { tag: PostTag }) {
  return (
    <>
      <abbr aria-hidden title={TAG_LABEL[tag].long()} className="no-underline">
        {TAG_LABEL[tag].short()}
      </abbr>
      <span className="sr-only">{TAG_LABEL[tag].long()}</span>
    </>
  );
}

const TAG_TYPE = { wtt: "have", wtb: "want", wts: "sale" } as const satisfies Record<
  PostTag,
  ListTypeNew
>;

export function TagBadge({ tag }: { tag: PostTag }) {
  return (
    <Badge variant="outline" size="sm" className={cn("font-mono", toneChip(TAG_TYPE[tag]))}>
      <TagLabel tag={tag} />
    </Badge>
  );
}
