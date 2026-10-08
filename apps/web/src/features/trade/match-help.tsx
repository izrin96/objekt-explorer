import { QuestionMarkIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { m } from "@/paraglide/messages";

/** For you and Browse count a match the same way; only their controls differ. */
const HELP = {
  forYou: {
    title: m.trade_match_help_title,
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
    lines: [
      m.trade_browse_help_they_have,
      m.trade_browse_help_you_have,
      m.trade_match_help_mutual,
      m.trade_match_help_trades_only,
      m.trade_browse_help_only_matches,
      m.trade_match_help_owned,
    ],
  },
};

/** How a view finds a match, beside the controls that change it. */
export function MatchHelp({ view }: { view: keyof typeof HELP }) {
  const { title, lines } = HELP[view];
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
