import type { PostType } from "@repo/api/schemas/trade";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { SingleSelect } from "@/features/filters/single-select";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import {
  type CompareRefusal,
  compareOptions,
  compareRefusal,
  compareValue,
  comparedList,
  pickOf,
  scopeOf,
  type TradeList,
} from "./compare-rule";
import { ALL_LISTS, COMPARE } from "./compare-with";
import { ListRoleBadge } from "./list-role-badge";
import { MatchHelp } from "./match-help";
import { mutualCountOptions } from "./queries";

const COUNT_CAP = 99;

const REFUSAL_TEXT: Record<CompareRefusal, () => string> = {
  oneWay: m.trade_compare_why_one_way,
};

type Mode = "any" | "mutual";

type MatchingProps = {
  mode: Mode;
  /** the URL's `type`, or All: Mutual overrides it with WTT, and it applies again once Mutual is off */
  urlType: PostType;
  /** the URL's `list`, which may not be one the viewer can compare */
  list: string | undefined;
  tradeLists: readonly TradeList[];
  onChange: (patch: { match?: Mode; list?: string | undefined }) => void;
};

/** A toggle button, so it reads as pressed or not and needs no label of its own beside it. */
function MutualButton({
  pressed,
  onChange,
  count,
  shown,
}: {
  pressed: boolean;
  onChange: (on: boolean) => void;
  count: number;
  shown: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-pressed={pressed}
      // pressed like FilterToggle: the outline stays, its border darkens over a tint
      className={cn(
        "whitespace-nowrap",
        pressed && "border-foreground bg-input/64 text-foreground dark:bg-input",
      )}
      aria-label={
        count > 0
          ? m.trade_tab_with_count({ label: m.trade_mutual_only(), count: shown })
          : undefined
      }
      onClick={() => onChange(!pressed)}
    >
      {m.trade_mutual_only()}
      {count > 0 ? (
        <span aria-hidden className="text-muted-foreground text-xs tabular-nums">
          {shown}
        </span>
      ) : null}
    </Button>
  );
}

/** The button counts the people Mutual would list for the compared lists, so its number only ever means mutual. */
export function MatchingControls(props: MatchingProps) {
  const { mode, urlType, list, tradeLists, onChange } = props;
  const mutual = mode === "mutual";
  const scope = scopeOf(mode, urlType);
  const selected = comparedList(list, tradeLists, scope);
  // a one-way list falls back to All my lists under Mutual, so its count does too; Mutual is
  // WTT only, so the Post type never changes it
  const { data: count = 0 } = useQuery(
    mutualCountOptions(comparedList(list, tradeLists, scopeOf("mutual", urlType))?.slug),
  );
  const shown = count > COUNT_CAP ? `${COUNT_CAP}+` : count.toLocaleString(getLocale());

  const setMutual = (on: boolean) => {
    const next: Mode = on ? "mutual" : "any";
    onChange({ match: next, list: comparedList(list, tradeLists, scopeOf(next, urlType))?.slug });
  };

  // each control is its own item of the filter row, so the row wraps between them on phones
  return (
    <>
      <span className="order-3 flex">
        <SingleSelect
          label={m.trade_list_label()}
          options={[
            { value: ALL_LISTS, label: COMPARE.allLabel() },
            ...compareOptions(tradeLists).map((choice) => {
              const item = choice.kind === "pair" ? choice.have : choice.list;
              const refusal = compareRefusal(item, tradeLists, scope);
              return {
                value: item.slug,
                label:
                  choice.kind === "pair" ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <ListRoleBadge type={choice.have.listType} />
                      {choice.have.name}
                      <span aria-hidden className="text-muted-foreground">
                        ⇄
                      </span>
                      <ListRoleBadge type={choice.want.listType} />
                      {choice.want.name}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <ListRoleBadge type={item.listType} />
                      {item.name}
                    </span>
                  ),
                text:
                  choice.kind === "pair"
                    ? m.trade_list_pair_option({ have: choice.have.name, want: choice.want.name })
                    : item.name,
                disabled: refusal !== null,
                hint: refusal ? REFUSAL_TEXT[refusal]() : undefined,
              };
            }),
          ]}
          value={selected ? compareValue(selected, tradeLists) : ALL_LISTS}
          defaultValue={ALL_LISTS}
          showValue
          onChange={(value) => onChange({ list: value === ALL_LISTS ? undefined : value })}
        />
      </span>
      <span className="order-3 flex items-center gap-1">
        <MutualButton pressed={mutual} onChange={setMutual} count={count} shown={shown} />
        <MatchHelp />
      </span>
    </>
  );
}

/** What Compare with compares, under the controls; nothing while it is All my lists. */
export function ComparedLine({
  mode,
  urlType,
  list,
  tradeLists,
}: Pick<MatchingProps, "mode" | "urlType" | "list" | "tradeLists">) {
  const selected = comparedList(list, tradeLists, scopeOf(mode, urlType));
  if (!selected) return null;
  return (
    <p className="text-muted-foreground text-xs text-pretty">
      {COMPARE.one(selected, pickOf(selected, tradeLists).paired)}
    </p>
  );
}
