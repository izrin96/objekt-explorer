import { EyeSlashIcon } from "@phosphor-icons/react";
import { mutualOf } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getListLinkOption } from "@/features/list/list-link";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { TrustLine } from "@/features/offers/trust-line";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { useHideWithUndo } from "./actions";
import type { Surface } from "./browse-search";
import { ListsPopover } from "./lists-popover";
import { MatchChip } from "./match-chip";
import { MatchedLists } from "./matched-lists";
import { EmptySide, isEmptySide, SideStrip } from "./post-side";
import { postTime } from "./post-time";
import type { BrowsePostData } from "./post-types";
import { TagBadge } from "./tag-label";
import { TradeActions, type TradeContact } from "./trade-actions";
import { TradeHeader } from "./trade-header";
import { TradeRow, TradeSides } from "./trade-row";

export type { BrowsePostData } from "./post-types";

export function BrowsePost({
  post,
  surface,
  own,
  collections,
  now,
  onOpen,
  onOpenPerson,
}: {
  post: BrowsePostData;
  surface: Surface;
  /** the viewer's own post: no Message, and no note saying so */
  own: boolean;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  now: number;
  onOpen: (objekt: ValidObjekt) => void;
  /** opens the owner's person sheet */
  onOpenPerson: (userId: string) => void;
}) {
  const { person } = post;
  const hide = useHideWithUndo();
  const { changed, time } = postTime(post);
  const when = relativeTime(new Date(time).getTime(), now);
  // the post's own list: the have list of a pair
  const anchor = post.sides.find((side) => side.list.id === post.id);
  // the server saves the match, by the same rules as the chip; this only asks for it
  const withMatch = !!person && (person.counts.theyHave > 0 || person.counts.youHave > 0);
  const contact: TradeContact = own
    ? { kind: "own" }
    : post.messageable && anchor
      ? {
          kind: "open",
          target: { kind: "list", slug: anchor.list.slug },
          card: { kind: "post", listSlug: anchor.list.slug, withMatch },
        }
      : { kind: "closed" };
  const wantOnly = post.tag === "wtt" && post.sides.every((side) => side.role === "want");
  // on For you the chip is for mutual posts; a one-way post's strip labels carry the count
  const showChip = !!person && (surface === "browse" || mutualOf(person.counts) > 0);
  const twoLists = post.sides.length === 2;
  const allMatches = person ? (
    <Button
      variant="outline"
      size="xs"
      className="font-mono text-xs"
      onClick={() => onOpenPerson(post.userId)}
    >
      {m.trade_all_matches()}
    </Button>
  ) : null;
  const notes = (
    <>
      {wantOnly ? (
        <span className="text-muted-foreground text-xs">{m.trade_wtt_swaps_only()}</span>
      ) : null}
      {post.buyingOnly ? (
        <span className="text-muted-foreground text-xs">{m.trade_wtb_buying_only()}</span>
      ) : null}
    </>
  );
  // relative to the render: the server's minute and the browser's can differ
  const timeTag = (
    <time
      dateTime={time}
      suppressHydrationWarning
      className="text-muted-foreground font-mono text-xs"
    >
      {changed ? m.trade_updated_at({ time: when }) : m.trade_bumped_at({ time: when })}
    </time>
  );

  return (
    <TradeRow
      byline={
        <TradeHeader
          person={post}
          socials="discord"
          you={own}
          end={
            <SafetyMenu
              userId={post.userId}
              name={post.identity.name}
              report
              extraItems={
                <MenuItem onClick={() => hide(post.userId, post.identity.name)}>
                  <EyeSlashIcon />
                  {m.trade_hide_partner()}
                </MenuItem>
              }
            />
          }
          note={
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <TagBadge tag={post.tag} />
              {notes}
              {timeTag}
            </div>
          }
          phoneLine={
            <>
              <span className="whitespace-nowrap">
                <TagBadge tag={post.tag} />
                {" · "}
              </span>{" "}
              {post.reputation ? (
                <>
                  <span className="whitespace-nowrap">
                    <TrustLine reputation={post.reputation} variant="compact" className="inline" />
                    {" · "}
                  </span>{" "}
                </>
              ) : null}
              <span className="whitespace-nowrap">{timeTag}</span>
              {wantOnly || post.buyingOnly ? (
                <>
                  {" · "}
                  <span className="whitespace-nowrap">{notes}</span>
                </>
              ) : null}
            </>
          }
        />
      }
      sides={
        <div className="flex min-w-0 flex-col gap-2">
          <TradeSides
            strips={post.sides
              .filter((side) => !isEmptySide(side))
              .map((side) => (
                <SideStrip
                  key={side.list.id}
                  side={side}
                  surface={surface}
                  narrowed={post.narrowed}
                  labelLink={post.sides.length === 1}
                  collections={collections}
                  onOpen={onOpen}
                />
              ))}
          />
          {post.sides.filter(isEmptySide).map((side) => (
            <EmptySide key={side.list.id} side={side} surface={surface} />
          ))}
        </div>
      }
      actions={
        own ? undefined : (
          <>
            <TradeActions
              contact={contact}
              name={post.identity.name}
              compact
              offerClassName="@max-3xl:flex-1"
            />
            <span className="contents @3xl:hidden">{allMatches}</span>
          </>
        )
      }
      below={
        twoLists || showChip || person ? (
          <div className="flex min-w-0 items-center gap-2 text-xs">
            {twoLists ? (
              <ListsPopover
                lists={post.sides.map((side) => ({
                  id: side.list.id,
                  name: side.list.name,
                  description: side.list.description,
                  type: side.role,
                  link: getListLinkOption(side.list),
                }))}
              />
            ) : null}
            {showChip && person ? (
              <MatchChip counts={person.counts} popover={<MatchedLists {...person} />} />
            ) : null}
            <span className="contents @max-3xl:hidden">{allMatches}</span>
          </div>
        ) : undefined
      }
      belowClassName={twoLists || showChip ? undefined : "@max-3xl:hidden"}
    />
  );
}

/** A post's shape (byline, two strips, actions), so the first page lands in place. */
export function BrowsePostSkeleton() {
  return (
    <TradeRow
      byline={
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      }
      sides={
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
      }
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
      below={<Skeleton className="h-4 w-48" />}
    />
  );
}
