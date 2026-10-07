import type { CardView } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";

import { getListLinkOption } from "@/features/list/list-link";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { CollectionLabel } from "@/features/objekt/objekt-label";
import { formatCurrency } from "@/features/settings/use-currency";
import { ListRoleBadge } from "@/features/trade/list-role-badge";
import { m } from "@/paraglide/messages";

/** Read live: a list or entry deleted since the card was sent drops out, the card stays. */
export function ObjektCardMessage({
  card,
  collection,
  onOpen,
}: {
  card: CardView;
  collection: ValidObjekt | undefined;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const { list } = card;
  const price = card.isQyop
    ? m.objekt_qyop()
    : card.price !== null && list?.currency
      ? formatCurrency(card.price, list.currency)
      : null;

  return (
    <div className="bg-background flex w-72 max-w-full gap-3 rounded-lg border p-2">
      <div className="@container w-20 shrink-0">
        {collection ? (
          <ObjektCard objekt={collection} image="thumbnail" hideSerial hideLabel onOpen={onOpen} />
        ) : (
          <div className="bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center p-1 text-center font-mono text-xs leading-snug break-all">
            {card.collectionSlug}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5 text-sm">
        <p className="font-medium break-words">
          <CollectionLabel slug={card.collectionSlug} collection={collection} />
        </p>
        {card.serial !== null ? (
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            {m.chat_card_serial({ serial: card.serial })}
          </p>
        ) : null}
        {list ? (
          <p className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Link
              {...getListLinkOption(list)}
              className="min-w-0 font-medium break-words underline-offset-2 hover:underline"
            >
              {list.name}
            </Link>
            <ListRoleBadge type={list.listTypeNew} />
          </p>
        ) : null}
        {price ? <p className="mt-auto font-mono font-semibold tabular-nums">{price}</p> : null}
      </div>
    </div>
  );
}
