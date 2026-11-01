import * as z from "zod";

/**
 * A trade ratio: how many the owner asks for one copy of a have entry ("1:N"), or would give for
 * one on a want entry or rule ("N:1"). Null is 1:1. Shown only, never matched.
 */
export const TRADE_RATIOS = [2, 3, 4, 5] as const;

export const tradeRatioSchema = z.int().min(2).max(5);

/** The list types that carry a ratio; the direction comes from the type. */
export const takesRatio = (listType: string) => listType === "have" || listType === "want";
