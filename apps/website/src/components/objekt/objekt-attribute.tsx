import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ofetch } from "ofetch";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import type { CollectionMetadata } from "@/lib/universal/objekt";
import { getEditionStr } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
    return <Badge intent="danger">{m.objekt_error_fetching_metadata()}</Badge>;
  }

  return (
    <>
      <Pill
        label={objekt.onOffline === "online" ? m.objekt_copies() : m.objekt_scanned_copies()}
        value={data.total.toLocaleString()}
      />
      <Pill label={m.objekt_spin()} value={data.spin.toLocaleString()} />
      <Pill label={m.objekt_non_spin()} value={(data.total - data.spin).toLocaleString()} />
      <Pill
        label={m.objekt_tradable()}
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
  const { getArtist } = useCosmoArtist();

  return (
    <div className="flex flex-wrap gap-2">
      <Pill label={m.objekt_artist()} value={getArtist(objekt.artist)?.title ?? ""} />
      <Pill label={m.objekt_member()} value={objekt.member} />
      <Pill label={m.objekt_season()} value={objekt.season} />
      <Pill label={m.objekt_class()} value={objekt.class} />
      {objekt.edition && <Pill label={m.objekt_edition()} value={getEditionStr(objekt.edition)} />}
      <Pill
        label={m.objekt_type()}
        value={objekt.onOffline === "online" ? m.objekt_digital() : m.objekt_physical()}
      />
      <Pill label={m.objekt_collection_no()} value={objekt.collectionNo} />
      <Pill
        label={m.objekt_accent_color()}
        value={objekt.backgroundColor.toUpperCase()}
        className="bg-(--objekt-bg-color)! text-(--objekt-text-color)!"
      />
      <Pill label={m.objekt_text_color()} value={objekt.textColor.toUpperCase()} />
      {unobtainable && (
        <Badge intent="danger" className="font-semibold">
          {m.objekt_unobtainable()}
        </Badge>
      )}
      <Pill
        label={m.objekt_created_at()}
        value={format(objekt.createdAt, "yyyy/MM/dd hh:mm:ss a")}
      />
      <PillMetadata objekt={objekt} />
    </div>
  );
}
