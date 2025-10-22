import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { metadataQueryOptions } from "@/lib/query-options";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { getEdition } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

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
  const { data, status } = useQuery(metadataQueryOptions(objekt.slug));

  if (status === "pending") {
    return (
      <>
        <Skeleton className="h-6 w-57" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-33" />
      </>
    );
  }

  if (status === "error") {
    return <Badge intent="danger">Error fetching metadata</Badge>;
  }

  if (status === "success") {
    return (
      <>
        <Pill label="Created at" value={format(data.createdAt, "yyyy/MM/dd hh:mm:ss a")} />
        <Pill
          label={objekt.onOffline === "online" ? "Copies" : "Scanned Copies"}
          value={`${data.total.toLocaleString()}`}
        />
        <Pill label="Spin" value={`${data.spin.toLocaleString()}`} />
        <Pill label="Non-Spin" value={`${(data.total - data.spin).toLocaleString()}`} />
        <Pill
          label="Tradable"
          value={`${((data.transferable / data.total) * 100.0).toFixed(
            2,
          )}% (${data.transferable.toLocaleString()})`}
        />
      </>
    );
  }
}

export function AttributePanel({
  objekt,
  unobtainable,
}: {
  objekt: ValidObjekt;
  unobtainable: boolean;
}) {
  const { getArtist } = useCosmoArtist();
  const edition = getEdition(objekt.collectionNo);
  return (
    <div className="flex flex-wrap gap-2 p-2">
      <Pill label="Artist" value={getArtist(objekt.artist)?.title ?? ""} />
      <Pill label="Member" value={objekt.member} />
      <Pill label="Season" value={objekt.season} />
      <Pill label="Class" value={objekt.class} />
      {objekt.class === "First" && edition && <Pill label="Edition" value={edition} />}
      <Pill label="Type" value={objekt.onOffline === "online" ? "Digital" : "Physical"} />
      <Pill label="Collection No." value={objekt.collectionNo} />
      <Pill
        label="Accent Color"
        value={objekt.backgroundColor.toUpperCase()}
        className="!bg-(--objekt-bg-color) !text-(--objekt-text-color)"
      />
      <Pill label="Text Color" value={objekt.textColor.toUpperCase()} />
      {unobtainable && (
        <Badge intent="custom" className="font-semibold">
          Unobtainable
        </Badge>
      )}
      <PillMetadata objekt={objekt} />
    </div>
  );
}
