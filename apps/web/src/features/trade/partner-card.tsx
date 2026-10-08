import { CaretRightIcon, EyeSlashIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import type { Dropped } from "@repo/api/lib/trade-rank";
import { PREVIEW_LIMIT } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MenuItem } from "@/components/ui/menu";
import { getListLinkOption } from "@/features/list/list-link";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { displayNickname } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ListRoleBadge } from "./list-role-badge";
import { MATCH_TONE, MatchLine } from "./match-line";
import { THUMB_GRID } from "./thumb-grid";
import { TradeCard } from "./trade-card";

export type TradePartner = Outputs["trade"]["forYou"]["partners"][number];
export type TradeCollections = Record<string, ValidObjekt | undefined>;

/** theirs first, as the match line reads */
const DIRECTIONS = [
  { key: "theyHaveIWant", section: m.trade_section_they_have, tone: MATCH_TONE.theyHave },
  { key: "iHaveTheyWant", section: m.trade_section_you_have, tone: MATCH_TONE.youHave },
] as const;

const REASON: Record<Dropped["reason"], () => string> = {
  not_owned: m.trade_reason_not_owned,
  not_transferable: m.trade_reason_not_transferable,
};

const SECTION_TITLE = "text-sm font-medium tabular-nums";
const TILE =
  "bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center font-mono";

export function PartnerCard({
  id,
  partner,
  collections,
  onOpen,
  onHide,
}: {
  id: string;
  partner: TradePartner;
  collections: TradeCollections;
  onOpen: (objekt: ValidObjekt) => void;
  onHide: (partner: TradePartner) => void;
}) {
  const { identity } = partner;
  const also = identity.also.map((ref) => displayNickname(ref.address, ref.nickname));

  return (
    <TradeCard
      id={id}
      // `data-highlight` is set for a moment when a Browse link lands here
      className="data-highlight:ring-ring scroll-mt-20 transition-shadow duration-700 data-highlight:ring-2 motion-reduce:transition-none"
      person={partner}
      contact={
        partner.messageable
          ? {
              kind: "open",
              target: { kind: "user", userId: partner.userId },
              card: bestCard(partner),
              offer: { suggestFor: partner.userId },
            }
          : { kind: "closed" }
      }
      meta={
        <>
          {partner.lists.map((list) => (
            <span key={list.id} className="flex min-w-0 items-center gap-1.5">
              <ListRoleBadge type={list.listTypeNew} />
              <Link
                {...getListLinkOption({
                  slug: list.slug,
                  profileSlug: list.profileSlug,
                  profileAddress: list.profileAddress,
                  profile: list.profileAddress
                    ? { address: list.profileAddress, nickname: list.profileNickname }
                    : null,
                })}
                className="text-foreground min-w-0 break-words underline-offset-2 hover:underline"
              >
                {list.name}
              </Link>
            </span>
          ))}
          {partner.idle ? (
            <Badge variant="outline" size="sm">
              {m.trade_idle()}
            </Badge>
          ) : null}
          {also.length > 0 ? (
            <span className="break-words">{m.trade_also({ names: also.join(", ") })}</span>
          ) : null}
        </>
      }
      menuItems={
        <MenuItem onClick={() => onHide(partner)}>
          <EyeSlashIcon />
          {m.trade_hide()}
        </MenuItem>
      }
      match={
        <MatchLine theyHave={partner.theyHaveIWant.length} youHave={partner.iHaveTheyWant.length} />
      }
    >
      {partner.idle ? (
        <p className="text-muted-foreground -mt-2 text-xs text-pretty">{m.trade_idle_hint()}</p>
      ) : null}

      {DIRECTIONS.map((direction) =>
        partner[direction.key].length > 0 ? (
          <section key={direction.key} className="flex flex-col gap-2">
            <h3 className={cn(SECTION_TITLE, direction.tone)}>
              {direction.section({ count: partner[direction.key].length })}
            </h3>
            <MatchGrid count={partner[direction.key].length}>
              {partner[direction.key].slice(0, PREVIEW_LIMIT).map((match) => (
                <MatchObjekt
                  key={match.slug}
                  slug={match.slug}
                  collection={collections[match.slug]}
                  onOpen={onOpen}
                />
              ))}
            </MatchGrid>
          </section>
        ) : null,
      )}

      {/* diagnostic, so it stays shut until asked for */}
      {partner.dropped.length > 0 ? (
        <Collapsible className="flex flex-col gap-2">
          <CollapsibleTrigger
            className={cn(
              SECTION_TITLE,
              "group text-muted-foreground hover:text-foreground focus-visible:ring-ring flex items-center gap-1 self-start rounded-sm outline-none focus-visible:ring-2",
            )}
          >
            <CaretRightIcon
              aria-hidden
              className="size-3.5 transition-transform group-data-panel-open:rotate-90"
            />
            {m.trade_not_counted({ count: partner.dropped.length })}
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <MatchGrid count={partner.dropped.length}>
              {partner.dropped.slice(0, PREVIEW_LIMIT).map((dropped) => (
                <MatchObjekt
                  key={`${dropped.direction}:${dropped.slug}`}
                  slug={dropped.slug}
                  collection={collections[dropped.slug]}
                  caption={REASON[dropped.reason]()}
                  muted
                  onOpen={onOpen}
                />
              ))}
            </MatchGrid>
          </CollapsiblePanel>
        </Collapsible>
      ) : null}
    </TradeCard>
  );
}

/**
 * The first collection their best-matching list matched on. The list itself stays off the
 * card: the server takes only a list that shows its owner, which a For you list may not.
 */
function bestCard(partner: TradePartner) {
  const list = partner.lists[0];
  if (!list) return undefined;
  const match = [...partner.theyHaveIWant, ...partner.iHaveTheyWant].find((item) =>
    item.partnerListIds.includes(list.id),
  );
  return match ? { collectionSlug: match.slug } : undefined;
}

function MatchGrid({ count, children }: { count: number; children: ReactNode }) {
  const more = count - PREVIEW_LIMIT;
  return (
    <div className={THUMB_GRID}>
      {children}
      {more > 0 ? (
        <div className="@container self-start">
          <div className={cn(TILE, "text-sm tabular-nums")}>
            <span aria-hidden>+{more}</span>
            <span className="sr-only">{m.trade_more_count({ count: more })}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MatchObjekt({
  slug,
  collection,
  caption,
  muted = false,
  onOpen,
}: {
  slug: string;
  collection: ValidObjekt | undefined;
  caption?: string;
  muted?: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    // a container, so the slug tile's radius matches the cards'
    <figure className="@container flex min-w-0 flex-col gap-1 self-start">
      <div className={cn(muted && "opacity-50 grayscale")}>
        {collection ? (
          <ObjektCard
            objekt={collection}
            image="thumbnail"
            captionClassName="text-xs"
            onOpen={() => onOpen(collection)}
          />
        ) : (
          <div className={cn(TILE, "p-2 text-center text-xs leading-snug break-all")}>{slug}</div>
        )}
      </div>
      {caption ? (
        <figcaption className="text-muted-foreground text-xs break-words">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
