import {
  ArrowClockwiseIcon,
  ArrowUpRightIcon,
  CaretRightIcon,
  UsersIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { PartnerListMatch, TradePartner } from "@repo/api/schemas/list";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { getListLinkOption } from "../list-link";
import { type TradeMode, tradePartnersOptions } from "./queries";

/** the response carries the indexer's collection rows keyed by slug */
type TradeCollections = Record<
  string,
  { collectionId: string; thumbnailImage: string } | undefined
>;

/** a partner can match on hundreds of collections; the rest are counted, not drawn */
const MAX_THUMBNAILS = 50;

/** one entry per direction, so a partner's badge and its column cannot disagree */
const DIRECTION = {
  theyHaveIWant: {
    badge: "warning",
    rule: "border-l-warning/60",
    title: m.list_trade_matches_they_have_you_want,
    short: m.list_trade_matches_have_label,
  },
  iHaveTheyWant: {
    badge: "success",
    rule: "border-l-success/60",
    title: m.list_trade_matches_you_have_they_want,
    short: m.list_trade_matches_want_label,
  },
} as const;

type Direction = keyof typeof DIRECTION;

export function TradeMatchesContent({ slug, mode }: { slug: string; mode: TradeMode }) {
  const query = useQuery(tradePartnersOptions(slug, mode));

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1.5">
        <Shimmer className="h-13 rounded-lg" />
        <Shimmer className="h-13 rounded-lg" />
        <Shimmer className="h-13 rounded-lg" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        bordered={false}
        icon={WarningIcon}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }

  const { partners, collections } = query.data;

  if (partners.length === 0) {
    return <EmptyState bordered={false} icon={UsersIcon} title={m.list_trade_matches_empty()} />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-muted-foreground text-xs">
        {m.list_trade_matches_count_label({ count: partners.length })}
      </p>
      <div className="flex flex-col divide-y rounded-lg border">
        {partners.map((partner, index) => (
          <PartnerDisclosure
            key={partner.userId}
            partner={partner}
            rank={index + 1}
            collections={collections}
          />
        ))}
      </div>
    </div>
  );
}

function PartnerDisclosure({
  partner,
  rank,
  collections,
}: {
  partner: TradePartner;
  rank: number;
  collections: TradeCollections;
}) {
  const socials = partner.user.discord !== null || partner.user.twitter !== null;

  return (
    /* `<details>` rather than a rebuilt disclosure: it already toggles on Enter
       and Space and announces its expanded state */
    <details className="group px-3 py-2.5">
      <summary className="focus-visible:ring-ring flex cursor-pointer items-center gap-2.5 rounded-sm outline-none focus-visible:ring-2">
        <span className="text-muted-foreground w-5 shrink-0 text-center font-mono text-xs tabular-nums">
          {String(rank).padStart(2, "0")}
        </span>
        <Avatar className="size-7 shrink-0">
          {partner.user.image ? <AvatarImage src={partner.user.image} alt="" /> : null}
          <AvatarFallback>{(partner.user.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{partner.username}</span>
        {(["theyHaveIWant", "iHaveTheyWant"] as const).map((direction) => {
          const count = new Set(partner.matches.flatMap((match) => match[direction])).size;
          if (count === 0) return null;
          const { badge, short, title } = DIRECTION[direction];
          return (
            <Badge
              key={direction}
              variant={badge}
              title={title()}
              className="shrink-0 font-mono tabular-nums"
            >
              {count} {short()}
            </Badge>
          );
        })}
        <CaretRightIcon
          aria-hidden
          className="text-muted-foreground size-3.5 shrink-0 transition-transform group-open:rotate-90"
        />
      </summary>

      <div className="mt-3 flex flex-col gap-4 sm:pl-7.5">
        {socials ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
            {partner.user.discord ? (
              <SocialBadge platform="discord" username={partner.user.discord} />
            ) : null}
            {partner.user.twitter ? (
              <SocialBadge platform="twitter" username={partner.user.twitter} />
            ) : null}
          </div>
        ) : null}
        {partner.matches.map((match) => (
          <MatchBlock key={match.listId} match={match} collections={collections} />
        ))}
      </div>
    </details>
  );
}

function MatchBlock({
  match,
  collections,
}: {
  match: PartnerListMatch;
  collections: TradeCollections;
}) {
  const cosmoHandle = match.profileNickname ?? match.profileAddress?.toLowerCase() ?? null;

  return (
    <div className="flex flex-col gap-2">
      <Link
        {...getListLinkOption({
          slug: match.listSlug,
          profileSlug: match.profileSlug,
          profileAddress: match.profileAddress,
          profile: match.profileAddress
            ? { address: match.profileAddress, nickname: match.profileNickname }
            : null,
        })}
        className="w-fit text-sm font-medium underline-offset-2 hover:underline"
      >
        {match.listName}
        <ArrowUpRightIcon aria-hidden className="text-muted-foreground ml-0.5 inline size-3.5" />
      </Link>

      {cosmoHandle === null ? null : (
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span>{m.list_cosmo_id_label()}</span>
          <Link
            to="/@{$nickname}"
            params={{ nickname: cosmoHandle }}
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            {match.profileNickname ?? truncateAddress(cosmoHandle)}
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["iHaveTheyWant", "theyHaveIWant"] as const).map((direction) =>
          match[direction].length > 0 ? (
            <DirectionColumn
              key={direction}
              direction={direction}
              slugs={match[direction]}
              collections={collections}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}

function DirectionColumn({
  direction,
  slugs,
  collections,
}: {
  direction: Direction;
  slugs: string[];
  collections: TradeCollections;
}) {
  const overflow = slugs.length - MAX_THUMBNAILS;

  return (
    <div className={cn("flex flex-col gap-1.5 border-l-2 pl-3", DIRECTION[direction].rule)}>
      <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs font-semibold">
        <span className="tabular-nums">{slugs.length}</span>
        <span className="flex-1 truncate">{DIRECTION[direction].title()}</span>
      </div>
      <div className="flex flex-wrap items-start gap-1.5">
        {slugs.slice(0, MAX_THUMBNAILS).map((slug) => (
          <CollectionThumbnail key={slug} collection={collections[slug]} />
        ))}
        {overflow > 0 ? (
          <span className="bg-muted text-muted-foreground aspect-photocard flex w-14 items-center justify-center rounded-sm font-mono text-xs tabular-nums">
            +{overflow}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CollectionThumbnail({ collection }: { collection: TradeCollections[string] }) {
  if (!collection) {
    return (
      <span className="bg-muted text-muted-foreground aspect-photocard flex w-14 items-center justify-center rounded-sm font-mono text-xs">
        N/A
      </span>
    );
  }

  return (
    <div className="flex w-14 flex-col gap-0.5">
      <div className="bg-muted aspect-photocard relative overflow-hidden rounded-sm border">
        <img
          src={collection.thumbnailImage}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <span className="font-mono text-xs leading-tight font-medium">{collection.collectionId}</span>
    </div>
  );
}
