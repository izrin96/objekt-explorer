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

/** Browse explains its post tags; For you counts by the same rules, so it shows only the lists. */
const TAG_TABLE: Table = {
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
};

const RULE_TABLE: Table = {
  columns: [m.trade_match_help_rules_list, m.trade_match_help_rules_matches],
  rows: [
    {
      key: "have",
      cells: [m.trade_match_help_rules_have_list, m.trade_match_help_rules_have_matches],
    },
    { key: "sale", cells: [m.trade_browse_help_wts_list, m.trade_browse_help_wts_matches] },
  ],
};

const HELP = {
  forYou: {
    title: m.trade_match_help_title,
    table: RULE_TABLE,
    lines: [
      m.trade_match_help_mutual,
      m.trade_match_help_show,
      m.trade_match_help_compare,
      m.trade_match_help_owned,
    ],
  },
  browse: {
    title: m.trade_browse_help_title,
    table: TAG_TABLE,
    lines: [m.trade_match_help_mutual, m.trade_browse_help_only_matches, m.trade_match_help_owned],
  },
};

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

/** How a view finds a match, beside the controls that change it. */
export function MatchHelp({ view }: { view: keyof typeof HELP }) {
  const { title, table, lines } = HELP[view];
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={m.trade_match_help_aria()} />}
      >
        <QuestionMarkIcon />
      </PopoverTrigger>
      <PopoverPopup align="start" className="max-w-sm text-sm">
        <div className="flex flex-col gap-2">
          <PopoverTitle className="text-sm">{title()}</PopoverTitle>
          <HelpTable table={table} />
          <ul className="list-outside list-disc space-y-1 ps-4 leading-5 text-pretty">
            {lines.map((line, index) => (
              <li key={index}>{line()}</li>
            ))}
          </ul>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
