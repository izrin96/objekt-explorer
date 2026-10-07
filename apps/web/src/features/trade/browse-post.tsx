import type { Outputs } from "@repo/api";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";

import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageButton } from "@/features/chat/message-button";
import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { MakeOfferButton } from "@/features/offers/make-offer-button";
import { TrustLine } from "@/features/offers/trust-line";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { formatCurrency } from "@/features/settings/use-currency";
import { useUserLists } from "@/features/user/hooks";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ListRoleBadge } from "./list-role-badge";
import { THUMB_GRID } from "./thumb-grid";

type BrowsePage = Outputs["trade"]["browse"];
export type BrowsePostData = BrowsePage["posts"][number];
type Side = BrowsePostData["sides"][number];
type PostTag = BrowsePostData["tag"];

const TAG_LABEL: Record<PostTag, { short: () => string; long: () => string }> = {
  wtt: { short: m.trade_tag_wtt, long: m.trade_tag_wtt_desc },
  wtb: { short: m.trade_tag_wtb, long: m.trade_tag_wtb_desc },
  wts: { short: m.trade_tag_wts, long: m.trade_tag_wts_desc },
};

/** monochrome on purpose: the class stripes stay the only colour in the grid */
const RING = "ring-foreground ring-offset-card ring-2 ring-offset-2";
/**
 * Drawn inside the artwork (its first child) by a pseudo-element, so the card's own
 * focus ring, a box-shadow on the same element, still shows on a ringed card.
 */
const CARD_RING =
  "*:first:after:pointer-events-none *:first:after:absolute *:first:after:inset-0 *:first:after:rounded-photocard *:first:after:border-2 *:first:after:border-foreground *:first:after:shadow-[inset_0_0_0_2px_var(--color-card)]";

/** The short tag stays visible; the spelled-out one is read and shown on hover. */
export function TagLabel({ tag }: { tag: PostTag }) {
  return (
    <>
      <abbr aria-hidden title={TAG_LABEL[tag].long()} className="no-underline">
        {TAG_LABEL[tag].short()}
      </abbr>
      <span className="sr-only">{TAG_LABEL[tag].long()}</span>
    </>
  );
}

function TagBadge({ tag }: { tag: PostTag }) {
  return (
    <Badge variant="outline" size="sm" className="font-mono">
      <TagLabel tag={tag} />
    </Badge>
  );
}

/** Posting a list touches it a moment after the bump, so that touch still reads as the bump. */
const BUMP_TOUCH_MS = 60_000;

/** An edit does not move a post, but it does make it current. */
export function postTime(post: { bumpedAt: string | null; updatedAt: string }) {
  const changed =
    post.bumpedAt === null ||
    new Date(post.updatedAt).getTime() - new Date(post.bumpedAt).getTime() > BUMP_TOUCH_MS;
  return { changed, time: changed ? post.updatedAt : post.bumpedAt! };
}

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
  const { identity, user, match } = post;
  const { changed, time } = postTime(post);
  const when = relativeTime(new Date(time).getTime(), now);
  // the post's own list (the have list of a pair), with the first collection it shows
  const anchor = post.sides.find((side) => side.list.id === post.id);
  const firstShown = anchor?.items[0]?.slug;

  return (
    <article className="bg-card flex flex-col gap-4 rounded-lg border p-4">
      {/* below `sm` the actions take a row of their own, so the name keeps the width */}
      <header className="flex flex-wrap items-start gap-3">
        <Avatar className="size-9 shrink-0">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>{identity.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="min-w-0 text-base leading-snug font-semibold break-words">
              {identity.address ? (
                <ProfileLink
                  address={identity.address}
                  nickname={identity.name}
                  className="underline-offset-2 hover:underline"
                >
                  {identity.name}
                </ProfileLink>
              ) : (
                identity.name
              )}
            </h2>
            {user.discord ? <SocialBadge platform="discord" username={user.discord} /> : null}
            {user.twitter ? <SocialBadge platform="twitter" username={user.twitter} /> : null}
          </div>
          <TrustLine reputation={post.reputation} />
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <TagBadge tag={post.tag} />
            {/* relative to the render: the server's minute and the browser's can differ */}
            <time dateTime={time} suppressHydrationWarning>
              {changed ? m.trade_updated_at({ time: when }) : m.trade_bumped_at({ time: when })}
            </time>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full max-sm:ps-12">
          {post.messageable && anchor ? (
            <>
              <MessageButton
                target={{ kind: "list", slug: anchor.list.slug }}
                card={
                  firstShown
                    ? { collectionSlug: firstShown, listSlug: anchor.list.slug }
                    : undefined
                }
                name={identity.name}
              />
              <MakeOfferButton
                request={{
                  to: { target: { kind: "list", slug: anchor.list.slug } },
                  name: identity.name,
                  focusList: anchor.list.slug,
                }}
              />
            </>
          ) : own ? null : (
            <span className="text-muted-foreground text-sm">{m.trade_not_messageable()}</span>
          )}
          <SafetyMenu userId={post.userId} name={identity.name} report />
        </div>
      </header>

      {mutual || (match && (match.youHave > 0 || match.youWant > 0)) ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
          {match && (match.youHave > 0 || match.youWant > 0) ? (
            <Popover>
              {/* the counts open the lists they were taken from */}
              <PopoverTrigger className="focus-visible:ring-ring flex cursor-pointer flex-wrap gap-x-3 gap-y-1 rounded-sm text-start underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2">
                {match.youHave > 0 ? (
                  <span>{m.trade_match_you_have({ count: match.youHave })}</span>
                ) : null}
                {match.youWant > 0 ? (
                  <span>{m.trade_match_you_want({ count: match.youWant })}</span>
                ) : null}
              </PopoverTrigger>
              <PopoverPopup align="start" className="w-72">
                <MatchedLists have={match.haveListIds} want={match.wantListIds} />
              </PopoverPopup>
            </Popover>
          ) : null}
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

      {post.sides.map((side) => (
        <PostSide key={side.list.id} side={side} collections={collections} onOpen={onOpen} />
      ))}
    </article>
  );
}

function PostSide({
  side,
  collections,
  onOpen,
}: {
  side: Side;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const { list } = side;
  const currency = side.role === "sale" ? list.currency : null;
  const priceOf = (item: Side["items"][number]) => {
    if (side.role !== "sale") return undefined;
    if (item.isQyop) return m.objekt_qyop();
    return item.price !== null && currency ? formatCurrency(item.price, currency) : undefined;
  };

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <ListRoleBadge type={side.role} />
        <Link
          {...getListLinkOption(list)}
          className="min-w-0 font-medium break-words underline-offset-2 hover:underline"
        >
          {list.name}
        </Link>
        {currency ? (
          <span className="text-muted-foreground font-mono text-xs">({currency})</span>
        ) : null}
      </h3>
      {list.description ? (
        <p className="text-muted-foreground line-clamp-2 text-sm text-pretty break-words whitespace-pre-wrap">
          {list.description}
        </p>
      ) : null}
      <ul className={THUMB_GRID}>
        {side.items.map((item) => {
          const collection = collections[item.slug];
          return (
            /* a container, so the slug tile's radius matches the cards' */
            <li key={item.entryId} className="@container min-w-0">
              {collection ? (
                <ObjektCard
                  objekt={collection}
                  image="thumbnail"
                  onOpen={() => onOpen(collection)}
                  captionClassName="text-xs"
                  price={priceOf(item)}
                  priceMuted={item.isQyop}
                  className={item.ringed ? CARD_RING : undefined}
                  description={item.ringed ? m.trade_match_ring() : undefined}
                />
              ) : (
                <div
                  className={cn(
                    "bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center p-2 text-center font-mono text-xs leading-snug break-all",
                    item.ringed && RING,
                  )}
                >
                  {item.slug}
                  {item.ringed ? <span className="sr-only">{m.trade_match_ring()}</span> : null}
                </div>
              )}
            </li>
          );
        })}
        {side.more > 0 ? (
          <li className="@container self-start">
            <Link
              {...getListLinkOption(list)}
              className="bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-photocard aspect-photocard grid place-items-center font-mono text-sm tabular-nums outline-none focus-visible:ring-2"
            >
              <span aria-hidden>+{side.more}</span>
              <span className="sr-only">{m.trade_more_count({ count: side.more })}</span>
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
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
            <Skeleton key={index} className="aspect-photocard rounded-photocard w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The viewer's lists a post's counts compare against: every have list one way, every want list the other. */
/** The viewer's lists this post's counts came from. */
function MatchedLists({ have, want }: { have: number[]; want: number[] }) {
  const lists = useUserLists();
  const rows = (["have", "want"] as const).flatMap((type) => {
    const ids = new Set(type === "have" ? have : want);
    const matched = lists.filter((list) => ids.has(list.id));
    return matched.length > 0 ? [{ type, matched }] : [];
  });
  return (
    <div className="flex flex-col gap-3">
      <PopoverTitle className="text-sm">{m.trade_match_lists_title()}</PopoverTitle>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        {rows.map(({ type, matched }) => (
          <Fragment key={type}>
            <dt className="text-muted-foreground pt-px font-mono text-xs">
              {LIST_TYPE_LABEL[type]()}
            </dt>
            <dd className="flex min-w-0 flex-col items-start gap-1">
              {matched.map((list) => (
                <Link
                  key={list.id}
                  {...getListLinkOption(list)}
                  className="min-w-0 break-words underline-offset-2 hover:underline"
                >
                  {list.name}
                </Link>
              ))}
            </dd>
          </Fragment>
        ))}
      </dl>
      <Link
        to="/list"
        className="text-muted-foreground hover:text-foreground self-start text-xs underline-offset-2 hover:underline"
      >
        {m.nav_manage_list()}
      </Link>
    </div>
  );
}
