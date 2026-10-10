import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { getListLinkOption } from "@/features/list/list-link";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { MatchChip } from "./match-chip";
import { MatchedLists } from "./matched-lists";
import { PostStrip } from "./post-side";
import { postTime } from "./post-time";
import type { BrowsePostData } from "./post-types";
import { TagBadge } from "./tag-label";
import { TradeActions, type TradeContact } from "./trade-actions";
import { TradeHeader } from "./trade-header";

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
  const named = (anchor ?? post.sides[0])?.list;
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

  return (
    <article className="bg-card flex h-full flex-col gap-3 rounded-lg border p-4">
      <TradeHeader person={post} end={<TagBadge tag={post.tag} />} />

      {named ? (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            {...getListLinkOption(named)}
            className="min-w-0 text-sm font-medium break-words underline-offset-2 hover:underline"
          >
            {named.name}
          </Link>
          {named.description ? (
            <p className="text-muted-foreground line-clamp-1 text-sm break-words">
              {named.description}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {post.sides.map((side) => (
          <PostStrip key={side.list.id} side={side} collections={collections} onOpen={onOpen} />
        ))}
      </div>

      {counted || mutual ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <MatchChip
            theyHave={match?.youWant ?? 0}
            youHave={match?.youHave ?? 0}
            popover={match ? <MatchedLists match={match} /> : null}
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
      ) : null}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
        {/* relative to the render: the server's minute and the browser's can differ */}
        <time
          dateTime={time}
          suppressHydrationWarning
          className="text-muted-foreground font-mono text-xs"
        >
          {changed ? m.trade_updated_at({ time: when }) : m.trade_bumped_at({ time: when })}
        </time>
        <div className="flex items-center gap-2">
          <TradeActions contact={contact} name={post.identity.name} compact />
        </div>
      </footer>
    </article>
  );
}

/** A post's shape (byline, list name, two strips, footer), so the first page lands in place. */
export function BrowsePostSkeleton() {
  return (
    <div className="bg-card flex h-full flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2 pt-0.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }).map((_, row) => (
          <div key={row} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2">
            <Skeleton className="h-3 w-8" />
            <div className="flex gap-1.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="aspect-photocard rounded-photocard w-10 shrink-0"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
    </div>
  );
}
