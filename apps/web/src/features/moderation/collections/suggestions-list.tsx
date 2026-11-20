import type { Inputs, Outputs } from "@repo/api";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";

import { Swatch } from "./view-row";

type Suggestion = Outputs["admin"]["collectionSuggestions"][number];
type Entry = Inputs["admin"]["setCollectionColorsMany"]["entries"][number];

const UNOVERRIDDEN = {
  textColor: null,
  backgroundColor: null,
  textPinned: false,
  backgroundPinned: false,
};

/**
 * Suggestions: per collection number, the text colour its read members agree on, offered for its
 * unread members. Apply stores it on each as an unpinned staff colour; nothing changes before.
 */
export function SuggestionsList({
  suggestions,
  failed,
  busy,
  onSave,
}: {
  suggestions: Suggestion[] | undefined;
  failed: boolean;
  busy: boolean;
  onSave: (entries: Entry[]) => void;
}) {
  if (failed) {
    return (
      <p className="text-destructive-foreground text-sm">
        {m.mod_collections_suggestions_failed()}
      </p>
    );
  }
  if (suggestions === undefined) {
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }
  if (suggestions.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        {m.mod_collections_suggestions_empty()}
      </p>
    );
  }
  return (
    <ul className="bg-card flex flex-col divide-y rounded-xl border text-sm">
      {suggestions.map((suggestion) => {
        const number = [suggestion.artist, suggestion.season, suggestion.collectionNo].join(" · ");
        const from = suggestion.read.map((member) => member.slug);
        return (
          <li key={`${number}`} className="flex flex-wrap items-start gap-x-6 gap-y-2 px-4 py-3">
            <div className="flex min-w-48 flex-col gap-0.5">
              <span className="font-medium">{number}</span>
              <span className="flex items-center gap-1.5 font-mono text-xs">
                <Swatch color={suggestion.colour} />
                {m.mod_collections_cosmo_value({ color: suggestion.colour })}
              </span>
            </div>
            <div className="text-muted-foreground flex min-w-0 flex-1 flex-col gap-0.5 text-xs text-pretty">
              <span>
                {m.mod_collections_suggestion_read({
                  members: suggestion.read.map((member) => member.member).join(", "),
                })}
              </span>
              <span>
                {m.mod_collections_suggestion_unread({
                  members: suggestion.unread.map((member) => member.member).join(", "),
                })}
              </span>
            </div>
            <Button
              size="xs"
              variant="outline"
              className="ms-auto"
              disabled={busy}
              aria-label={m.mod_collections_apply_label({
                color: suggestion.colour,
                count: String(suggestion.unread.length),
                number,
              })}
              onClick={() =>
                onSave(
                  suggestion.unread.map((member) => ({
                    slug: member.slug,
                    textColor: suggestion.colour,
                    textPinned: false,
                    expected: UNOVERRIDDEN,
                    from,
                  })),
                )
              }
            >
              {m.mod_collections_apply()}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
