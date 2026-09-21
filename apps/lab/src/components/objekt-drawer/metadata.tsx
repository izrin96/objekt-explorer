import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import type { LabObjekt } from "@/fixtures/objekts";
import { collectionShortNo } from "@/lib/objekt";

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-mono break-all">{children}</dd>
    </>
  );
}

function MetaLink({ href }: { href: string }) {
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

/** Everything the fixture row carries, plus what the transfers call added. */
export function MetadataPanel({
  objekt,
  tokenId,
  mintedAt,
}: {
  objekt: LabObjekt;
  tokenId: string | null;
  mintedAt: Date | null;
}) {
  const owned = objekt.serial !== undefined;

  return (
    /* `minmax(0,1fr)`: a bare `1fr` is floored at the value's min-content, and
       an image URL's min-content is the whole URL */
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
      <MetaRow label="Slug">{objekt.slug}</MetaRow>
      <MetaRow label="Collection ID">{objekt.collectionId}</MetaRow>
      <MetaRow label="Artist">{objekt.artist}</MetaRow>
      <MetaRow label="Member">{objekt.member}</MetaRow>
      <MetaRow label="Season">{objekt.season}</MetaRow>
      <MetaRow label="Class">{objekt.class}</MetaRow>
      <MetaRow label="Collection no">{collectionShortNo(objekt)}</MetaRow>
      <MetaRow label="Type">{objekt.onOffline === "offline" ? "offline" : "online"}</MetaRow>
      <MetaRow label="Created">{format(new Date(objekt.createdAt), "yyyy/MM/dd")}</MetaRow>

      <MetaRow label="Background">
        <span className="flex items-center gap-1.5">
          <span
            className="size-4 rounded-sm border border-black/10"
            style={{ background: objekt.backgroundColor }}
          />
          {objekt.backgroundColor.toUpperCase()}
        </span>
      </MetaRow>
      <MetaRow label="Text">
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

      <MetaRow label="Front image">
        <MetaLink href={objekt.frontImage} />
      </MetaRow>
      <MetaRow label="Back image">
        <MetaLink href={objekt.backImage} />
      </MetaRow>
      <MetaRow label="Thumbnail">
        <MetaLink href={objekt.thumbnailImage} />
      </MetaRow>

      {owned && (
        <>
          <MetaRow label="Serial">#{objekt.serial}</MetaRow>
          <MetaRow label="Token ID">{tokenId ?? "—"}</MetaRow>
          <dt className="text-muted-foreground">Transferable</dt>
          <dd>
            <Badge variant={objekt.transferable ? "success" : "warning"} size="sm">
              {objekt.transferable ? "Yes" : "No"}
            </Badge>
          </dd>
          <MetaRow label="Received">
            {objekt.receivedAt ? format(objekt.receivedAt, "yyyy/MM/dd") : "—"}
          </MetaRow>
          <MetaRow label="Minted">{mintedAt ? format(mintedAt, "yyyy/MM/dd") : "—"}</MetaRow>
        </>
      )}
    </dl>
  );
}
