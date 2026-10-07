import type { Outputs } from "@repo/api";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";

import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageButton } from "@/features/chat/message-button";
import { getListLinkOption } from "@/features/list/list-link";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { MakeOfferButton } from "@/features/offers/make-offer-button";
import { TrustLine } from "@/features/offers/trust-line";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { formatCurrency } from "@/features/settings/use-currency";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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

const ROLE_LABEL: Record<Side["role"], () => string> = {
  have: m.trade_side_have,
  want: m.trade_side_want,
  sale: m.trade_side_sale,
};

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

export function TagBadge({ tag }: { tag: PostTag }) {
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
  collections,
  now,
  onOpen,
}: {
  post: BrowsePostData;
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
      <header className="flex items-start gap-3">
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
        {post.messageable && anchor ? (
          <>
            <MessageButton
              target={{ kind: "list", slug: anchor.list.slug }}
              card={
                firstShown ? { collectionSlug: firstShown, listSlug: anchor.list.slug } : undefined
              }
              name={identity.name}
              className="shrink-0"
            />
            <MakeOfferButton
              request={{
                to: { target: { kind: "list", slug: anchor.list.slug } },
                name: identity.name,
                focusList: anchor.list.slug,
              }}
              labelClassName="max-sm:sr-only"
              className="shrink-0"
            />
          </>
        ) : null}
        <SafetyMenu userId={post.userId} name={identity.name} className="shrink-0" />
      </header>

      {match && (match.youHave > 0 || match.youWant > 0) ? (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums">
          {match.youHave > 0 ? (
            <span>{m.trade_match_you_have({ count: match.youHave })}</span>
          ) : null}
          {match.youWant > 0 ? (
            <span>{m.trade_match_you_want({ count: match.youWant })}</span>
          ) : null}
        </p>
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
      <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
        <span className="text-muted-foreground font-medium">{ROLE_LABEL[side.role]()}</span>
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
      {/* auto-fill keeps a card near thumbnail size however wide the page is */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]">
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
