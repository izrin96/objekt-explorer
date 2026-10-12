import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import type { BrowseMatchMode } from "@repo/api/schemas/trade";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetDescription,
  SheetClose,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
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

const MODES: { value: BrowseMatchMode; label: () => string }[] = [
  { value: "off", label: m.trade_matches_off },
  { value: "any", label: m.trade_matches_any },
  { value: "mutual", label: m.trade_matches_mutual },
];

type MatchingProps = {
  mode: BrowseMatchMode;
  /** the URL's `list`, which may not be one the viewer can compare */
  list: string | undefined;
  tradeLists: readonly TradeList[];
  onChange: (patch: { match?: BrowseMatchMode; list?: string | undefined }) => void;
};

function pickList({ list, tradeLists }: MatchingProps, mode: BrowseMatchMode) {
  return comparedList(list, tradeLists, mode === "mutual");
}

function useMatching(props: MatchingProps) {
  const { mode, list, onChange } = props;
  // Mutual N counts what Mutual would compare, whichever option is on
  const { data: count } = useQuery(mutualCountOptions(pickList(props, "mutual")?.slug));

  return {
    selected: mode === "off" ? undefined : pickList(props, mode),
    count: count ?? 0,
    setMode: (next: BrowseMatchMode) =>
      onChange({
        match: next,
        // a list the new option can't use is reset, so the URL never carries a dead choice
        list: next !== "off" && list !== undefined && !pickList(props, next) ? undefined : list,
      }),
    setList: (value: string) => onChange({ list: value === ALL_LISTS ? undefined : value }),
  };
}

function Controls(props: MatchingProps) {
  const { mode, tradeLists } = props;
  const { selected, count, setMode, setList } = useMatching(props);
  const mutual = mode === "mutual";
  const shown = count > COUNT_CAP ? `${COUNT_CAP}+` : String(count);

  return (
    <>
      <Tabs
        value={mode}
        onValueChange={(value) => {
          const next = MODES.find((item) => item.value === value);
          if (next && next.value !== mode) setMode(next.value);
        }}
        /* a longer locale can outgrow a phone: the strip scrolls, the page does not */
        data-scroll-x
        className="max-w-full [scrollbar-width:none] overflow-x-auto"
      >
        <TabsList aria-label={m.trade_matches_label()} className="w-max">
          {MODES.map((item) => {
            const withCount = item.value === "mutual" && count > 0;
            return (
              <TabsTab
                key={item.value}
                value={item.value}
                aria-label={
                  withCount
                    ? m.trade_tab_with_count({ label: item.label(), count: shown })
                    : undefined
                }
              >
                {item.label()}
                {withCount ? (
                  <span
                    aria-hidden
                    className="text-muted-foreground font-mono text-xs tabular-nums"
                  >
                    {shown}
                  </span>
                ) : null}
              </TabsTab>
            );
          })}
        </TabsList>
      </Tabs>

      {/* one row, so the sheet's column layout doesn't strand the help button */}
      <div className="flex items-center gap-1">
        {mode !== "off" ? (
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
            onChange={setList}
          />
        ) : null}
        <MatchHelp />
      </div>
    </>
  );
}

/** What is compared, in one line under the controls. */
function ComparedLine(props: MatchingProps) {
  if (props.mode === "off") return null;
  const selected = pickList(props, props.mode);
  return (
    <p className="text-muted-foreground text-xs text-pretty">
      {selected ? COMPARE.one(selected, pickOf(selected, props.tradeLists).paired) : COMPARE.all()}
    </p>
  );
}

/**
 * Matches (Off, Any, Mutual N) and Compare with. From `md` they sit inline; below it one
 * Matching button holds them in a sheet.
 */
export function MatchingControls(props: MatchingProps) {
  const selected = props.mode === "off" ? undefined : pickList(props, props.mode);
  const option = MODES.find((item) => item.value === props.mode)!.label();

  return (
    <>
      <div className="hidden flex-col gap-1 md:flex">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Controls {...props} />
        </div>
        <ComparedLine {...props} />
      </div>

      <Sheet>
        <SheetTrigger render={<Button variant="outline" size="sm" className="md:hidden" />}>
          <SlidersHorizontalIcon />
          {selected
            ? m.trade_matching_button_list({ option, list: selected.name })
            : m.trade_matching_button({ option })}
        </SheetTrigger>
        <SheetPopup side="bottom" className="max-h-[85dvh]">
          <SheetHeader>
            <SheetTitle className="font-display text-base">{m.trade_matching_title()}</SheetTitle>
            <SheetDescription className="sr-only">
              {m.trade_matching_description()}
            </SheetDescription>
          </SheetHeader>
          <SheetPanel className="flex flex-col items-start gap-3">
            <Controls {...props} />
            <ComparedLine {...props} />
          </SheetPanel>
          <SheetFooter className="flex-row justify-end">
            <SheetClose render={<Button size="sm" />}>{m.filter_done()}</SheetClose>
          </SheetFooter>
        </SheetPopup>
      </Sheet>
    </>
  );
}
