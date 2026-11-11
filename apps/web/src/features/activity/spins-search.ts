import { useSearch } from "@tanstack/react-router";
import * as z from "zod";

/** `raw` lists spins and their rewards as plain transfers; grouped is the absence of the key. */
export const spinsSearchSchema = z.enum(["raw"]).optional().catch(undefined);

export type SpinsSearch = { spins?: z.infer<typeof spinsSearchSchema> };

export function useSpinsGrouped(): boolean {
  return useSearch({
    strict: false,
    select: (search) => search.spins !== "raw",
  });
}
