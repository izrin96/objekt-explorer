import { CardsThreeIcon, LinkSimpleIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { copyWithToast } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { Surface } from "./browse-search";
import type { OpenObjekt } from "./near";
import { listCount } from "./person-row";
import { PersonRow } from "./person-row-view";
import type { PersonData } from "./post-types";

const NAME_SLOT = "";

/** A `person` link's one row, under a banner that names it and over a way back to everyone. */
export function PersonLinkView({
  person,
  own,
  signedIn,
  onClear,
  busy,
  ...row
}: {
  person: PersonData;
  surface: Surface;
  own: boolean;
  signedIn: boolean;
  onClear: () => void;
  /** the previous filters' row, shown while the new one loads */
  busy: boolean;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  now: number;
  onOpen: OpenObjekt;
}) {
  // the numbers the row's strips show, summed
  const counted =
    own || !signedIn
      ? 0
      : person.posts.reduce(
          (sum, post) => sum + post.sides.reduce((total, side) => total + listCount(post, side), 0),
          0,
        );
  // Browse's address with the link's filters: For you's path and matching choice are the viewer's own
  const copy = () => {
    const url = new URL(window.location.href);
    url.pathname = "/trade";
    url.searchParams.delete("match");
    url.searchParams.delete("list");
    const href = url.toString();
    void copyWithToast(href, { title: m.list_share_copied(), description: href });
  };
  const [before, after] = m.trade_person_link_banner({ name: NAME_SLOT }).split(NAME_SLOT);

  return (
    <div aria-busy={busy} className={cn("flex flex-col gap-3", busy && "opacity-60")}>
      <div className="bg-card flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-2.5">
        <LinkSimpleIcon aria-hidden className="text-muted-foreground size-4 shrink-0" />
        <p className="min-w-0 flex-1 basis-56 text-sm text-pretty">
          {before}
          <span className="font-medium">{person.identity.name}</span>
          {after}
          {counted > 0 ? (
            <span className="text-muted-foreground tabular-nums">
              {" "}
              {counted === 1
                ? m.trade_person_link_on_lists_one({ count: counted })
                : m.trade_person_link_on_lists({ count: counted })}
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={copy}>
            <ShareNetworkIcon />
            {m.trade_post_copy_link()}
          </Button>
          <Button variant="outline" size="sm" onClick={onClear}>
            {m.trade_person_clear()}
          </Button>
        </div>
      </div>
      {/* the banner owns the way back, so the row has no clear button */}
      <PersonRow
        person={person}
        own={own}
        signedIn={signedIn}
        led={false}
        onClear={onClear}
        {...row}
      />
      <button
        type="button"
        onClick={onClear}
        className="hover:bg-secondary focus-visible:ring-ring rounded-lg border border-dashed px-4 py-3 text-left text-sm outline-none focus-visible:ring-2"
      >
        <span className="font-medium">{m.trade_person_link_more()}</span>
        <span className="text-muted-foreground"> · {m.trade_person_link_more_hint()}</span>
      </button>
    </div>
  );
}

/** A `person` link with no row; it never names the person, who may be hidden or blocking. */
export function PersonLinkEmpty({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={CardsThreeIcon}
      title={m.trade_person_empty_title()}
      hint={m.trade_person_empty_hint()}
      action={
        <Button variant="outline" size="sm" onClick={onClear}>
          {m.trade_person_clear()}
        </Button>
      }
    />
  );
}
