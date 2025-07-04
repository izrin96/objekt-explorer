import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("objekt");
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
            label={objekt.onOffline === "online" ? t("copies") : t("scanned_copies")}
            value={`${data.total}`}
          />
          <Pill label={t("spin")} value={`${data.spin}`} />
          <Pill label={t("non_spin")} value={`${data.total - data.spin}`} />
          <Pill
            label={t("tradable")}
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
  const t = useTranslations("objekt");
  const { getArtist } = useCosmoArtist();
  const edition = getEdition(objekt.collectionNo);
  return (
    <div className="flex flex-wrap gap-2 p-2">
      <Pill label={t("artist")} value={getArtist(objekt.artist)?.title ?? ""} />
      <Pill label={t("member")} value={objekt.member} />
      <Pill label={t("season")} value={objekt.season} />
      <Pill label={t("class")} value={objekt.class} />
      {objekt.class === "First" && <Pill label={t("edition")} value={edition!} />}
      <Pill
        label={t("type")}
        value={objekt.onOffline === "online" ? t("digital") : t("physical")}
      />
      <Pill label={t("collection_no")} value={objekt.collectionNo} />
      <PillColor
        label={t("accent_color")}
        value={objekt.backgroundColor.toUpperCase()}
        objekt={objekt}
      />
      <Pill label={t("text_color")} value={objekt.textColor.toUpperCase()} />
      {objekt.createdAt && (
        <Pill label={t("created_at")} value={format(objekt.createdAt, "yyyy/MM/dd hh:mm:ss a")} />
      )}
      {unobtainable && (
        <Badge intent="custom" isCircle={false} className="font-semibold">
          {t("unobtainable")}
        </Badge>
      )}
      <PillMetadata objekt={objekt} />
    </div>
  );
}
