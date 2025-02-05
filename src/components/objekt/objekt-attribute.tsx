import { ValidObjekt } from "@/lib/universal/objekts";
import { Badge, Skeleton } from "../ui";
import { CSSProperties } from "react";
import { getObjektArtist } from "./objekt-util";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ofetch } from "ofetch";

type PillProps = {
  label: string;
  value: string;
  objekt?: ValidObjekt;
};

function Pill({ label, value }: PillProps) {
  return (
    <Badge intent="secondary" shape="square">
      <span className="font-semibold">{label}</span>
      <span>{value}</span>
    </Badge>
  );
}

function PillColor({ label, value, objekt }: PillProps) {
  return (
    <Badge
      shape="square"
      style={
        {
          "--objekt-accent-color": objekt?.accentColor,
          "--objekt-text-color": objekt?.textColor,
        } as CSSProperties
      }
      className="!bg-[var(--objekt-accent-color)] !text-[var(--objekt-text-color)]"
    >
      <span className="font-semibold">{label}</span>
      <span>{value}</span>
    </Badge>
  );
}

function PillCopies({ objekt }: { objekt: ValidObjekt }) {
  const { data, status } = useQuery(fetchMetadata(objekt.slug));
  return (
    <>
      {status === "pending" && <Skeleton className="w-20 h-6" />}
      {status === "error" && (
        <Badge shape="square" intent="danger">
          Error
        </Badge>
      )}
      {status === "success" && (
        <Pill
          label={objekt.onOffline === "online" ? "Copies" : "Scanned Copies"}
          value={`${data.total}`}
        />
      )}
    </>
  );
}

function PillTradable({ objekt }: { objekt: ValidObjekt }) {
  const { data, status } = useQuery(fetchMetadata(objekt.slug));
  return (
    <>
      {status === "pending" && <Skeleton className="w-20 h-6" />}
      {status === "error" && (
        <Badge shape="square" intent="danger">
          Error
        </Badge>
      )}
      {status === "success" && (
        <Pill
          label={"Tradable"}
          value={`${((data.transferable / data.total) * 100.0).toFixed(2)}% (${data.transferable})`}
        />
      )}
    </>
  );
}

const fetchMetadata = (slug: string) => ({
  queryKey: ["objekts", "metadata", slug],
  queryFn: async ({}) =>
    await ofetch<{ transferable: number; total: number }>(
      `/api/objekts/metadata/${slug}`
    ),
});

export function AttributePanel({ objekt }: { objekt: ValidObjekt }) {
  const artist = getObjektArtist(objekt);
  return (
    <div className="flex flex-wrap gap-2 p-2">
      <Pill label="Artist" value={artist} />
      <Pill label="Member" value={objekt.member} />
      <Pill label="Season" value={objekt.season} />
      <Pill label="Class" value={objekt.class} />
      <Pill
        label="Type"
        value={objekt.onOffline === "online" ? "Digital" : "Physical"}
      />
      <Pill label="Collection No." value={objekt.collectionNo} />
      <PillColor
        label="Accent Color"
        value={objekt.accentColor.toUpperCase()}
        objekt={objekt}
      />
      <Pill label="Text Color" value={objekt.textColor.toUpperCase()} />
      <Pill
        label="Created at"
        value={format(objekt.createdAt, "yyyy/MM/dd hh:mm:ss a")}
      />
      <PillCopies objekt={objekt} />
      <PillTradable objekt={objekt} />
    </div>
  );
}
