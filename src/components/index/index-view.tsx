"use client";

import { IndexedObjekt } from "@/lib/universal/objekts";
import { useEffect, useMemo, useState, useTransition } from "react";
import FilterView from "../filters/filter-render";
import { useFilters } from "@/hooks/use-filters";
import { GRID_COLUMNS, GRID_COLUMNS_MOBILE } from "@/lib/utils";
import ObjektView from "../objekt/objekt-view";
import { filterObjektsIndexed } from "@/lib/filter-utils";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { WindowVirtualizer } from "virtua";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useMediaQuery } from "usehooks-ts";

export default function IndexView({
  objekts,
  artists,
}: {
  artists: CosmoArtistWithMembersBFF[];
  objekts: IndexedObjekt[];
}) {
  const [filters] = useFilters();

  const isDesktop = useMediaQuery("(min-width: 765px)");
  const columns = isDesktop
    ? filters.column ?? GRID_COLUMNS
    : GRID_COLUMNS_MOBILE;

  const [objektsFiltered, setObjektsFiltered] = useState<IndexedObjekt[]>([]);

  const [_, startTransition] = useTransition();

  const virtualList = useMemo(() => {
    var rows = Array.from({
      length: Math.ceil(objektsFiltered.length / columns),
    }).map((_, i) => {
      return (
        <div key={i} className="flex gap-3 md:gap-4 pb-4">
          {Array.from({ length: columns }).map((_, j) => {
            const index = i * columns + j;
            const objekt = objektsFiltered[index];
            return (
              <div className="flex-1" key={j}>
                {objekt && (
                  <ObjektView
                    key={objekt.slug}
                    objekts={[objekt]}
                    priority={j < columns * 3}
                  />
                )}
              </div>
            );
          })}
        </div>
      );
    });
    return rows;
  }, [objektsFiltered, columns]);

  useEffect(() => {
    startTransition(() => {
      setObjektsFiltered(filterObjektsIndexed(filters, objekts));
    });
  }, [filters, objekts]);

  return (
    <div className="flex flex-col gap-2">
      <FilterView artists={artists} />
      <span className="font-semibold">{objektsFiltered.length} total</span>

      <ObjektModalProvider initialTab="trades">
        <WindowVirtualizer>{virtualList}</WindowVirtualizer>
      </ObjektModalProvider>
    </div>
  );
}
