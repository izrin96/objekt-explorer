import {
  ArrowDownIcon,
  ArrowsLeftRightIcon,
  ArrowUpIcon,
  EyeSlashIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { Frame, FramePanel } from "@/components/ui/frame";
import { MenuItem } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ruleText } from "@/features/list/rules/words";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { collectionName } from "@/features/objekt/objekt-label";
import { useUserLists } from "@/features/user/hooks";
import { relativeTime } from "@/lib/time";
import { TONE_FILL, TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useHideWithUndo } from "./actions";
import type { Surface } from "./browse-search";
import { leadPost, listCount, type MatchBand, matchBand, orderPosts } from "./person-row";
import { EmptySide, isEmptySide, SideStrip } from "./post-side";
import { postTime } from "./post-time";
import type { PersonData, PersonPostData } from "./post-types";
import { TagBadges } from "./tag-label";
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

/**
 * Across the top of a person's card: what the two can swap, tinted, or that the match runs only
 * through sale lists, then each direction's count. One way is only its count, since For you heads
 * that section already. A direction with nothing is left out.
 */
function MatchBandStrip({
  band,
  throughRules = 0,
  className,
}: {
  band: MatchBand;
  /** how many of the swap the viewer wants only through their rules */
  throughRules?: number;
  className?: string;
}) {
  const swap = band.kind === "swap";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl px-3 py-1.5 text-sm",
        swap ? TONE_FILL.progress : "bg-background/60",
        className,
      )}
    >
      {band.kind === "oneWay" ? null : (
        <span
          className={cn(
            "flex items-center gap-1.5 font-medium",
            swap ? TONE_INK.progress : "text-muted-foreground",
          )}
        >
          {band.kind === "swap" ? (
            <>
              <ArrowsLeftRightIcon aria-hidden className="size-4" />
              <span>
                <WithNumber render={(count) => m.trade_person_swap({ count })} count={band.swap} />
                {throughRules > 0 ? (
                  <span className="font-normal">
                    {" · "}
                    {throughRules < band.swap
                      ? m.trade_through_rules({ count: throughRules })
                      : band.swap === 2
                        ? m.trade_through_rules_both()
                        : m.trade_through_rules_all()}
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            m.trade_band_no_swap()
          )}
        </span>
      )}
      <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
        {band.theyHave > 0 ? (
          <span className="flex items-center gap-1">
            <ArrowDownIcon aria-hidden className="size-3.5" />
            <span>
              <WithNumber
                render={(count) => m.trade_match_they_have({ count })}
                count={band.theyHave}
                className="text-foreground"
              />
            </span>
          </span>
        ) : null}
        {band.youHave > 0 ? (
          <span className="flex items-center gap-1">
            <ArrowUpIcon aria-hidden className="size-3.5" />
            <span>
              <WithNumber
                render={(count) => m.trade_match_you_have({ count })}
                count={band.youHave}
                className="text-foreground"
              />
            </span>
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** The post as its own viewer sees it: no rings, since the viewer's row counts nothing. */
function unringed(post: PersonPostData): PersonPostData {
  return {
    ...post,
    sides: post.sides.map((side) => ({
      ...side,
      items: side.items.map(({ ringed: _ringed, ...item }) => item),
      rules: side.rules.map((tile) => ({ ...tile, matched: null, matchedSlugs: [] })),
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
  const strips = shown.sides.filter((side) => !isEmptySide(side));
  const tag = <TagBadges tags={post.tags} className="flex-wrap font-sans normal-case" />;
  return (
    <FramePanel className="flex min-w-0 flex-col gap-2 p-3">
      {/* the tag leads the first strip's label; a post with no strip keeps it on a line of its own */}
      {strips.length === 0 ? tag : null}
      <TradeSides
        strips={strips.map((side, index) => (
          <SideStrip
            key={side.list.id}
            lead={index === 0 ? tag : undefined}
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
      {surface === "forYou" && !own && post.ruleMatches.length > 0 ? (
        <RuleMatchLines matches={post.ruleMatches} collections={collections} />
      ) : null}
    </FramePanel>
  );
}

/** lines before "N more through your rules": a big list would otherwise bury the row */
const RULE_LINES = 3;

/** For you: the poster's objekts the viewer wants only through a rule, one line each. */
function RuleMatchLines({
  matches,
  collections,
}: {
  matches: PersonPostData["ruleMatches"];
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
}) {
  const lists = useUserLists();
  const rest = matches.length - RULE_LINES;
  return (
    <ul className="text-muted-foreground flex flex-col gap-0.5 text-xs">
      {matches.slice(0, RULE_LINES).map((found) => (
        <li key={found.slug} className="min-w-0 truncate">
          <span className="text-foreground font-mono">
            {collectionName(found.slug, collections[found.slug])}
          </span>{" "}
          {m.trade_matches_your_rule()} <span className="font-mono">{ruleText(found.rule)}</span>
          {" · "}
          {lists.find((list) => list.id === found.listId)?.name ?? ""}
        </li>
      ))}
      {rest > 0 ? <li>{m.trade_rule_lines_more({ count: rest })}</li> : null}
    </ul>
  );
}

/**
 * One person on Browse or For you: a header that says what they and the viewer can swap, then a
 * strip per list. The header sentence counts the person, each strip its own list.
 */
/**
 * Memoized: virtua calls the feed's render function for every visible row on each scroll update,
 * so without it every row on screen renders again while the page scrolls.
 */
export const PersonRow = memo(function PersonRow({
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
  onExpand: (userId: string) => void;
  onClear: () => void;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  now: number;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const hide = useHideWithUndo();
  // no match says nothing: a row without a band already reads as one
  const band = own || !signedIn ? null : matchBand(person.counts);
  const posts = orderPosts(person.posts);
  const throughRules = new Set(
    person.posts.flatMap((post) =>
      post.ruleMatches.flatMap((found) => (found.swap ? [found.slug] : [])),
    ),
  ).size;
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
    // padding, not margin, so virtua measures the gap between people with the row
    <article className="@container pb-3">
      <Frame
        className={cn(
          "grid gap-x-4 gap-y-3 @3xl:grid-cols-[minmax(0,1fr)_auto]",
          band ? "pt-1" : "pt-2.5",
        )}
      >
        {band ? (
          <MatchBandStrip
            band={band}
            throughRules={surface === "forYou" ? throughRules : 0}
            className="@3xl:col-span-2 @3xl:row-start-1"
          />
        ) : null}
        <TradeHeader
          className="min-w-0 px-3"
          person={person}
          you={own}
          meta={
            <>
              {lists} ·{" "}
              <time dateTime={newest.time} suppressHydrationWarning>
                {newest.changed
                  ? m.trade_updated_at({ time: when })
                  : m.trade_bumped_at({ time: when })}
              </time>
            </>
          }
          end={
            led ? (
              <Button variant="outline" size="xs" onClick={onClear}>
                <XIcon />
                <span className="@max-3xl:sr-only">{m.trade_person_clear()}</span>
              </Button>
            ) : null
          }
        />
        <div
          className={cn(
            "flex min-w-0 flex-col gap-1 @3xl:col-span-2",
            band ? "@3xl:row-start-3" : "@3xl:row-start-2",
          )}
        >
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
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mx-3 mt-1 mb-1.5 w-fit rounded-sm text-xs underline underline-offset-2 outline-none focus-visible:ring-2"
              onClick={() => onExpand(person.userId)}
            >
              {more === 1
                ? m.trade_person_more_lists_one()
                : m.trade_person_more_lists({ count: more })}
            </button>
          ) : null}
        </div>
        {own ? null : (
          <div
            className={cn(
              "flex items-center gap-2 px-3 pb-2 @3xl:col-start-2 @3xl:self-start @3xl:pb-0",
              band ? "@3xl:row-start-2" : "@3xl:row-start-1",
            )}
          >
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
            {actions}
          </div>
        )}
      </Frame>
    </article>
  );
});

/** A row's shape (header, two strips, actions), so the first page lands in place. */
export function PersonRowSkeleton() {
  return (
    <div className="@container pb-3">
      <Frame className="grid gap-x-4 gap-y-3 pt-2.5 @3xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-start gap-3 px-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <FramePanel className="p-3 @3xl:col-span-2 @3xl:row-start-2">
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
        </FramePanel>
        <Skeleton className="mx-3 mb-2 h-8 w-28 rounded-md @3xl:col-start-2 @3xl:row-start-1 @3xl:mb-0" />
      </Frame>
    </div>
  );
}
