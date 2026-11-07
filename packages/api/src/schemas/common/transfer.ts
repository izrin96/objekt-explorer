import type { SpinOutcome } from "@repo/lib/spin-pairing";
import * as z from "zod";

export const transferRowSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  timestamp: z.string(),
});

export const transferNicknamesSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const spinOutcomeSchema = z.enum(["reward", "broke", "pending"] satisfies SpinOutcome[]);

/**
 * A spin row's outcome and a reward row's link back, over the objekt shape the
 * row itself uses (the live socket leaves objekts unchecked in the browser).
 */
export function spinFields<T extends z.ZodType>(objekt: T) {
  return {
    spin: z
      .object({
        outcome: spinOutcomeSchema,
        reward: z.object({ transfer: transferRowSchema, objekt }).optional(),
      })
      .optional()
      .meta({
        description:
          "On a spin (a transfer to COSMO Spin): reward when a mint to the spinner was paired as its reward, broke when none came within 10 minutes, pending when the spin is younger than that",
      }),
    rewardOf: z
      .string()
      .optional()
      .meta({ description: "On a mint paired as a spin's reward: that spin's transfer id" }),
  };
}
