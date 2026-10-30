import { CheckIcon, MinusIcon, QuestionMarkIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { TagBadge } from "./tag-label";

type Table = {
  /** none for a table of labelled rows */
  columns?: (() => string)[];
  rows: { key: string; cells: (() => ReactNode)[] }[];
};

type Section = { heading: () => string; table: Table; note?: () => string };

const yes = () => (
  <span className="text-success-foreground">
    <CheckIcon aria-hidden className="inline size-3.5" weight="bold" />
    <span className="sr-only">{m.trade_help_yes()}</span>
  </span>
);
const no = () => (
  <span className="text-muted-foreground">
    <MinusIcon aria-hidden className="inline size-3.5" />
    <span className="sr-only">{m.trade_help_no()}</span>
  </span>
);

const SECTIONS: Section[] = [
  {
    heading: m.trade_help_tags_heading,
    table: {
      columns: [
        m.trade_browse_help_tags_tag,
        m.trade_browse_help_tags_list,
        m.trade_browse_help_tags_matches,
      ],
      rows: [
        {
          key: "wtt",
          cells: [
            () => <TagBadge tag="wtt" />,
            m.trade_browse_help_wtt_list,
            m.trade_browse_help_wtt_matches,
          ],
        },
        {
          key: "wtb",
          cells: [
            () => <TagBadge tag="wtb" />,
            m.trade_browse_help_wtb_list,
            m.trade_browse_help_wtb_matches,
          ],
        },
        {
          key: "wts",
          cells: [
            () => <TagBadge tag="wts" />,
            m.trade_browse_help_wts_list,
            m.trade_browse_help_wts_matches,
          ],
        },
      ],
    },
    note: m.trade_help_tags_note,
  },
  {
    heading: m.trade_help_matches_heading,
    table: {
      columns: [
        m.trade_help_their_list,
        m.list_create_match_swaps_label,
        m.list_create_match_both_label,
        m.list_create_match_buying_label,
      ],
      rows: [
        { key: "have", cells: [m.trade_match_help_rules_have_list, yes, yes, no] },
        { key: "sale", cells: [m.trade_help_sale_list, no, yes, yes] },
        { key: "sale-swaps", cells: [m.trade_help_sale_swaps_list, yes, yes, yes] },
      ],
    },
    note: m.trade_help_both_ways,
  },
  {
    heading: m.trade_help_mutual_heading,
    table: {
      columns: [m.trade_help_lists_label, m.trade_help_counts],
      rows: [
        { key: "swap", cells: [m.trade_help_swap_pair, yes] },
        { key: "sale-swap", cells: [m.trade_help_sale_swap_pair, yes] },
        { key: "cross-post", cells: [m.trade_help_cross_post, no] },
        { key: "sale", cells: [m.trade_help_sale_any_side, no] },
        { key: "buying-only", cells: [m.trade_help_buying_only_want, no] },
      ],
    },
    note: m.trade_help_mutual_score,
  },
  {
    heading: m.trade_help_notes_heading,
    table: {
      rows: [
        { key: "post", cells: [m.trade_help_post_label, m.trade_help_post] },
        { key: "lists", cells: [m.trade_help_lists_label, m.trade_help_lists_one_post] },
        { key: "compare", cells: [m.trade_list_label, m.trade_match_help_compare] },
        { key: "owned", cells: [m.trade_help_owned_label, m.trade_match_help_owned] },
        { key: "hidden", cells: [m.trade_help_hidden_label, m.trade_help_hidden] },
        { key: "rules", cells: [m.trade_help_rules_label, m.trade_help_rules] },
        { key: "near", cells: [m.trade_help_near_label, m.trade_help_near] },
      ],
    },
  },
];

function HelpTable({ table }: { table: Table }) {
  const last = (table.columns?.length ?? table.rows[0]?.cells.length ?? 1) - 1;
  return (
    <table className="w-full text-start text-xs leading-4">
      {table.columns ? (
        <thead className="text-muted-foreground">
          <tr>
            {/* fixed columns and cells, never reordered, so their index is a stable key */}
            {table.columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={cn("pb-1 text-start font-medium", index < last && "pe-2")}
              >
                {column()}
              </th>
            ))}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.key} className="border-t align-top">
            {row.cells.map((cell, index) =>
              index === 0 ? (
                <th
                  key={index}
                  scope="row"
                  className={cn(
                    "py-1.5 pe-2 text-start",
                    table.columns
                      ? "font-normal"
                      : "text-muted-foreground font-medium whitespace-nowrap",
                  )}
                >
                  {cell()}
                </th>
              ) : (
                <td key={index} className={cn("py-1.5 text-pretty", index < last && "pe-2")}>
                  {cell()}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** How a post matches, beside the controls that change it. */
export function MatchHelp() {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={m.trade_match_help_aria()} />}
      >
        <QuestionMarkIcon />
      </PopoverTrigger>
      <PopoverPopup align="start" className="max-w-md text-sm">
        <div className="flex flex-col gap-4">
          <PopoverTitle className="text-sm">{m.trade_match_help_aria()}</PopoverTitle>
          {SECTIONS.map((section) => (
            <section key={section.heading()} className="flex flex-col gap-1">
              <h3 className="text-muted-foreground text-xs uppercase">{section.heading()}</h3>
              <HelpTable table={section.table} />
              {section.note ? (
                <p className="text-muted-foreground text-xs text-pretty">{section.note()}</p>
              ) : null}
            </section>
          ))}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
