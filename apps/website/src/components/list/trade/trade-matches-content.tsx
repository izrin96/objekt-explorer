import { DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { useSuspenseQuery } from "@tanstack/react-query";
import { twJoin } from "tailwind-merge";

import { Avatar } from "@/components/intentui/avatar-custom";
import { Badge } from "@/components/intentui/badge";
import {
  Disclosure,
  DisclosureGroup,
  DisclosureIndicator,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/components/intentui/disclosure-group";
import { tradePartnersQuery } from "@/lib/queries/list";
import type { TradePartner } from "@/lib/universal/list";
import { m } from "@/paraglide/messages";

import { ObjektCollectionThumbnail } from "./trade-objekt-thumbnail";

export default function TradeMatchesContent({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(tradePartnersQuery(slug));

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
          <span className="text-muted-fg w-5 shrink-0 text-center font-mono text-xs tabular-nums">
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
            {partner.nicknames.length > 0 && (
              <span className="text-muted-fg block truncate text-xs">
                Cosmo ID: {partner.nicknames.join(", ")}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge intent="success" isCircle={false} className="font-mono tabular-nums">
              {overlapHave} {m.list_trade_matches_have_label()}
            </Badge>
            <Badge intent="warning" isCircle={false} className="font-mono tabular-nums">
              {overlapWant} {m.list_trade_matches_want_label()}
            </Badge>
          </div>
          <DisclosureIndicator />
        </div>
      </DisclosureTrigger>
      <DisclosurePanel>
        <div className="flex flex-col gap-4">
          {(partner.user.discord || partner.user.twitter) && (
            <div className="text-muted-fg border-border flex flex-wrap items-center gap-x-4 gap-y-1 border-b pb-3 text-xs">
              {partner.user.discord && (
                <span className="inline-flex items-center gap-1.5">
                  <DiscordLogoIcon />
                  <span>Discord:</span>
                  <span className="text-fg font-mono font-medium">{partner.user.discord}</span>
                </span>
              )}
              {partner.user.twitter && (
                <span className="inline-flex items-center gap-1.5">
                  <XLogoIcon />
                  <span>Twitter:</span>
                  <span className="text-fg font-mono font-medium">@{partner.user.twitter}</span>
                </span>
              )}
            </div>
          )}
          {partner.matches.map((match) => (
            <div key={match.listId} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-fg">
                  {m.list_trade_matches_you_have_they_want()}: {match.iHaveTheyWant.length}
                </span>
                <span className="text-muted-fg">
                  {m.list_trade_matches_they_have_you_want()}: {match.theyHaveIWant.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DirectionColumn
                  title={m.list_trade_matches_you_have_they_want()}
                  slugs={match.iHaveTheyWant}
                  collections={collections}
                  tone="have"
                />
                <DirectionColumn
                  title={m.list_trade_matches_they_have_you_want()}
                  slugs={match.theyHaveIWant}
                  collections={collections}
                  tone="want"
                />
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
    <div className={twJoin("flex flex-col gap-1.5 border-l-2 pl-3", borderColor)}>
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
