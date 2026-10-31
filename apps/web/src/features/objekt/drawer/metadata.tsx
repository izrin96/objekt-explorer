import { getCollectionEdition } from "@repo/lib/collection-edition";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { EDITION_LABEL } from "@/features/filters/labels";
import { formatTimestamp } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { isObjektOwned, memberNames } from "../objekt-utils";

/** `mono` is for an identifier read character by character; `tabular` for dates and counts */
function MetaRow({
  label,
  mono = false,
  tabular = false,
  children,
}: {
  label: string;
  mono?: boolean;
  tabular?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 break-all", mono && "font-mono", tabular && "tabular-nums")}>
        {children}
      </dd>
    </>
  );
}

function MetaLink({ href }: { href: string | null }) {
  if (!href) return <span className="text-muted-foreground">—</span>;
  // the URL comes from upstream metadata, so only a web link becomes clickable
  if (!/^https?:\/\//i.test(href)) return <span>{href}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-dotted underline-offset-2"
    >
      {href}
    </a>
  );
}

export function MetadataPanel({
  objekt,
  tokenId,
  mintedAt,
}: {
  objekt: ValidObjekt;
  tokenId: string | null;
  mintedAt: Date | null;
}) {
  const owned = isObjektOwned(objekt);
  const { getArtist } = useCosmoArtist();
  // not every surface tags its objekts, so derive it here
  const edition = getCollectionEdition(objekt);

  return (
    /* `minmax(0,1fr)`: a bare `1fr` is floored at the value's min-content, and
       an image URL's min-content is the whole URL */
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
      <MetaRow label={m.objekt_slug()} mono>
        {objekt.slug}
      </MetaRow>
      <MetaRow label={m.objekt_collection_id()} mono>
        {objekt.collectionId}
      </MetaRow>
      <MetaRow label={m.objekt_artist()}>
        {getArtist(objekt.artist)?.title ?? objekt.artist}
      </MetaRow>
      <MetaRow label={m.objekt_member()}>{memberNames(objekt)}</MetaRow>
      <MetaRow label={m.objekt_season()}>{objekt.season}</MetaRow>
      <MetaRow label={m.objekt_class()}>{objekt.class}</MetaRow>
      <MetaRow label={m.objekt_collection_no()} mono>
        {objekt.collectionNo}
      </MetaRow>
      <MetaRow label={m.objekt_type()}>
        {objekt.onOffline === "offline" ? m.objekt_physical() : m.objekt_digital()}
      </MetaRow>
      <MetaRow label={m.objekt_edition()}>{edition ? EDITION_LABEL[edition] : "—"}</MetaRow>
      <MetaRow label={m.objekt_created_at()} tabular>
        {formatTimestamp(new Date(objekt.createdAt))}
      </MetaRow>

      <MetaRow label={m.objekt_background_color()} mono>
        <span className="flex items-center gap-1.5">
          <span
            className="size-4 rounded-sm border border-black/10"
            style={{ background: objekt.backgroundColor }}
          />
          {objekt.backgroundColor.toUpperCase()}
        </span>
      </MetaRow>
      <MetaRow label={m.objekt_text_color()} mono>
        <span className="flex items-center gap-1.5">
          {/* the text swatch sits on the background swatch, so the pairing reads */}
          <span
            className="grid size-4 place-items-center rounded-sm border border-black/10"
            style={{ background: objekt.backgroundColor }}
          >
            <span className="size-2 rounded-[2px]" style={{ background: objekt.textColor }} />
          </span>
          {objekt.textColor.toUpperCase()}
        </span>
      </MetaRow>

      <MetaRow label={m.objekt_front_image()} mono>
        <MetaLink href={objekt.originalFrontImage ?? objekt.frontImage} />
      </MetaRow>
      <MetaRow label={m.objekt_back_image()} mono>
        <MetaLink href={objekt.originalBackImage ?? objekt.backImage} />
      </MetaRow>
      <MetaRow label={m.objekt_band_image_alt()} mono>
        <MetaLink href={objekt.bandImageUrl} />
      </MetaRow>

      {owned && (
        <>
          <MetaRow label={m.objekt_serial()} mono>
            #{objekt.serial}
          </MetaRow>
          <MetaRow label={m.objekt_token_id()} mono>
            {tokenId ?? objekt.tokenId}
          </MetaRow>
          <dt className="text-muted-foreground">{m.objekt_transferable()}</dt>
          <dd>
            <Badge variant={objekt.transferable ? "success" : "error"} size="sm">
              {objekt.transferable ? m.objekt_yes() : m.objekt_no()}
            </Badge>
          </dd>
          <MetaRow label={m.objekt_received()} tabular>
            {formatTimestamp(new Date(objekt.receivedAt))}
          </MetaRow>
          <MetaRow label={m.objekt_minted_at()} tabular>
            {mintedAt === null ? "—" : formatTimestamp(mintedAt)}
          </MetaRow>
        </>
      )}
    </dl>
  );
}
