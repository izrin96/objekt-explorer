import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { getListLinkOption } from "@/features/list/list-link";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { ListsPopover } from "./lists-popover";
import { MatchChip } from "./match-chip";
import { MatchedLists } from "./matched-lists";
import { SideStrip } from "./post-side";
import { postTime } from "./post-time";
import type { BrowsePostData } from "./post-types";
import { TagBadge } from "./tag-label";
import { TradeActions, type TradeContact } from "./trade-actions";
import { TradeHeader } from "./trade-header";
import { TradeRow, TradeSides } from "./trade-row";

export type { BrowsePostData } from "./post-types";

export function BrowsePost({
  post,
  own,
  collections,
  now,
  mutual = false,
  onOpen,
}: {
  post: BrowsePostData;
  /** the viewer's own post: no Message, and no note saying so */
  own: boolean;
  /** the owner is a Mutual only partner in the viewer's For you */
  mutual?: boolean;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  now: number;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const { match } = post;
  const { changed, time } = postTime(post);
  const when = relativeTime(new Date(time).getTime(), now);
  // the post's own list (the have list of a pair), with the first collection it shows
  const anchor = post.sides.find((side) => side.list.id === post.id);
  const firstShown = anchor?.items[0]?.slug;
  const contact: TradeContact = own
    ? { kind: "own" }
    : post.messageable && anchor
      ? {
          kind: "open",
          target: { kind: "list", slug: anchor.list.slug },
          card: firstShown ? { collectionSlug: firstShown, listSlug: anchor.list.slug } : undefined,
        }
      : { kind: "closed" };
  const counted = (match?.youWant ?? 0) > 0 || (match?.youHave ?? 0) > 0;
  const showChip = counted || mutual;

  return (
    <TradeRow
      byline={
        <TradeHeader
          person={post}
          note={
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <TagBadge tag={post.tag} />
              {/* relative to the render: the server's minute and the browser's can differ */}
              <time
                dateTime={time}
                suppressHydrationWarning
                className="text-muted-foreground font-mono text-xs"
              >
                {changed ? m.trade_updated_at({ time: when }) : m.trade_bumped_at({ time: when })}
              </time>
            </div>
          }
        />
      }
      sides={
        <TradeSides
          strips={post.sides.map((side) => (
            <SideStrip key={side.list.id} side={side} collections={collections} onOpen={onOpen} />
          ))}
        />
      }
      actions={
        <>
          {own ? null : <TradeActions contact={contact} name={post.identity.name} compact />}
          <SafetyMenu userId={post.userId} name={post.identity.name} report />
        </>
      }
      below={
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {showChip ? (
            <MatchChip
              theyHave={match?.youWant ?? 0}
              youHave={match?.youHave ?? 0}
              popover={match ? <MatchedLists match={match} /> : null}
            />
          ) : null}
          <ListsPopover
            lists={post.sides.map((side) => ({
              id: side.list.id,
              name: side.list.name,
              type: side.role,
              link: getListLinkOption(side.list),
            }))}
          />
          {mutual ? (
            <Link
              to="/trade/for-you"
              search={{ match: "mutual", partner: post.userId }}
              className="font-medium underline underline-offset-2"
            >
              {m.trade_browse_mutual_link()}
            </Link>
          ) : null}
        </div>
      }
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
                    className="aspect-photocard rounded-photocard w-14 shrink-0"
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
