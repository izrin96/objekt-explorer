import { QuestionMarkIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { TagBadge } from "./tag-label";

type Table = {
  columns: (() => string)[];
  rows: { key: string; cells: (() => ReactNode)[] }[];
};

type Section = { heading: () => string; table: Table; note?: () => string };

const yes = () => <span className="text-success-foreground">{m.trade_help_yes()}</span>;
const no = () => <span className="text-muted-foreground">{m.trade_help_no()}</span>;

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
          key: "wts",
          cells: [
            () => <TagBadge tag="wts" />,
            m.trade_browse_help_wts_list,
            m.trade_browse_help_wts_matches,
          ],
        },
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
      ],
    },
    note: m.trade_help_tags_note,
  },
  {
    heading: m.trade_help_mutual_heading,
    table: {
      columns: [m.trade_browse_help_tags_list, m.trade_help_your_want, m.trade_help_counts],
      rows: [
        {
          key: "have-swaps",
          cells: [m.trade_match_help_rules_have_list, m.trade_help_swaps_settings, yes],
        },
        {
          key: "have-buying-only",
          cells: [m.trade_match_help_rules_have_list, m.list_create_match_buying_label, no],
        },
      ],
    },
    note: m.trade_help_mutual_no_sale,
  },
];

const TITLE = m.trade_match_help_aria;
const LINES = [
  m.trade_help_any,
  m.trade_help_both_ways,
  m.trade_help_mutual_score,
  m.trade_help_unlinked,
  m.trade_match_help_compare,
  m.trade_match_help_owned,
];

function HelpTable({ table }: { table: Table }) {
  const last = table.columns.length - 1;
  return (
    <table className="w-full text-start text-xs leading-4">
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
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.key} className="border-t align-top">
            {row.cells.map((cell, index) =>
              index === 0 ? (
                <th key={index} scope="row" className="py-1.5 pe-2 text-start font-normal">
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
        <div className="flex flex-col gap-3">
          <PopoverTitle className="text-sm">{TITLE()}</PopoverTitle>
          {SECTIONS.map((section) => (
            <section key={section.heading()} className="flex flex-col gap-1">
              <h3 className="text-muted-foreground font-mono text-xs uppercase">
                {section.heading()}
              </h3>
              <HelpTable table={section.table} />
              {section.note ? (
                <p className="text-muted-foreground text-xs text-pretty">{section.note()}</p>
              ) : null}
            </section>
          ))}
          <ul className="list-outside list-disc space-y-1 ps-4 leading-5 text-pretty">
            {LINES.map((line, index) => (
              <li key={index}>{line()}</li>
            ))}
          </ul>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
