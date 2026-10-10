import type { GridObjekt } from "@repo/lib/types/objekt";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

import { type ObjektSearch, tokenIdOf } from "./search-schema";

/** A token the profile no longer holds opens nothing, even beside a slug. */
function resolveLink<T extends GridObjekt>(
  sources: readonly (readonly T[])[],
  { slug, id }: ObjektSearch,
): T | null {
  for (const source of sources) {
    for (const objekt of source) {
      if (id !== undefined ? tokenIdOf(objekt) === id : objekt.slug === slug) return objekt;
    }
  }
  return null;
}

/**
 * The open objekt lives in the URL: `?id=` for a copy, `?slug=` for a row with
 * no token. Nothing resolves until `ready`, or a link would settle on partial data.
 */
export function useObjektLink<T extends GridObjekt>(
  sources: readonly (readonly T[])[],
  ready: boolean,
) {
  const navigate = useNavigate();
  const { slug, id, serial } = useSearch({
    strict: false,
    structuralSharing: true,
    select: (search) => {
      const link = search as ObjektSearch;
      return { slug: link.slug, id: link.id, serial: link.serial };
    },
  });
  const linked = slug !== undefined || id !== undefined;
  const active = linked && ready ? resolveLink(sources, { slug, id }) : null;

  const open = useCallback(
    (objekt: T) => {
      const token = tokenIdOf(objekt);
      void navigate({
        replace: true,
        search: ((prev: ObjektSearch) => ({
          ...prev,
          slug: token === undefined ? objekt.slug : undefined,
          id: token,
          serial: undefined,
        })) as never,
        resetScroll: false,
      });
    },
    [navigate],
  );

  const close = useCallback(() => {
    void navigate({
      replace: true,
      resetScroll: false,
      search: (({ slug: _slug, id: _id, serial: _serial, ...rest }: ObjektSearch) => rest) as never,
    });
  }, [navigate]);

  // replace: a serial is a view of the drawer, not a place to go back to;
  // `undefined` drops it when the serials tab is left
  const changeSerial = useCallback(
    (value: number | undefined) => {
      // an emptied serial field reports 0
      if (value !== undefined && value < 1) return;
      void navigate({
        replace: true,
        resetScroll: false,
        search: ((prev: ObjektSearch) => ({ ...prev, serial: value })) as never,
      });
    },
    [navigate],
  );

  return { active, serial: active === null ? undefined : serial, open, close, changeSerial };
}
