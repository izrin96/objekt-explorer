import type { CollectionMetadata, ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ofetch } from "ofetch";
import { useIntlayer } from "react-intlayer";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { getEditionStr } from "@/lib/utils";

import { Badge } from "../intentui/badge";
import { Skeleton } from "../intentui/skeleton";

type PillProps = {
  label: string;
  value: string;
  className?: string;
};

function Pill({ label, value, className }: PillProps) {
  return (
    <Badge intent="secondary" className={className}>
      <span className="font-semibold">{label}</span>
      <span>{value}</span>
    </Badge>
  );
}

function PillMetadata({ objekt }: { objekt: ValidObjekt }) {
  const content = useIntlayer("objekt");
  const { data, status } = useQuery({
    queryKey: ["objekts", "metadata", objekt.slug],
    queryFn: () => {
      return ofetch<CollectionMetadata>(`/api/objekts/metadata/${objekt.slug}`);
    },
    staleTime: 0,
  });

  if (status === "pending") {
    return (
      <>
        <Skeleton className="h-5 w-20" soft />
        <Skeleton className="h-5 w-16" soft />
        <Skeleton className="h-5 w-20" soft />
        <Skeleton className="h-5 w-40" soft />
      </>
    );
  }

  if (status === "error") {
    return <Badge intent="danger">{content.error_fetching_metadata.value}</Badge>;
  }

  return (
    <>
      <Pill
        label={objekt.onOffline === "online" ? content.copies.value : content.scanned_copies.value}
        value={data.total.toLocaleString()}
      />
      <Pill label={content.spin.value} value={data.spin.toLocaleString()} />
      <Pill label={content.non_spin.value} value={(data.total - data.spin).toLocaleString()} />
      <Pill
        label={content.tradable.value}
        value={`${((data.transferable / data.total) * 100.0).toFixed(
          2,
        )}% (${data.transferable.toLocaleString()})`}
      />
    </>
  );
}

export function AttributePanel({
  objekt,
  unobtainable,
}: {
  objekt: ValidObjekt;
  unobtainable: boolean;
}) {
  const content = useIntlayer("objekt");
  const { getArtist } = useCosmoArtist();

  return (
    <div className="flex flex-wrap gap-2">
      <Pill label={content.artist.value} value={getArtist(objekt.artist)?.title ?? ""} />
      <Pill label={content.member.value} value={objekt.member} />
      <Pill label={content.season.value} value={objekt.season} />
      <Pill label={content.class.value} value={objekt.class} />
      {objekt.edition && (
        <Pill label={content.edition.value} value={getEditionStr(objekt.edition)} />
      )}
      <Pill
        label={content.type.value}
        value={objekt.onOffline === "online" ? content.digital.value : content.physical.value}
      />
      <Pill label={content.collection_no.value} value={objekt.collectionNo} />
      <Pill
        label={content.accent_color.value}
        value={objekt.backgroundColor.toUpperCase()}
        className="bg-(--objekt-bg-color)! text-(--objekt-text-color)!"
      />
      <Pill label={content.text_color.value} value={objekt.textColor.toUpperCase()} />
      {unobtainable && (
        <Badge intent="danger" className="font-semibold">
          {content.unobtainable.value}
        </Badge>
      )}
      <Pill
        label={content.created_at.value}
        value={format(objekt.createdAt, "yyyy/MM/dd hh:mm:ss a")}
      />
      <PillMetadata objekt={objekt} />
    </div>
  );
}
