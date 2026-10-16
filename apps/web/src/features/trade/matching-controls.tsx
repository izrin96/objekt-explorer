import { useQuery } from "@tanstack/react-query";
import { useId } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SingleSelect } from "@/features/filters/single-select";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { m } from "@/paraglide/messages";

import {
  ALL_LISTS,
  canCompare,
  COMPARE,
  comparedList,
  pickOf,
  type TradeList,
} from "./compare-with";
import { MatchHelp } from "./match-help";
import { mutualCountOptions } from "./queries";

const COUNT_CAP = 99;

type Mode = "any" | "mutual";

type MatchingProps = {
  mode: Mode;
  /** the URL's `list`, which may not be one the viewer can compare */
  list: string | undefined;
  tradeLists: readonly TradeList[];
  onChange: (patch: { match?: Mode; list?: string | undefined }) => void;
};

/** The switch counts the people Mutual would list for the compared lists, so its number only ever means mutual. */
export function MatchingControls(props: MatchingProps) {
  const { mode, list, tradeLists, onChange } = props;
  const id = useId();
  const mutual = mode === "mutual";
  const selected = comparedList(list, tradeLists, mutual);
  // a one-way list falls back to All my lists under Mutual, so its count does too
  const { data: count = 0 } = useQuery(
    mutualCountOptions(comparedList(list, tradeLists, true)?.slug),
  );
  const shown = count > COUNT_CAP ? `${COUNT_CAP}+` : String(count);

  const setMutual = (on: boolean) => {
    const next: Mode = on ? "mutual" : "any";
    // a list the new option can't use is reset, so the URL never carries a dead choice
    const keep = list !== undefined && comparedList(list, tradeLists, on) !== undefined;
    onChange({ match: next, list: keep ? list : undefined });
  };

  return (
    <>
      <span className="flex items-center gap-2 max-md:order-1 md:order-3">
        <Switch id={id} checked={mutual} onCheckedChange={setMutual} />
        <Label
          htmlFor={id}
          className="text-sm whitespace-nowrap"
          aria-label={
            count > 0
              ? m.trade_tab_with_count({ label: m.trade_mutual_only(), count: shown })
              : undefined
          }
        >
          {m.trade_mutual_only()}
          {count > 0 ? (
            <span aria-hidden className="text-muted-foreground font-mono text-xs tabular-nums">
              {shown}
            </span>
          ) : null}
        </Label>
      </span>

      <span className="flex items-center gap-1 max-md:order-3 md:order-4">
        <SingleSelect
          label={m.trade_list_label()}
          options={[
            { value: ALL_LISTS, label: COMPARE.allLabel() },
            ...tradeLists.map((item) => ({
              value: item.slug,
              label: m.trade_list_option({
                name: item.name,
                type: LIST_TYPE_LABEL[item.listTypeNew](),
              }),
              disabled: !canCompare(item, tradeLists, mutual),
            })),
          ]}
          value={selected?.slug ?? ALL_LISTS}
          defaultValue={ALL_LISTS}
          onChange={(value) => onChange({ list: value === ALL_LISTS ? undefined : value })}
        />
        <MatchHelp />
      </span>
    </>
  );
}

/** What Compare with compares, under the controls; nothing while it is All my lists. */
export function ComparedLine({
  mode,
  list,
  tradeLists,
}: Pick<MatchingProps, "mode" | "list" | "tradeLists">) {
  const selected = comparedList(list, tradeLists, mode === "mutual");
  if (!selected) return null;
  return (
    <p className="text-muted-foreground text-xs text-pretty">
      {COMPARE.one(selected, pickOf(selected, tradeLists).paired)}
    </p>
  );
}
