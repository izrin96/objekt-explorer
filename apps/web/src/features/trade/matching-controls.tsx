import type { PostType } from "@repo/api/schemas/trade";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SingleSelect } from "@/features/filters/single-select";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import {
  type CompareRefusal,
  compareRefusal,
  comparedList,
  pickOf,
  scopeOf,
  type TradeList,
} from "./compare-rule";
import { ALL_LISTS, COMPARE } from "./compare-with";
import { MatchHelp } from "./match-help";
import { mutualCountOptions } from "./queries";

const COUNT_CAP = 99;

const REFUSAL_TEXT: Record<CompareRefusal, () => string> = {
  oneWay: m.trade_compare_why_one_way,
  wtb: m.trade_compare_why_wtb,
  wts: m.trade_compare_why_wts,
  wtt: m.trade_compare_why_wtt,
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

function MutualSwitch({
  id,
  checked,
  onChange,
  count,
  shown,
  className,
}: {
  id: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  count: number;
  shown: string;
  className: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
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
  );
}

/** The switch counts the people Mutual would list for the compared lists, so its number only ever means mutual. */
export function MatchingControls(props: MatchingProps) {
  const { mode, urlType, list, tradeLists, onChange } = props;
  const phoneId = useId();
  const wideId = useId();
  const mutual = mode === "mutual";
  const scope = scopeOf(mode, urlType);
  const selected = comparedList(list, tradeLists, scope);
  // a one-way list falls back to All my lists under Mutual, so its count does too; Mutual is
  // WTT only, so the Post type never changes it
  const { data: count = 0 } = useQuery(
    mutualCountOptions(comparedList(list, tradeLists, scopeOf("mutual", urlType))?.slug),
  );
  const shown = count > COUNT_CAP ? `${COUNT_CAP}+` : String(count);

  const setMutual = (on: boolean) => {
    const next: Mode = on ? "mutual" : "any";
    onChange({ match: next, list: comparedList(list, tradeLists, scopeOf(next, urlType))?.slug });
  };

  return (
    <>
      {/* the switch leads on phones and follows Compare with from `md`, in the DOM too, so Tab follows what is drawn */}
      <MutualSwitch
        id={phoneId}
        checked={mutual}
        onChange={setMutual}
        count={count}
        shown={shown}
        className="max-md:order-1 md:hidden"
      />
      <span className="order-3 flex items-center gap-1">
        <SingleSelect
          label={m.trade_list_label()}
          options={[
            { value: ALL_LISTS, label: COMPARE.allLabel() },
            ...tradeLists.map((item) => {
              const refusal = compareRefusal(item, tradeLists, scope);
              return {
                value: item.slug,
                label: m.trade_list_option({
                  name: item.name,
                  type: LIST_TYPE_LABEL[item.listTypeNew](),
                }),
                disabled: refusal !== null,
                hint: refusal ? REFUSAL_TEXT[refusal]() : undefined,
              };
            }),
          ]}
          value={selected?.slug ?? ALL_LISTS}
          defaultValue={ALL_LISTS}
          showValue
          onChange={(value) => onChange({ list: value === ALL_LISTS ? undefined : value })}
        />
        <MatchHelp />
      </span>

      <MutualSwitch
        id={wideId}
        checked={mutual}
        onChange={setMutual}
        count={count}
        shown={shown}
        className="max-md:hidden md:order-4 md:ml-auto"
      />
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
