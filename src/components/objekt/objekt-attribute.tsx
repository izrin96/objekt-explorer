import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ofetch } from "ofetch";
import type { CSSProperties } from "react";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { getEdition } from "@/lib/utils";
import { Badge, Skeleton } from "../ui";

type PillProps = {
  label: string;
  value: string;
};

function Pill({ label, value }: PillProps) {
  return (
    <Badge intent="secondary" isCircle={false}>
      <span className="font-semibold">{label}</span>
      <span>{value}</span>
    </Badge>
  );
}

function PillColor({ label, value, objekt }: PillProps & { objekt: ValidObjekt }) {
  return (
    <Badge
      isCircle={false}
      style={
        {
          "--objekt-bg-color": objekt.backgroundColor,
          "--objekt-text-color": objekt.textColor,
        } as CSSProperties
      }
      className="!bg-(--objekt-bg-color) !text-(--objekt-text-color)"
    >
      <span className="font-semibold">{label}</span>
      <span>{value}</span>
    </Badge>
  );
}

function PillMetadata({ objekt }: { objekt: ValidObjekt }) {
  const { data, status } = useQuery(fetchMetadata(objekt.slug));
  return (
    <>
      {status === "pending" && (
        <>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-35" />
        </>
      )}
      {status === "error" && (
        <Badge isCircle={false} intent="danger">
          Error fetching metadata
        </Badge>
      )}
      {status === "success" && (
        <>
          <Pill
            label={objekt.onOffline === "online" ? "Copies" : "Scanned Copies"}
            value={`${data.total}`}
          />
          <Pill label="Spin" value={`${data.spin}`} />
          <Pill label="Non-Spin" value={`${data.total - data.spin}`} />
          <Pill
            label={"Tradable"}
            value={`${((data.transferable / data.total) * 100.0).toFixed(
              2,
            )}% (${data.transferable})`}
          />
        </>
      )}
    </>
  );
}

const fetchMetadata = (slug: string) => ({
  queryKey: ["objekts", "metadata", slug],
  queryFn: async () =>
    await ofetch<{ transferable: number; total: number; spin: number }>(
      `/api/objekts/metadata/${slug}`,
    ),
});

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
      {objekt.class === "First" && <Pill label="Edition" value={edition!} />}
      <Pill label="Type" value={objekt.onOffline === "online" ? "Digital" : "Physical"} />
      <Pill label="Collection No." value={objekt.collectionNo} />
      <PillColor
        label="Accent Color"
        value={objekt.backgroundColor.toUpperCase()}
        objekt={objekt}
      />
      <Pill label="Text Color" value={objekt.textColor.toUpperCase()} />
      {objekt.createdAt && (
        <Pill label="Created at" value={format(objekt.createdAt, "yyyy/MM/dd hh:mm:ss a")} />
      )}
      {unobtainable && (
        <Badge intent="custom" isCircle={false} className="font-semibold">
          Unobtainable
        </Badge>
      )}
      <PillMetadata objekt={objekt} />
    </div>
  );
}
