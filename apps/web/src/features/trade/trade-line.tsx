import { tradeLineOf } from "@repo/api/schemas/trade-post";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { IN_POST } from "./post-list-dialog";
import { usePlanLists } from "./post-plan";
import { TagBadges } from "./tag-label";
import { type DetailPart, lineDetail, type LineHint, lineHint } from "./trade-line-parts";

const DETAIL: Record<Exclude<DetailPart, "partner">, () => string> = {
  sell_only: m.trade_line_sell_only,
  sell_or_swap: m.trade_line_sell_or_swap,
  also_pay: m.trade_post_option_also_pay,
  buying_only: m.list_create_match_buying_label,
  market: m.trade_post_option_market,
};

const HINT: Record<LineHint, () => string> = {
  paired_off_swap: m.trade_line_paired_off_hint,
  paired_off_sell: m.trade_line_paired_off_sell_hint,
  needs_profile: m.trade_line_needs_profile,
  not_on: m.trade_line_not_on_hint,
  not_on_sale: m.trade_line_not_on_sale_hint,
};

/**
 * A have, want or sale list's place on Trade in its edit form: the post holding it, or that it is
 * off Trade, with Edit post or Post it opening the composer on this list.
 */
export function TradeLine({ slug, onCompose }: { slug: string; onCompose: () => void }) {
  const id = useId();
  const lists = usePlanLists();
  const list = lists.find((entry) => entry.slug === slug);
  if (!list) return null;
  const line = tradeLineOf(lists, list);

  const title =
    line.state === "in_post" ? (
      <span className="flex flex-wrap items-center gap-1.5">
        {IN_POST[line.kind]()}
        <TagBadges tags={line.tags} />
      </span>
    ) : line.state === "paired_off" ? (
      `${m.trade_paired_with({ name: line.partner.name })} · ${m.trade_line_off()}`
    ) : (
      m.trade_line_not_on()
    );
  const detail =
    line.state === "in_post"
      ? lineDetail(line, list.listType)
          .map((part) =>
            part === "partner"
              ? m.trade_paired_with({ name: line.partner?.name ?? "" })
              : DETAIL[part](),
          )
          .join(" · ")
      : HINT[lineHint(line, list.listType)]();

  return (
    <section aria-labelledby={`${id}-heading`} className="flex min-w-0 flex-col gap-1.5">
      <h3 id={`${id}-heading`} className="text-sm font-medium">
        {m.list_trade_heading()}
      </h3>
      <div className="bg-muted/40 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border px-3.5 py-3">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium break-words">{title}</span>
          {detail ? (
            <span id={`${id}-detail`} className="text-muted-foreground text-xs text-pretty">
              {detail}
            </span>
          ) : null}
        </span>
        {line.state === "needs_profile" ? null : (
          <Button
            type="button"
            size="sm"
            variant={line.state === "in_post" ? "outline" : "default"}
            className="shrink-0"
            aria-describedby={detail ? `${id}-detail` : undefined}
            onClick={onCompose}
          >
            {line.state === "in_post" ? m.trade_composer_edit_title() : m.trade_post_it()}
          </Button>
        )}
      </div>
    </section>
  );
}
