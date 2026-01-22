import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { ofetch } from "ofetch";

import type { CollectionMetadata, ValidObjekt } from "@/lib/universal/objekts";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { getBaseURL, getEditionStr } from "@/lib/utils";

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
  const t = useTranslations("objekt");
  const { data, status } = useQuery(fetchMetadata(objekt.slug));

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
        <Pill label={t("created_at")} value={format(data.createdAt, "yyyy/MM/dd hh:mm:ss a")} />
        <Pill
          label={objekt.onOffline === "online" ? t("copies") : t("scanned_copies")}
          value={`${data.total.toLocaleString()}`}
        />
        <Pill label={t("spin")} value={`${data.spin.toLocaleString()}`} />
        <Pill label={t("non_spin")} value={`${(data.total - data.spin).toLocaleString()}`} />
        <Pill
          label={t("tradable")}
          value={`${((data.transferable / data.total) * 100.0).toFixed(
            2,
          )}% (${data.transferable.toLocaleString()})`}
        />
      </>
    );
  }
}

const fetchMetadata = (slug: string) => ({
  queryKey: ["objekts", "metadata", slug],
  queryFn: () => {
    const url = new URL(`/api/objekts/metadata/${slug}`, getBaseURL());
    return ofetch<CollectionMetadata>(url.toString());
  },
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

  return (
    <div className="flex flex-wrap gap-2">
      <Pill label={t("artist")} value={getArtist(objekt.artist)?.title ?? ""} />
      <Pill label={t("member")} value={objekt.member} />
      <Pill label={t("season")} value={objekt.season} />
      <Pill label={t("class")} value={objekt.class} />
      {objekt.edition && <Pill label={t("edition")} value={getEditionStr(objekt.edition)} />}
      <Pill
        label={t("type")}
        value={objekt.onOffline === "online" ? t("digital") : t("physical")}
      />
      <Pill label={t("collection_no")} value={objekt.collectionNo} />
      <Pill
        label={t("accent_color")}
        value={objekt.backgroundColor.toUpperCase()}
        className="bg-(--objekt-bg-color)! text-(--objekt-text-color)!"
      />
      <Pill label={t("text_color")} value={objekt.textColor.toUpperCase()} />
      {unobtainable && (
        <Badge intent="custom" className="font-semibold">
          {t("unobtainable")}
        </Badge>
      )}
      <PillMetadata objekt={objekt} />
    </div>
  );
}
