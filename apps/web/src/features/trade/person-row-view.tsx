import { EyeSlashIcon, XIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { relativeTime } from "@/lib/time";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useHideWithUndo } from "./actions";
import type { Surface } from "./browse-search";
import { type HeaderSentence, headerSentence, leadPost, listCount, orderPosts } from "./person-row";
import { EmptySide, isEmptySide, SideStrip } from "./post-side";
import { postTime } from "./post-time";
import type { PersonData, PersonPostData } from "./post-types";
import { TagBadge } from "./tag-label";
import { TradeActions, type TradeContact } from "./trade-actions";
import { TradeHeader } from "./trade-header";
import { TradeSides } from "./trade-row";

/** posts shown before "+N more lists" */
const SHOWN_POSTS = 2;

/** stands where a message puts its number, so the number can be styled whatever its position */
const NUMBER = "";

/** A message with its number set apart in monospace; the words stay the accessible text. */
function WithNumber({
  render,
  count,
  className,
}: {
  render: (count: string) => string;
  count: number;
  className?: string;
}) {
  const [before = "", after = ""] = render(NUMBER).split(NUMBER);
  return (
    <>
      {before}
      <b className={cn("font-mono font-semibold tabular-nums", className)}>{count}</b>
      {after}
    </>
  );
}

function Sentence({ sentence }: { sentence: HeaderSentence }) {
  switch (sentence.kind) {
    case "swap":
      return (
        <WithNumber
          render={(count) => m.trade_person_swap({ count })}
          count={sentence.count}
          className={TONE_INK.progress}
        />
      );
    case "youHave":
      return (
        <WithNumber render={(count) => m.trade_match_you_have({ count })} count={sentence.count} />
      );
    case "theyHave":
      return (
        <WithNumber render={(count) => m.trade_match_they_have({ count })} count={sentence.count} />
      );
    case "none":
      return <span className="text-muted-foreground">{m.trade_person_no_match()}</span>;
  }
}

/** The post as its own viewer sees it: no rings, since the viewer's row counts nothing. */
function unringed(post: PersonPostData): PersonPostData {
  return {
    ...post,
    sides: post.sides.map((side) => ({
      ...side,
      items: side.items.map(({ ringed: _ringed, ...item }) => item),
    })),
  };
}

function PostBlock({
  post,
  surface,
  own,
  collections,
  onOpen,
}: {
  post: PersonPostData;
  surface: Surface;
  own: boolean;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const shown = own ? unringed(post) : post;
  const wantOnly = post.tag === "wtt" && post.sides.every((side) => side.role === "want");
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <TagBadge tag={post.tag} />
        {wantOnly ? (
          <span className="text-muted-foreground text-xs">{m.trade_wtt_swaps_only()}</span>
        ) : null}
        {post.buyingOnly ? (
          <span className="text-muted-foreground text-xs">{m.trade_wtb_buying_only()}</span>
        ) : null}
      </div>
      <TradeSides
        strips={shown.sides
          .filter((side) => !isEmptySide(side))
          .map((side) => (
            <SideStrip
              key={side.list.id}
              side={side}
              count={own ? 0 : listCount(post, side)}
              narrowed={post.narrowed}
              collections={collections}
              onOpen={onOpen}
            />
          ))}
      />
      {shown.sides.filter(isEmptySide).map((side) => (
        <EmptySide key={side.list.id} side={side} surface={surface} />
      ))}
    </div>
  );
}

/**
 * One person on Browse or For you: a header that says what they and the viewer can swap, then a
 * strip per list. The header sentence counts the person, each strip its own list.
 */
export function PersonRow({
  person,
  surface,
  own,
  signedIn,
  led,
  expanded,
  onExpand,
  onClear,
  collections,
  now,
  onOpen,
}: {
  person: PersonData;
  surface: Surface;
  /** the viewer's own row: no sentence, no counts, no rings, no actions */
  own: boolean;
  /** a signed-out visitor has no lists to match, so the row says nothing about matching */
  signedIn: boolean;
  /** `person` put this row first: every post shows, and the row can be cleared */
  led: boolean;
  /** "+N more lists" was activated; kept by the feed, since a scrolled-off row loses its state */
  expanded: boolean;
  onExpand: () => void;
  onClear: () => void;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  now: number;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const hide = useHideWithUndo();
  const posts = orderPosts(person.posts);
  const lead = leadPost(person.posts);
  const all = led || expanded;
  const shown = all ? posts : posts.slice(0, SHOWN_POSTS);
  const more = posts.length - shown.length;
  // the post's own list: the have list of a pair
  const anchor = lead?.sides.find((side) => side.list.id === lead.id);
  const counts = person.counts;
  const matches = !!counts && (counts.theyHave > 0 || counts.youHave > 0);
  const contact: TradeContact = own
    ? { kind: "own" }
    : person.messageable && anchor
      ? {
          kind: "open",
          target: { kind: "list", slug: anchor.list.slug },
          card: { kind: "post", listSlug: anchor.list.slug, withMatch: matches },
        }
      : { kind: "closed" };

  const newest = posts
    .map(postTime)
    .reduce((a, b) => (Date.parse(b.time) > Date.parse(a.time) ? b : a));
  // relative to the render: the server's minute and the browser's can differ
  const when = relativeTime(new Date(newest.time).getTime(), now);
  const lists =
    posts.length === 1 ? m.trade_person_lists_one() : m.trade_person_lists({ count: posts.length });

  const actions = (
    <TradeActions
      contact={contact}
      name={person.identity.name}
      compact
      offerClassName="@max-3xl:flex-1"
    />
  );

  return (
    <article className="hover:bg-secondary/40 @container border-b motion-safe:transition-colors motion-safe:duration-150">
      <div className="grid gap-x-4 gap-y-3 px-4 py-3.5 @3xl:grid-cols-[minmax(0,1fr)_auto]">
        <TradeHeader
          className="min-w-0"
          person={person}
          you={own}
          end={
            <>
              {led ? (
                <Button variant="outline" size="xs" onClick={onClear}>
                  <XIcon />
                  <span className="@max-3xl:sr-only">{m.trade_person_clear()}</span>
                </Button>
              ) : null}
              <SafetyMenu
                userId={person.userId}
                name={person.identity.name}
                report
                extraItems={
                  <MenuItem onClick={() => hide(person.userId, person.identity.name)}>
                    <EyeSlashIcon />
                    {m.trade_hide_partner()}
                  </MenuItem>
                }
              />
            </>
          }
          note={
            <div className="flex flex-col gap-0.5">
              {own || !signedIn ? null : (
                <span className="text-sm">
                  <Sentence sentence={headerSentence(counts)} />
                </span>
              )}
              <span className="text-muted-foreground font-mono text-xs">
                {lists} ·{" "}
                <time dateTime={newest.time} suppressHydrationWarning>
                  {newest.changed
                    ? m.trade_updated_at({ time: when })
                    : m.trade_bumped_at({ time: when })}
                </time>
              </span>
            </div>
          }
        />
        <div className="flex min-w-0 flex-col gap-3 @3xl:col-span-2 @3xl:row-start-2 @3xl:ps-12">
          {shown.map((post) => (
            <PostBlock
              key={post.id}
              post={post}
              surface={surface}
              own={own}
              collections={collections}
              onOpen={onOpen}
            />
          ))}
          {more > 0 ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring w-fit rounded-sm text-xs underline underline-offset-2 outline-none focus-visible:ring-2"
              onClick={onExpand}
            >
              {more === 1
                ? m.trade_person_more_lists_one()
                : m.trade_person_more_lists({ count: more })}
            </button>
          ) : null}
        </div>
        {own ? null : (
          <div className="flex items-center gap-2 @3xl:col-start-2 @3xl:row-start-1 @3xl:self-start">
            {actions}
          </div>
        )}
      </div>
    </article>
  );
}

/** A row's shape (header, two strips, actions), so the first page lands in place. */
export function PersonRowSkeleton() {
  return (
    <div className="@container border-b">
      <div className="grid gap-x-4 gap-y-3 px-4 py-3.5 @3xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="@3xl:col-span-2 @3xl:row-start-2 @3xl:ps-12">
          <TradeSides
            strips={[0, 1].map((side) => (
              <div key={side} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-12" />
                <div className="flex gap-x-1.5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="aspect-photocard rounded-photocard w-10 shrink-0"
                    />
                  ))}
                </div>
              </div>
            ))}
          />
        </div>
        <Skeleton className="h-8 w-28 rounded-md @3xl:col-start-2 @3xl:row-start-1" />
      </div>
    </div>
  );
}
