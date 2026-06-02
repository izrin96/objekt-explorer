import { useSuspenseQuery } from "@tanstack/react-query";

import { Avatar } from "@/components/intentui/avatar-custom";
import { Badge } from "@/components/intentui/badge";
import {
  Disclosure,
  DisclosureGroup,
  DisclosureIndicator,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/components/intentui/disclosure-group";
import { Link } from "@/components/intentui/link";
import { SocialBadge } from "@/components/shared/social-badge";
import { tradePartnersQuery } from "@/lib/queries/list";
import type { TradePartner } from "@/lib/universal/list";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ObjektCollectionThumbnail } from "./trade-objekt-thumbnail";

export default function TradeMatchesContent({
  slug,
  mode,
}: {
  slug: string;
  mode?: "have-to-want" | "want-to-have" | "both";
}) {
  const { data } = useSuspenseQuery(tradePartnersQuery(slug, mode));

  if (data.partners.length === 0) {
    return <p className="text-muted-fg py-4 text-center text-sm">{m.list_trade_matches_empty()}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-fg text-xs">
        {m.list_trade_matches_count_label({ count: data.partners.length })}
      </p>
      <DisclosureGroup allowsMultipleExpanded>
        {data.partners.map((partner, index) => (
          <PartnerDisclosure
            key={partner.userId}
            partner={partner}
            rank={index + 1}
            collections={data.collections}
          />
        ))}
      </DisclosureGroup>
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
  collections: Record<string, any>;
}) {
  const overlapHave = new Set(partner.matches.flatMap((m) => m.theyHaveIWant)).size;
  const overlapWant = new Set(partner.matches.flatMap((m) => m.iHaveTheyWant)).size;

  return (
    <Disclosure id={partner.userId}>
      <DisclosureTrigger triggerIndicator={false} className="px-3 py-3">
        <div className="flex w-full items-center gap-3">
          <span className="text-muted-fg w-5 shrink-0 self-center text-center font-mono text-xs tabular-nums">
            {String(rank).padStart(2, "0")}
          </span>
          {partner.user?.image && (
            <Avatar
              size="md"
              className="shrink-0"
              src={partner.user.image}
              alt={partner.user.name ?? undefined}
              initials={(partner.user.name ?? "").charAt(0)}
            />
          )}
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{partner.username}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {overlapHave > 0 && (
              <Badge intent="success" isCircle={false} className="font-mono tabular-nums">
                {overlapHave} {m.list_trade_matches_have_label()}
              </Badge>
            )}
            {overlapWant > 0 && (
              <Badge intent="warning" isCircle={false} className="font-mono tabular-nums">
                {overlapWant} {m.list_trade_matches_want_label()}
              </Badge>
            )}
          </div>
          <DisclosureIndicator />
        </div>
      </DisclosureTrigger>
      <DisclosurePanel>
        <div className="flex flex-col gap-4">
          {(partner.profiles.length > 0 || partner.user.discord || partner.user.twitter) && (
            <div className="text-muted-fg border-border flex flex-wrap items-center gap-x-4 gap-y-1 border-b pb-3 text-xs">
              {partner.profiles.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 self-center">{m.list_cosmo_id_label()}</span>
                  <span className="text-fg font-medium">
                    {partner.profiles.map((p) => p.nickname ?? p.address).join(", ")}
                  </span>
                </div>
              )}
              {partner.user.discord && (
                <SocialBadge platform="discord" username={partner.user.discord} />
              )}
              {partner.user.twitter && (
                <SocialBadge platform="twitter" username={partner.user.twitter} />
              )}
            </div>
          )}
          {partner.matches.map((match) => (
            <div key={match.listId} className="flex flex-col gap-2 first:mt-1">
              <div className="flex">
                <Link
                  to="/list/$slug"
                  params={{ slug: match.listSlug }}
                  className="text-xs font-medium underline"
                >
                  {match.listName}
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {match.iHaveTheyWant.length > 0 && (
                  <DirectionColumn
                    title={m.list_trade_matches_you_have_they_want()}
                    slugs={match.iHaveTheyWant}
                    collections={collections}
                    tone="have"
                  />
                )}
                {match.theyHaveIWant.length > 0 && (
                  <DirectionColumn
                    title={m.list_trade_matches_they_have_you_want()}
                    slugs={match.theyHaveIWant}
                    collections={collections}
                    tone="want"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}

function DirectionColumn({
  title,
  slugs,
  collections,
  tone,
}: {
  title: string;
  slugs: string[];
  collections: Record<string, any>;
  tone: "have" | "want";
}) {
  const MAX_VISIBLE = 50;
  const visible = slugs.slice(0, MAX_VISIBLE);
  const overflow = slugs.length - visible.length;

  const borderColor = tone === "have" ? "border-l-lime-500/60" : "border-l-yellow-500/60";

  return (
    <div className={cn("flex flex-col gap-1.5 border-l-2 pl-3", borderColor)}>
      <div className="text-muted-fg flex items-center gap-1.5 font-mono text-xs font-semibold">
        <span className="tabular-nums">{slugs.length}</span>
        <span className="flex-1 truncate">{title}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((slug) => (
          <ObjektCollectionThumbnail key={slug} collection={collections[slug]} />
        ))}
        {overflow > 0 && (
          <span className="bg-muted text-muted-fg aspect-photocard flex w-12 items-center justify-center rounded-sm font-mono text-xs">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}
