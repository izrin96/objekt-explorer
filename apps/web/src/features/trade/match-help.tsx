import { QuestionMarkIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { m } from "@/paraglide/messages";

import type { PostTag } from "./post-types";
import { TagBadge } from "./tag-label";

/** For you and Browse count a match the same way; only their controls differ. */
const HELP = {
  forYou: {
    title: m.trade_match_help_title,
    tags: false,
    lines: [
      m.trade_match_help_they_have,
      m.trade_match_help_you_have,
      m.trade_match_help_mutual,
      m.trade_match_help_trades_only,
      m.trade_match_help_show,
      m.trade_match_help_compare,
      m.trade_match_help_owned,
    ],
  },
  browse: {
    title: m.trade_browse_help_title,
    tags: true,
    lines: [m.trade_browse_help_mutual, m.trade_browse_help_only_matches, m.trade_match_help_owned],
  },
};

const TAG_ROWS: { tag: PostTag; list: () => string; matches: () => string }[] = [
  { tag: "wts", list: m.trade_browse_help_wts_list, matches: m.trade_browse_help_wts_matches },
  { tag: "wtt", list: m.trade_browse_help_wtt_list, matches: m.trade_browse_help_wtt_matches },
  { tag: "wtb", list: m.trade_browse_help_wtb_list, matches: m.trade_browse_help_wtb_matches },
];

function TagTable() {
  return (
    <table className="w-full text-start text-xs leading-4">
      <thead className="text-muted-foreground">
        <tr>
          <th scope="col" className="pe-2 pb-1 text-start font-medium">
            {m.trade_browse_help_tags_tag()}
          </th>
          <th scope="col" className="pe-2 pb-1 text-start font-medium">
            {m.trade_browse_help_tags_list()}
          </th>
          <th scope="col" className="pb-1 text-start font-medium">
            {m.trade_browse_help_tags_matches()}
          </th>
        </tr>
      </thead>
      <tbody>
        {TAG_ROWS.map((row) => (
          <tr key={row.tag} className="border-t align-top">
            <th scope="row" className="py-1.5 pe-2 text-start font-normal">
              <TagBadge tag={row.tag} />
            </th>
            <td className="py-1.5 pe-2 text-pretty">{row.list()}</td>
            <td className="py-1.5 text-pretty">{row.matches()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** How a view finds a match, beside the controls that change it. */
export function MatchHelp({ view }: { view: keyof typeof HELP }) {
  const { title, tags, lines } = HELP[view];
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
          {tags && <TagTable />}
          <ul className="list-outside list-disc space-y-1 ps-4 leading-5 text-pretty">
            {/* a fixed list, never reordered, so its index is a stable key */}
            {lines.map((line, index) => (
              <li key={index}>{line()}</li>
            ))}
          </ul>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
