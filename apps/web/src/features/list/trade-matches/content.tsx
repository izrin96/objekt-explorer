import {
  ArrowClockwiseIcon,
  ArrowUpRightIcon,
  CaretRightIcon,
  UsersIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { PartnerListMatch, TradePartner } from "@repo/api/schemas/list";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { truncateAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { getListLinkOption } from "../list-link";
import { type TradeMode, tradePartnersOptions } from "./queries";

/** the response carries the indexer's full collection rows, keyed by slug */
type TradeCollections = Record<string, ValidObjekt | undefined>;

/** a partner can match on hundreds of collections; the rest are counted, not drawn */
const MAX_CARDS = 50;

/** theirs first in both places, so the row's summary and the panel read in one order */
const DIRECTIONS = ["theyHaveIWant", "iHaveTheyWant"] as const;

type Direction = (typeof DIRECTIONS)[number];

type CountMessage = (inputs: { count: number }) => string;

const DIRECTION: Record<Direction, { summary: CountMessage; section: CountMessage }> = {
  theyHaveIWant: {
    summary: m.list_trade_partner_they_have,
    section: m.list_trade_section_they_have,
  },
  iHaveTheyWant: {
    summary: m.list_trade_partner_you_have,
    section: m.list_trade_section_you_have,
  },
};

export function TradeMatchesContent({ slug, mode }: { slug: string; mode: TradeMode }) {
  const query = useQuery(tradePartnersOptions(slug, mode));
  const [active, setActive] = useState<ValidObjekt | null>(null);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1.5">
        <Shimmer className="h-17 rounded-lg" />
        <Shimmer className="h-17 rounded-lg" />
        <Shimmer className="h-17 rounded-lg" />
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
      <p className="text-muted-foreground text-sm tabular-nums">
        {m.list_trade_matches_count_label({ count: partners.length })}
      </p>
      <div className="flex flex-col divide-y rounded-lg border">
        {partners.map((partner) => (
          <PartnerDisclosure
            key={partner.userId}
            partner={partner}
            collections={collections}
            onOpen={setActive}
          />
        ))}
      </div>

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </div>
  );
}

function PartnerDisclosure({
  partner,
  collections,
  onOpen,
}: {
  partner: TradePartner;
  collections: TradeCollections;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    /* `<details>` rather than a rebuilt disclosure: it already toggles on Enter
       and Space and announces its expanded state */
    <details className="group">
      {/* the padding rides on the summary so the whole row is one touch target */}
      <summary className="focus-visible:ring-ring flex cursor-pointer touch-manipulation items-center gap-3 rounded-sm px-4 py-3 outline-none focus-visible:ring-2">
        <Avatar className="size-9 shrink-0">
          {partner.user.image ? <AvatarImage src={partner.user.image} alt="" /> : null}
          <AvatarFallback>{(partner.user.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-base leading-snug font-semibold">
              {partner.username}
            </span>
            {partner.user.discord ? (
              <SocialBadge platform="discord" username={partner.user.discord} />
            ) : null}
            {partner.user.twitter ? (
              <SocialBadge platform="twitter" username={partner.user.twitter} />
            ) : null}
          </div>

          {/* each count is a whole sentence, so its accessible name needs no `title` */}
          <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-sm tabular-nums sm:shrink-0 sm:justify-end">
            {DIRECTIONS.map((direction) => {
              const count = new Set(partner.matches.flatMap((match) => match[direction])).size;
              if (count === 0) return null;
              return <span key={direction}>{DIRECTION[direction].summary({ count })}</span>;
            })}
          </div>
        </div>

        <CaretRightIcon
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-90"
        />
      </summary>

      <div className="flex flex-col gap-6 px-4 pt-1 pb-4">
        {partner.matches.map((match) => (
          <MatchBlock key={match.listId} match={match} collections={collections} onOpen={onOpen} />
        ))}
      </div>
    </details>
  );
}

function MatchBlock({
  match,
  collections,
  onOpen,
}: {
  match: PartnerListMatch;
  collections: TradeCollections;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const cosmoHandle = match.profileNickname ?? match.profileAddress?.toLowerCase() ?? null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <Link
          {...getListLinkOption({
            slug: match.listSlug,
            profileSlug: match.profileSlug,
            profileAddress: match.profileAddress,
            profile: match.profileAddress
              ? { address: match.profileAddress, nickname: match.profileNickname }
              : null,
          })}
          className="min-w-0 text-base leading-snug font-medium break-words underline-offset-2 hover:underline"
        >
          {match.listName}
          <ArrowUpRightIcon aria-hidden className="text-muted-foreground ml-0.5 inline size-3.5" />
        </Link>

        {cosmoHandle === null ? null : (
          <span className="text-muted-foreground min-w-0 text-sm font-normal">
            {"· "}
            {m.list_trade_cosmo_id()}{" "}
            <Link
              to="/@{$nickname}"
              params={{ nickname: cosmoHandle }}
              className="text-foreground font-medium underline-offset-2 hover:underline"
            >
              {match.profileNickname ?? truncateAddress(cosmoHandle)}
            </Link>
          </span>
        )}
      </h3>

      {DIRECTIONS.map((direction) =>
        match[direction].length > 0 ? (
          <DirectionSection
            key={direction}
            direction={direction}
            slugs={match[direction]}
            collections={collections}
            onOpen={onOpen}
          />
        ) : null,
      )}
    </div>
  );
}

function DirectionSection({
  direction,
  slugs,
  collections,
  onOpen,
}: {
  direction: Direction;
  slugs: string[];
  collections: TradeCollections;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const overflow = slugs.length - MAX_CARDS;

  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-muted-foreground text-sm font-medium tabular-nums">
        {DIRECTION[direction].section({ count: slugs.length })}
      </h4>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {slugs.slice(0, MAX_CARDS).map((slug) => (
          <MatchObjekt key={slug} slug={slug} collection={collections[slug]} onOpen={onOpen} />
        ))}
        {overflow > 0 ? (
          <div className="bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center self-start font-mono text-sm tabular-nums">
            +{overflow}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MatchObjekt({
  slug,
  collection,
  onOpen,
}: {
  slug: string;
  collection: ValidObjekt | undefined;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  if (!collection) {
    return (
      <div className="bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center self-start p-2 text-center font-mono text-xs leading-snug break-all">
        {slug}
      </div>
    );
  }

  return <ObjektCard objekt={collection} image="thumbnail" onOpen={() => onOpen(collection)} />;
}
