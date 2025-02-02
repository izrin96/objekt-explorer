"use client";

import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import FilterView from "../filters/filter-render";
import { useFilters } from "@/hooks/use-filters";
import { GRID_COLUMNS, GRID_COLUMNS_MOBILE } from "@/lib/utils";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import ObjektView from "../objekt/objekt-view";
import { shapeProfileObjekts } from "@/lib/filter-utils";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { Loader } from "../ui";
import { WindowVirtualizer } from "virtua";
import { fetchOwnedObjekts } from "./fetching-util";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-fallback";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useMediaQuery } from "usehooks-ts";
import { OwnedObjekt } from "@/lib/universal/objekts";
import { cn } from "@/utils/classes";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  profile: CosmoPublicUser;
};

export default function ProfileObjektRender({ ...props }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <Suspense
            fallback={
              <div className="flex justify-center">
                <Loader variant="ring" />
              </div>
            }
          >
            <ProfileObjekt {...props} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function ProfileObjekt({ profile, artists }: Props) {
  const [filters] = useFilters();

  const isDesktop = useMediaQuery("(min-width: 640px)");
  const columns = isDesktop
    ? filters.column ?? GRID_COLUMNS
    : GRID_COLUMNS_MOBILE;

  const [objektsFiltered, setObjektsFiltered] = useState<
    [string, OwnedObjekt[][]][]
  >([]);
  const deferredObjektsFiltered = useDeferredValue(objektsFiltered);

  const queryFunction = useCallback(() => {
    return fetchOwnedObjekts({
      address: profile.address,
    });
  }, [profile.address]);

  const { data } = useSuspenseQuery({
    queryKey: ["owned-collections", profile.address],
    queryFn: queryFunction,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const objektsOwned = data.objekts;

  const virtualList = useMemo(() => {
    return deferredObjektsFiltered.flatMap(([key, groupedObjekts]) => {
      return [
        GroupLabelRender({ key }),
        ...ObjektsRender({ groupedObjekts, columns, key }),
      ];
    });
  }, [deferredObjektsFiltered, columns]);

  const count = useMemo(
    () =>
      deferredObjektsFiltered
        .flatMap(([, objekts]) => objekts)
        .flatMap((item) => item).length,
    [deferredObjektsFiltered]
  );

  const groupedCount = useMemo(
    () => deferredObjektsFiltered.flatMap(([, objekts]) => objekts).length,
    [deferredObjektsFiltered]
  );

  useEffect(() => {
    setObjektsFiltered(shapeProfileObjekts(filters, objektsOwned, artists));
  }, [filters, objektsOwned, artists]);

  return (
    <div className="flex flex-col gap-2">
      <FilterView isOwned artists={artists} />
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {count} total
          {filters.grouped ? ` (${groupedCount} grouped)` : undefined}
        </span>
      </div>

      <ObjektModalProvider initialTab="owned" isOwned>
        <WindowVirtualizer>{virtualList}</WindowVirtualizer>
      </ObjektModalProvider>
    </div>
  );
}

function GroupLabelRender({ key }: { key: string }) {
  return (
    <div
      key={key}
      className={cn("font-semibold text-base pb-3 pt-3", !key && "hidden")}
    >
      {key}
    </div>
  );
}

function ObjektsRender({
  key,
  groupedObjekts,
  columns,
}: {
  key: string;
  groupedObjekts: OwnedObjekt[][];
  columns: number;
}) {
  return Array.from({
    length: Math.ceil(groupedObjekts.length / columns),
  }).map((_, i) => {
    return (
      <ObjektsRowRender
        key={`${key}_${i}`}
        rowIndex={i}
        columns={columns}
        groupedObjekts={groupedObjekts}
      />
    );
  });
}

function ObjektsRowRender({
  rowIndex,
  groupedObjekts,
  columns,
}: {
  rowIndex: number;
  groupedObjekts: OwnedObjekt[][];
  columns: number;
}) {
  return (
    <div className="flex gap-3 md:gap-4 pb-4">
      {Array.from({ length: columns }).map((_, j) => {
        const index = rowIndex * columns + j;
        const objekts = groupedObjekts[index];
        return (
          <div className="flex-1" key={j}>
            {objekts && (
              <ObjektView
                key={objekts[0].id}
                objekts={objekts}
                priority={index < columns * 3}
                isOwned
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
