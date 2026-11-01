import type { RatioSide } from "@/features/list/ratio-text";

import type { PostInput } from "../composer-choice";

export type PreviewSide = {
  role: "have" | "want" | "sale";
  slug: string | null;
  /** the side's ratio, or null where it takes none: a sale list, or a Buy post's want list */
  ratio: RatioSide | null;
};

/** The sides the preview draws for what posting would send, offering side first. */
export function previewSides(request: PostInput): PreviewSide[] {
  switch (request.kind) {
    case "swap":
      return [
        { role: "have", slug: request.have, ratio: "have" },
        { role: "want", slug: request.want, ratio: "want" },
      ];
    case "sell":
      return [
        { role: "sale", slug: request.sale, ratio: null },
        ...(request.alsoSwap
          ? [{ role: "want" as const, slug: request.want, ratio: "want" as const }]
          : []),
      ];
    case "buy":
      return [{ role: "want", slug: request.want, ratio: null }];
  }
}
