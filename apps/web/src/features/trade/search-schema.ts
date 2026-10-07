import type { TradeFilter } from "@repo/api/schemas/trade";
import * as z from "zod";

/** The same `match` parameter as Browse; `all` is its absence. */
export const forYouSearchSchema = z.object({
  match: z.enum(["mutual", "they_want", "they_have"]).optional().catch(undefined),
  list: z.string().min(1).optional().catch(undefined),
});

export type ForYouSearch = z.infer<typeof forYouSearchSchema>;

/** The API keeps its own name for it, `filter`. */
export const toForYouFilter = (search: ForYouSearch): TradeFilter => search.match ?? "all";
