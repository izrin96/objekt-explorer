import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { formatTimestamp } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { isObjektOwned, memberNames } from "../objekt-utils";

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-mono break-all">{children}</dd>
    </>
  );
}

function MetaLink({ href }: { href: string | null }) {
  if (!href) return <span className="text-muted-foreground">—</span>;
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

  return (
    /* `minmax(0,1fr)`: a bare `1fr` is floored at the value's min-content, and
       an image URL's min-content is the whole URL */
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
      <MetaRow label={m.objekt_slug()}>{objekt.slug}</MetaRow>
      <MetaRow label={m.objekt_collection_id()}>{objekt.collectionId}</MetaRow>
      <MetaRow label={m.objekt_artist()}>
        {getArtist(objekt.artist)?.title ?? objekt.artist}
      </MetaRow>
      <MetaRow label={m.objekt_member()}>{memberNames(objekt)}</MetaRow>
      <MetaRow label={m.objekt_season()}>{objekt.season}</MetaRow>
      <MetaRow label={m.objekt_class()}>{objekt.class}</MetaRow>
      <MetaRow label={m.objekt_collection_no()}>{objekt.collectionNo}</MetaRow>
      <MetaRow label={m.objekt_type()}>
        {objekt.onOffline === "offline" ? m.objekt_physical() : m.objekt_digital()}
      </MetaRow>
      <MetaRow label={m.objekt_edition()}>{objekt.edition ?? "—"}</MetaRow>
      <MetaRow label={m.objekt_created_at()}>{formatTimestamp(new Date(objekt.createdAt))}</MetaRow>

      <MetaRow label={m.objekt_background_color()}>
        <span className="flex items-center gap-1.5">
          <span
            className="size-4 rounded-sm border border-black/10"
            style={{ background: objekt.backgroundColor }}
          />
          {objekt.backgroundColor.toUpperCase()}
        </span>
      </MetaRow>
      <MetaRow label={m.objekt_text_color()}>
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

      <MetaRow label={m.objekt_front_image()}>
        <MetaLink href={objekt.originalFrontImage ?? objekt.frontImage} />
      </MetaRow>
      <MetaRow label={m.objekt_back_image()}>
        <MetaLink href={objekt.originalBackImage ?? objekt.backImage} />
      </MetaRow>
      <MetaRow label={m.objekt_band_image_alt()}>
        <MetaLink href={objekt.bandImageUrl} />
      </MetaRow>

      {owned && (
        <>
          <MetaRow label={m.objekt_serial()}>#{objekt.serial}</MetaRow>
          <MetaRow label={m.objekt_token_id()}>{tokenId ?? objekt.tokenId}</MetaRow>
          <dt className="text-muted-foreground">{m.objekt_transferable()}</dt>
          <dd>
            <Badge variant={objekt.transferable ? "success" : "warning"} size="sm">
              {objekt.transferable ? m.objekt_yes() : m.objekt_no()}
            </Badge>
          </dd>
          <MetaRow label={m.objekt_received()}>
            {formatTimestamp(new Date(objekt.receivedAt))}
          </MetaRow>
          <MetaRow label={m.objekt_minted_at()}>
            {mintedAt === null ? "—" : formatTimestamp(mintedAt)}
          </MetaRow>
        </>
      )}
    </dl>
  );
}
