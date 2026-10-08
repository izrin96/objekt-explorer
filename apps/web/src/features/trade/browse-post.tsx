import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { PhotocardSkeleton } from "@/features/objekt/photocard-skeleton";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { MatchLine } from "./match-line";
import { MatchedLists } from "./matched-lists";
import { PostSide } from "./post-side";
import { postTime } from "./post-time";
import type { BrowsePostData } from "./post-types";
import { TagBadge } from "./tag-label";
import { THUMB_GRID } from "./thumb-grid";
import { TradeCard, type TradeContact } from "./trade-card";

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

  return (
    <TradeCard
      person={post}
      contact={contact}
      meta={
        <>
          <TagBadge tag={post.tag} />
          {/* relative to the render: the server's minute and the browser's can differ */}
          <time dateTime={time} suppressHydrationWarning>
            {changed ? m.trade_updated_at({ time: when }) : m.trade_bumped_at({ time: when })}
          </time>
        </>
      }
      match={
        <MatchLine
          theyHave={match?.youWant ?? 0}
          youHave={match?.youHave ?? 0}
          popover={match ? <MatchedLists match={match} /> : null}
        >
          {mutual ? (
            <Link
              to="/trade/for-you"
              search={{ match: "mutual", partner: post.userId }}
              className="font-medium underline underline-offset-2"
            >
              {m.trade_browse_mutual_link()}
            </Link>
          ) : null}
        </MatchLine>
      }
    >
      {post.sides.map((side) => (
        <PostSide key={side.list.id} side={side} collections={collections} onOpen={onOpen} />
      ))}
    </TradeCard>
  );
}

/** A post's shape (byline, one side, a row of thumbnails), so the first page lands in place. */
export function BrowsePostSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2 pt-0.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <div className={THUMB_GRID}>
          {Array.from({ length: 4 }).map((_, index) => (
            <PhotocardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
